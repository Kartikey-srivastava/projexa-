from datetime import datetime, timezone
from typing import Dict, Any, List
from app.models.schemas import AssistantChatRequest, AssistantChatResponse
from app.services.sensor_simulator import iot_simulator, ZONE_DEFINITIONS
from app.services.ml_engine import ml_engine, CROP_IDEALS
from app.services.alert_service import alert_service


class FarmAIAssistant:
    def __init__(self):
        pass

    def answer_query(self, req: AssistantChatRequest) -> AssistantChatResponse:
        zone_id = req.zone_id
        summary = iot_simulator.get_summary(zone_id)
        zone = next((z for z in ZONE_DEFINITIONS if z.id == zone_id), ZONE_DEFINITIONS[0])
        q_lower = req.message.lower()

        reading = summary.latest_reading if summary else None
        alerts = alert_service.get_alerts(zone_id=zone_id, resolved=False)

        # Predict current status to get SHAP context
        feature_dict = {}
        if reading:
            feature_dict = {
                "soil_moisture": reading.soil_moisture,
                "soil_temperature": reading.soil_temperature,
                "air_temperature": reading.air_temperature,
                "relative_humidity": reading.relative_humidity,
                "soil_ph": reading.soil_ph,
                "nitrogen": reading.nitrogen,
                "phosphorus": reading.phosphorus,
                "potassium": reading.potassium,
                "rainfall": reading.rainfall,
                "solar_radiation": reading.solar_radiation,
            }

        pred_yield, conf, contribs, shap_summary, key_rec = ml_engine.predict(zone.crop, feature_dict)
        ideals = CROP_IDEALS.get(zone.crop, CROP_IDEALS["Wheat"])

        factors: List[str] = []
        actions: List[str] = []
        relevant_metrics: Dict[str, Any] = {
            "crop": zone.crop,
            "predicted_yield_t_ha": round(pred_yield, 2),
            "confidence": f"{conf}%",
            "active_alerts_count": len(alerts),
        }

        if reading:
            relevant_metrics.update({
                "soil_moisture": f"{reading.soil_moisture}%",
                "air_temperature": f"{reading.air_temperature}°C",
                "soil_ph": reading.soil_ph,
                "nitrogen": f"{reading.nitrogen} mg/kg",
            })

        # Top SHAP drivers
        top_pos = [c for c in contribs if c.direction == "positive"]
        top_neg = [c for c in contribs if c.direction == "negative"]

        # Intelligent Agronomic Response Routing
        if "why" in q_lower and ("yield" in q_lower or "drop" in q_lower or "predicted" in q_lower):
            if top_neg:
                answer = (
                    f"In **{zone.name}** ({zone.crop}), our explainable AI model calculates a predicted yield of **{pred_yield:.2f} t/ha** ({conf}% confidence).\n\n"
                    f"The primary negative factor suppressing potential is **{top_neg[0].display_name}** at {top_neg[0].value} {top_neg[0].unit}, reducing yield by **{top_neg[0].impact_pct}%**.\n"
                    f"Optimal range for {zone.crop} is {ideals.get(top_neg[0].feature.replace('soil_', '').replace('air_', ''), (45, 65))[0]}-"
                    f"{ideals.get(top_neg[0].feature.replace('soil_', '').replace('air_', ''), (45, 65))[1]} {top_neg[0].unit}."
                )
                factors.append(f"{top_neg[0].display_name}: {top_neg[0].impact_pct}% impact")
                actions.append(f"Adjust {top_neg[0].display_name} toward target window.")
            else:
                answer = (
                    f"Good news! Predicted yield for **{zone.name}** is robust at **{pred_yield:.2f} t/ha**, "
                    f"boosted primarily by optimal {top_pos[0].display_name if top_pos else 'soil condition'}."
                )
            if top_pos:
                factors.append(f"{top_pos[0].display_name}: +{top_pos[0].impact_pct}% boost")

        elif "irrigate" in q_lower or "water" in q_lower or "moisture" in q_lower:
            cur_moist = reading.soil_moisture if reading else 50.0
            opt_min, opt_max = ideals["moisture"]
            if cur_moist < opt_min:
                deficit = opt_min - cur_moist
                liters = int(deficit * 280 * zone.area_hectares)
                answer = (
                    f"**Irrigation is strongly recommended for {zone.name}.**\n\n"
                    f"Current soil moisture is **{cur_moist:.1f}%**, which is **{deficit:.1f}% below** the minimum threshold ({opt_min}%) for {zone.crop}.\n"
                    f"Recommended application: **{liters:,} Liters** (~{deficit * 2.8:.1f} mm equivalent depth) delivered via drip or center pivot over the next 3 hours."
                )
                factors.append(f"Current Moisture: {cur_moist:.1f}% (Deficit: {deficit:.1f}%)")
                actions.append(f"Execute irrigation cycle to reach {int((opt_min + opt_max) / 2)}% target.")
            elif cur_moist > opt_max:
                answer = (
                    f"**No irrigation needed.** Soil moisture is elevated at **{cur_moist:.1f}%** (ideal ceiling is {opt_max}%).\n"
                    f"Hold watering to prevent saturation, nutrient leaching, and root hypoxia."
                )
                factors.append(f"Moisture: {cur_moist:.1f}% (Above optimal)")
                actions.append("Keep irrigation valves closed for 24 hours.")
            else:
                answer = (
                    f"Soil moisture for **{zone.name}** is in the optimal band at **{cur_moist:.1f}%** "
                    f"(Target: {opt_min}% - {opt_max}%). Normal maintenance scheduling is adequate."
                )
                factors.append(f"Moisture in sweet spot: {cur_moist:.1f}%")
                actions.append("Continue current scheduling.")

        elif "fertilizer" in q_lower or "npk" in q_lower or "nitrogen" in q_lower:
            n_val = reading.nitrogen if reading else 120.0
            p_val = reading.phosphorus if reading else 40.0
            k_val = reading.potassium if reading else 140.0
            answer = (
                f"**Nutrient Diagnostic for {zone.name} ({zone.crop}):**\n\n"
                f"- **Nitrogen (N):** {n_val:.1f} mg/kg (Ideal: {ideals['nitrogen'][0]}-{ideals['nitrogen'][1]})\n"
                f"- **Phosphorus (P):** {p_val:.1f} mg/kg (Ideal: {ideals['phosphorus'][0]}-{ideals['phosphorus'][1]})\n"
                f"- **Potassium (K):** {k_val:.1f} mg/kg (Ideal: {ideals['potassium'][0]}-{ideals['potassium'][1]})\n\n"
            )
            if n_val < ideals["nitrogen"][0]:
                answer += f"Nitrogen is deficient. Recommend side-dressing with urea or ammonium nitrate (30-40 kg N/ha).\n"
                actions.append("Top-dress with nitrogenous fertilizer.")
            elif n_val > ideals["nitrogen"][1]:
                answer += f"Nitrogen is elevated. Cease N fertilization to avoid vegetative overgrowth and lodging.\n"
                actions.append("Suspend nitrogen fertigation.")
            else:
                answer += f"NPK ratio is harmonized for the current developmental stage.\n"
                actions.append("Maintain baseline organic matter maintenance.")

        elif "shap" in q_lower or "explain" in q_lower or "model" in q_lower:
            answer = (
                f"**SHAP (SHapley Additive exPlanations) Diagnostic for {zone.name}:**\n\n"
                f"The Random Forest model decomposes how each sensor attribute shifts the yield from the regional baseline ({CROP_BENCHMARKS.get(zone.crop, {}).get('base', 5.0):.1f} t/ha):\n\n"
            )
            for c in contribs[:4]:
                sign = "+" if c.direction == "positive" else ""
                answer += f"- **{c.display_name}**: `{sign}{c.impact_pct}%` ({c.value} {c.unit})\n"
            factors = [f"{c.display_name}: {c.impact_pct}%" for c in contribs[:3]]
            actions.append("Review SHAP diverging chart for full attribution.")

        elif "alert" in q_lower or "warning" in q_lower or "anomaly" in q_lower:
            if alerts:
                answer = f"There are currently **{len(alerts)} active alerts** for {zone.name}:\n\n"
                for a in alerts:
                    answer += f"- **[{a.severity.upper()}] {a.title}**: {a.message}\n  *Action:* {a.suggested_action}\n"
                factors = [a.title for a in alerts]
                actions.extend([a.suggested_action for a in alerts[:2]])
            else:
                answer = f"No critical anomalies detected for **{zone.name}**. All sensor streams are operating within configured safe thresholds."
                actions.append("Telemetry normal; no corrective actions needed.")

        else:
            answer = (
                f"**AI Agronomist Overview for {zone.name} ({zone.crop}):**\n\n"
                f"Predicted Yield is currently **{pred_yield:.2f} t/ha** (Regional Base: {CROP_BENCHMARKS.get(zone.crop, {}).get('base', 5.0):.1f} t/ha). "
                f"{shap_summary}\n\n"
                f"Key Action: {key_rec}"
            )
            if top_pos:
                factors.append(f"Positive: {top_pos[0].display_name}")
            if top_neg:
                factors.append(f"Limiting: {top_neg[0].display_name}")
            actions.append(key_rec)

        return AssistantChatResponse(
            answer=answer,
            zone_id=zone_id,
            key_factors=factors,
            suggested_actions=actions,
            relevant_metrics=relevant_metrics,
            timestamp=datetime.now(timezone.utc),
        )


# Global assistant instance
farm_assistant = FarmAIAssistant()
