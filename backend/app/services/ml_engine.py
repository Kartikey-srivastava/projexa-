import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List, Tuple
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

from app.models.schemas import (
    YieldPredictionRequest,
    YieldPredictionResponse,
    ShapFeatureContribution,
    WhatIfSimulationRequest,
    WhatIfSimulationResponse,
)

# Reference historical benchmarks (t/ha) by crop
CROP_BENCHMARKS = {
    "Wheat": {"base": 4.8, "optimal_max": 6.8, "min": 1.2},
    "Rice": {"base": 5.4, "optimal_max": 7.9, "min": 1.5},
    "Maize": {"base": 7.5, "optimal_max": 11.2, "min": 2.0},
    "Tomato": {"base": 65.0, "optimal_max": 95.0, "min": 20.0},
    "Soybean": {"base": 3.2, "optimal_max": 4.6, "min": 0.8},
}

# Crop ideal agronomic parameters
CROP_IDEALS = {
    "Wheat": {
        "moisture": (45.0, 65.0),
        "temp": (18.0, 24.0),
        "humidity": (50.0, 70.0),
        "ph": (6.0, 7.0),
        "nitrogen": (110.0, 150.0),
        "phosphorus": (30.0, 50.0),
        "potassium": (100.0, 160.0),
        "rainfall": (60.0, 110.0),
        "solar": (16.0, 22.0),
    },
    "Rice": {
        "moisture": (65.0, 85.0),
        "temp": (24.0, 32.0),
        "humidity": (70.0, 90.0),
        "ph": (5.5, 6.8),
        "nitrogen": (130.0, 190.0),
        "phosphorus": (35.0, 60.0),
        "potassium": (90.0, 150.0),
        "rainfall": (120.0, 240.0),
        "solar": (18.0, 24.0),
    },
    "Maize": {
        "moisture": (50.0, 70.0),
        "temp": (22.0, 29.0),
        "humidity": (55.0, 75.0),
        "ph": (5.8, 7.0),
        "nitrogen": (140.0, 210.0),
        "phosphorus": (40.0, 70.0),
        "potassium": (120.0, 190.0),
        "rainfall": (80.0, 150.0),
        "solar": (18.0, 25.0),
    },
    "Tomato": {
        "moisture": (60.0, 75.0),
        "temp": (20.0, 26.0),
        "humidity": (60.0, 80.0),
        "ph": (6.0, 6.8),
        "nitrogen": (120.0, 170.0),
        "phosphorus": (45.0, 75.0),
        "potassium": (160.0, 240.0),
        "rainfall": (50.0, 90.0),
        "solar": (15.0, 22.0),
    },
    "Soybean": {
        "moisture": (45.0, 65.0),
        "temp": (21.0, 28.0),
        "humidity": (50.0, 70.0),
        "ph": (6.0, 6.8),
        "nitrogen": (50.0, 90.0),
        "phosphorus": (30.0, 55.0),
        "potassium": (90.0, 140.0),
        "rainfall": (70.0, 130.0),
        "solar": (16.0, 23.0),
    },
}

FEATURE_NAMES = [
    "soil_moisture",
    "soil_temperature",
    "air_temperature",
    "relative_humidity",
    "soil_ph",
    "nitrogen",
    "phosphorus",
    "potassium",
    "rainfall",
    "solar_radiation",
]

FEATURE_LABELS = {
    "soil_moisture": ("Soil Moisture", "%"),
    "soil_temperature": ("Soil Temperature", "°C"),
    "air_temperature": ("Air Temperature", "°C"),
    "relative_humidity": ("Relative Humidity", "%"),
    "soil_ph": ("Soil pH", "pH"),
    "nitrogen": ("Nitrogen (N)", "mg/kg"),
    "phosphorus": ("Phosphorus (P)", "mg/kg"),
    "potassium": ("Potassium (K)", "mg/kg"),
    "rainfall": ("Precipitation", "mm"),
    "solar_radiation": ("Solar Radiation", "MJ/m²"),
}


class CropYieldMLEngine:
    def __init__(self):
        self.models: Dict[str, RandomForestRegressor] = {}
        self.baseline_feature_means: Dict[str, Dict[str, float]] = {}
        self._train_all_crop_models()

    def _generate_synthetic_crop_data(self, crop: str, n_samples: int = 1200) -> Tuple[np.ndarray, np.ndarray]:
        np.random.seed(42)
        ideals = CROP_IDEALS.get(crop, CROP_IDEALS["Wheat"])
        bench = CROP_BENCHMARKS.get(crop, CROP_BENCHMARKS["Wheat"])

        # Sample ranges around ideals with realistic deviations and agricultural extremes
        moisture = np.clip(np.random.normal(loc=np.mean(ideals["moisture"]), scale=15.0, size=n_samples), 10.0, 95.0)
        air_temp = np.clip(np.random.normal(loc=np.mean(ideals["temp"]), scale=6.0, size=n_samples), 5.0, 42.0)
        soil_temp = np.clip(air_temp - np.random.uniform(1.0, 3.5, size=n_samples), 4.0, 39.0)
        humidity = np.clip(np.random.normal(loc=np.mean(ideals["humidity"]), scale=12.0, size=n_samples), 20.0, 98.0)
        ph = np.clip(np.random.normal(loc=np.mean(ideals["ph"]), scale=0.6, size=n_samples), 4.5, 8.8)
        nitrogen = np.clip(np.random.normal(loc=np.mean(ideals["nitrogen"]), scale=35.0, size=n_samples), 20.0, 260.0)
        phosphorus = np.clip(np.random.normal(loc=np.mean(ideals["phosphorus"]), scale=15.0, size=n_samples), 10.0, 110.0)
        potassium = np.clip(np.random.normal(loc=np.mean(ideals["potassium"]), scale=30.0, size=n_samples), 30.0, 280.0)
        rainfall = np.clip(np.random.normal(loc=np.mean(ideals["rainfall"]), scale=35.0, size=n_samples), 5.0, 320.0)
        solar = np.clip(np.random.normal(loc=np.mean(ideals["solar"]), scale=3.5, size=n_samples), 8.0, 30.0)

        # Agronomic yield function combining Liebig's law of minimum and quadratic response curves
        def compute_subscore(val, opt_range, severe_low, severe_high):
            opt_low, opt_high = opt_range
            score = np.ones_like(val)
            # below optimal
            low_mask = val < opt_low
            score[low_mask] = np.maximum(0.15, 1.0 - ((opt_low - val[low_mask]) / (opt_low - severe_low + 1e-5)) ** 1.6)
            # above optimal
            high_mask = val > opt_high
            score[high_mask] = np.maximum(0.20, 1.0 - ((val[high_mask] - opt_high) / (severe_high - opt_high + 1e-5)) ** 1.6)
            return np.clip(score, 0.1, 1.05)

        s_moist = compute_subscore(moisture, ideals["moisture"], 12.0, 92.0)
        s_temp = compute_subscore(air_temp, ideals["temp"], 8.0, 40.0)
        s_ph = compute_subscore(ph, ideals["ph"], 4.8, 8.5)
        s_n = compute_subscore(nitrogen, ideals["nitrogen"], 25.0, 250.0)
        s_p = compute_subscore(phosphorus, ideals["phosphorus"], 12.0, 100.0)
        s_k = compute_subscore(potassium, ideals["potassium"], 35.0, 260.0)
        s_solar = compute_subscore(solar, ideals["solar"], 9.0, 28.0)

        # Multiplicative yield potential with stochastic field variance
        combined_index = (
            (s_moist ** 0.30)
            * (s_temp ** 0.20)
            * (s_n ** 0.20)
            * (s_p ** 0.10)
            * (s_k ** 0.10)
            * (s_ph ** 0.05)
            * (s_solar ** 0.05)
        )

        noise = np.random.normal(0, 0.03, size=n_samples)
        yields = np.clip(
            bench["min"] + (bench["optimal_max"] - bench["min"]) * combined_index + noise,
            bench["min"] * 0.8,
            bench["optimal_max"] * 1.08,
        )

        X = np.column_stack([
            moisture,
            soil_temp,
            air_temp,
            humidity,
            ph,
            nitrogen,
            phosphorus,
            potassium,
            rainfall,
            solar,
        ])
        return X, yields

    def _train_all_crop_models(self):
        for crop in CROP_BENCHMARKS.keys():
            X, y = self._generate_synthetic_crop_data(crop)
            rf = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42, n_jobs=1)
            rf.fit(X, y)
            self.models[crop] = rf
            self.baseline_feature_means[crop] = {
                name: float(np.mean(X[:, idx])) for idx, name in enumerate(FEATURE_NAMES)
            }

    def predict(
        self,
        crop: str,
        feature_dict: Dict[str, float],
    ) -> Tuple[float, float, List[ShapFeatureContribution], str, str]:
        crop = crop if crop in self.models else "Wheat"
        model = self.models[crop]
        bench = CROP_BENCHMARKS[crop]
        means = self.baseline_feature_means[crop]

        # Construct vector
        features = [
            feature_dict.get("soil_moisture", means["soil_moisture"]),
            feature_dict.get("soil_temperature", means["soil_temperature"]),
            feature_dict.get("air_temperature", means["air_temperature"]),
            feature_dict.get("relative_humidity", means["relative_humidity"]),
            feature_dict.get("soil_ph", means["soil_ph"]),
            feature_dict.get("nitrogen", means["nitrogen"]),
            feature_dict.get("phosphorus", means["phosphorus"]),
            feature_dict.get("potassium", means["potassium"]),
            feature_dict.get("rainfall", means["rainfall"]),
            feature_dict.get("solar_radiation", means["solar_radiation"]),
        ]

        x_arr = np.array([features])
        predicted_yield = float(model.predict(x_arr)[0])
        base_yield = bench["base"]

        # Tree confidence derived from leaf variance across trees
        leaf_preds = [tree.predict(x_arr)[0] for tree in model.estimators_]
        variance = float(np.std(leaf_preds))
        # Confidence between 85% and 98%
        confidence_score = round(max(85.0, min(98.5, 96.0 - (variance / (predicted_yield + 1e-4)) * 30.0)), 1)

        # Compute SHAP-style marginal feature attributions:
        # We compute f(x) - f(x with feature i replaced by baseline mean)
        raw_attributions = {}
        for idx, fname in enumerate(FEATURE_NAMES):
            perturbed = list(features)
            perturbed[idx] = means[fname]
            perturbed_pred = float(model.predict(np.array([perturbed]))[0])
            raw_attributions[fname] = predicted_yield - perturbed_pred

        total_attribution = sum(abs(v) for v in raw_attributions.values()) + 1e-6
        net_delta = predicted_yield - base_yield

        contributions: List[ShapFeatureContribution] = []
        for fname, raw_val in raw_attributions.items():
            disp_name, unit = FEATURE_LABELS[fname]
            actual_val = features[FEATURE_NAMES.index(fname)]
            
            # Impact percentage relative to baseline yield
            impact_pct = round((raw_val / base_yield) * 100.0, 1)
            
            if impact_pct > 0.5:
                direction = "positive"
            elif impact_pct < -0.5:
                direction = "negative"
            else:
                direction = "neutral"

            # Plain language explanation of the impact
            ideals = CROP_IDEALS.get(crop, CROP_IDEALS["Wheat"])
            opt = ideals.get(fname.replace("air_", "").replace("soil_", ""), (40, 70))
            if direction == "positive":
                desc = f"{disp_name} at {actual_val:.1f} {unit} is in the prime agronomic zone, adding +{impact_pct}% to overall yield."
            elif direction == "negative":
                desc = f"{disp_name} at {actual_val:.1f} {unit} departs from the optimal range ({opt[0]}-{opt[1]} {unit}), shaving {impact_pct}% off potential."
            else:
                desc = f"{disp_name} is operating near baseline neutrality."

            contributions.append(
                ShapFeatureContribution(
                    feature=fname,
                    display_name=disp_name,
                    value=round(actual_val, 1),
                    unit=unit,
                    impact_pct=impact_pct,
                    direction=direction,
                    description=desc,
                )
            )

        # Sort contributions by absolute magnitude
        contributions.sort(key=lambda c: abs(c.impact_pct), reverse=True)

        # Top drivers for plain-English synthesis
        top_pos = [c for c in contributions if c.direction == "positive"]
        top_neg = [c for c in contributions if c.direction == "negative"]

        pos_str = f"{top_pos[0].display_name} (+{top_pos[0].impact_pct}%)" if top_pos else "balanced soil conditions"
        neg_str = f"{top_neg[0].display_name} ({top_neg[0].impact_pct}%)" if top_neg else "minimal environmental drag"

        if predicted_yield >= base_yield * 1.05:
            summary = (
                f"Yield is tracking {round(((predicted_yield - base_yield)/base_yield)*100, 1)}% above historical averages, driven heavily by favorable {pos_str}. "
                f"Maintain current irrigation while monitoring {neg_str} to sustain this trajectory."
            )
            key_rec = f"Keep moisture in the optimal window and maintain N-P-K balances for {crop} grain-filling."
        elif predicted_yield >= base_yield * 0.95:
            summary = (
                f"Crop performance is steady around the benchmark ({predicted_yield:.2f} t/ha). "
                f"A slight suppression from {neg_str} is offset by healthy {pos_str}."
            )
            key_rec = f"Address {top_neg[0].display_name if top_neg else 'minor imbalances'} with targeted interventions to unlock up to +12% potential yield."
        else:
            summary = (
                f"Yield forecast indicates a deficit ({predicted_yield:.2f} t/ha vs {base_yield:.2f} t/ha benchmark), predominantly caused by stress in {neg_str}. "
                f"Immediate remediation is advised to avoid irreversible physiological loss."
            )
            key_rec = f"Prioritize soil remediation: inspect irrigation and adjust nutrient input targeting {top_neg[0].display_name if top_neg else 'soil parameters'}."

        return predicted_yield, confidence_score, contributions, summary, key_rec

    def simulate_what_if(self, req: WhatIfSimulationRequest) -> WhatIfSimulationResponse:
        crop = req.crop_type if req.crop_type in self.models else "Wheat"
        bench = CROP_BENCHMARKS[crop]
        ideals = CROP_IDEALS.get(crop, CROP_IDEALS["Wheat"])

        feature_dict = {
            "soil_moisture": req.soil_moisture,
            "soil_temperature": req.temperature - 2.0,
            "air_temperature": req.temperature,
            "relative_humidity": 65.0,
            "soil_ph": req.soil_ph,
            "nitrogen": req.nitrogen,
            "phosphorus": req.phosphorus,
            "potassium": req.potassium,
            "rainfall": req.rainfall,
            "solar_radiation": req.solar_radiation or 18.5,
        }

        sim_yield, conf, contribs, summary, rec = self.predict(crop, feature_dict)
        baseline = req.baseline_yield_t_ha if req.baseline_yield_t_ha else bench["base"]
        delta_yield = sim_yield - baseline
        delta_pct = (delta_yield / baseline) * 100.0

        # Resource efficiency score based on nutrient waste or water excess
        n_waste = max(0.0, req.nitrogen - ideals["nitrogen"][1]) / ideals["nitrogen"][1]
        water_stress = abs(req.soil_moisture - np.mean(ideals["moisture"])) / np.mean(ideals["moisture"])
        efficiency_score = round(max(30.0, min(99.0, 100.0 - (n_waste * 35.0 + water_stress * 25.0))), 1)

        # Risk level assessment
        if delta_pct < -15.0 or req.soil_moisture < 20.0 or req.temperature > 37.0:
            risk = "Critical"
        elif delta_pct < -5.0 or req.soil_moisture < 30.0:
            risk = "High"
        elif delta_pct < 5.0:
            risk = "Moderate"
        else:
            risk = "Low"

        # Actionable tips
        tips = []
        if req.soil_moisture < ideals["moisture"][0]:
            tips.append(f"Increase irrigation: Moisture is {req.soil_moisture:.1f}% (Ideal: {ideals['moisture'][0]}-{ideals['moisture'][1]}%).")
        elif req.soil_moisture > ideals["moisture"][1]:
            tips.append(f"Reduce water delivery to prevent root asphyxiation and fungal vulnerability.")

        if req.nitrogen < ideals["nitrogen"][0]:
            tips.append(f"Top-dress with {int(ideals['nitrogen'][0] - req.nitrogen)} mg/kg Nitrogen to elevate vegetative biomass.")
        elif req.nitrogen > ideals["nitrogen"][1]:
            tips.append(f"Nitrogen excess detected ({req.nitrogen:.1f} mg/kg); stop nitrogenous fertigation to avoid lodging.")

        if req.soil_ph < ideals["ph"][0]:
            tips.append(f"Soil acidity alert (pH {req.soil_ph:.1f}): Apply agricultural lime (CaCO3) to unlock phosphorus availability.")
        elif req.soil_ph > ideals["ph"][1]:
            tips.append(f"Alkaline soil condition: Apply sulfur or gypsum to reduce pH toward {ideals['ph'][1]}.")

        if not tips:
            tips.append(f"Balanced recipe! This simulated condition maximizes nutrient assimilation and photosynthesis.")

        target_comparison = {
            "soil_moisture": {"simulated": req.soil_moisture, "optimal_min": ideals["moisture"][0], "optimal_max": ideals["moisture"][1]},
            "nitrogen": {"simulated": req.nitrogen, "optimal_min": ideals["nitrogen"][0], "optimal_max": ideals["nitrogen"][1]},
            "phosphorus": {"simulated": req.phosphorus, "optimal_min": ideals["phosphorus"][0], "optimal_max": ideals["phosphorus"][1]},
            "potassium": {"simulated": req.potassium, "optimal_min": ideals["potassium"][0], "optimal_max": ideals["potassium"][1]},
            "soil_ph": {"simulated": req.soil_ph, "optimal_min": ideals["ph"][0], "optimal_max": ideals["ph"][1]},
            "temperature": {"simulated": req.temperature, "optimal_min": ideals["temp"][0], "optimal_max": ideals["temp"][1]},
        }

        return WhatIfSimulationResponse(
            zone_id=req.zone_id,
            crop_type=crop,
            baseline_yield_t_ha=round(baseline, 2),
            simulated_yield_t_ha=round(sim_yield, 2),
            delta_yield_t_ha=round(delta_yield, 2),
            delta_pct=round(delta_pct, 1),
            resource_efficiency_score=efficiency_score,
            agronomic_advisory=f"Simulated yield shifts by {delta_pct:+.1f}% compared to baseline. {rec}",
            risk_level=risk,
            optimal_target_comparison=target_comparison,
            actionable_tips=tips,
        )


# Singleton ML Engine instance
ml_engine = CropYieldMLEngine()
