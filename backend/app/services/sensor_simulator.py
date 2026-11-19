import math
import time
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from app.models.schemas import (
    ZoneInfo,
    SensorReading,
    SensorMetric,
    SafeRange,
    ZoneTelemetrySummary,
    SensorActionRequest,
)

ZONE_DEFINITIONS: List[ZoneInfo] = [
    ZoneInfo(
        id="zone-a",
        name="Zone A - North Wheat Field",
        crop="Wheat",
        area_hectares=14.5,
        soil_type="Clay-Loam",
        status="Optimal",
        color="#15803D",
        description="Well-drained loam soil planted with durum wheat in early heading stage.",
    ),
    ZoneInfo(
        id="zone-b",
        name="Zone B - East Rice Paddy",
        crop="Rice",
        area_hectares=10.2,
        soil_type="Alluvial Clay",
        status="Needs Attention",
        color="#D97706",
        description="Lowland clay basin with high water retention demand; moisture borderline low.",
    ),
    ZoneInfo(
        id="zone-c",
        name="Zone C - South Greenhouse",
        crop="Tomato",
        area_hectares=4.8,
        soil_type="Controlled Peat-Perlite",
        status="Optimal",
        color="#15803D",
        description="Climate-monitored greenhouse with automated fertigation and high-intensity lighting.",
    ),
    ZoneInfo(
        id="zone-d",
        name="Zone D - West Corn Orchard",
        crop="Maize",
        area_hectares=18.0,
        soil_type="Silt-Loam",
        status="Optimal",
        color="#15803D",
        description="Expansive maize plot under pivot sprinkler coverage; vegetative growth phase.",
    ),
]

SAFE_RANGES: Dict[str, SafeRange] = {
    "soil_moisture": SafeRange(min=10.0, max=95.0, optimal_min=45.0, optimal_max=70.0, unit="%"),
    "soil_temperature": SafeRange(min=5.0, max=38.0, optimal_min=16.0, optimal_max=25.0, unit="°C"),
    "air_temperature": SafeRange(min=8.0, max=42.0, optimal_min=18.0, optimal_max=28.0, unit="°C"),
    "relative_humidity": SafeRange(min=20.0, max=98.0, optimal_min=50.0, optimal_max=75.0, unit="%"),
    "soil_ph": SafeRange(min=4.5, max=8.5, optimal_min=6.0, optimal_max=7.2, unit="pH"),
    "nitrogen": SafeRange(min=20.0, max=250.0, optimal_min=100.0, optimal_max=160.0, unit="mg/kg"),
    "phosphorus": SafeRange(min=10.0, max=100.0, optimal_min=30.0, optimal_max=60.0, unit="mg/kg"),
    "potassium": SafeRange(min=30.0, max=280.0, optimal_min=110.0, optimal_max=180.0, unit="mg/kg"),
    "light_intensity": SafeRange(min=0.0, max=120000.0, optimal_min=35000.0, optimal_max=75000.0, unit="Lux"),
    "solar_radiation": SafeRange(min=4.0, max=32.0, optimal_min=15.0, optimal_max=24.0, unit="MJ/m²"),
    "wind_speed": SafeRange(min=0.0, max=50.0, optimal_min=4.0, optimal_max=18.0, unit="km/h"),
    "rainfall": SafeRange(min=0.0, max=150.0, optimal_min=20.0, optimal_max=80.0, unit="mm"),
}

METRIC_TOOLTIPS = {
    "soil_moisture": "Volumetric water content in the root zone. Crucial for transpiration and nutrient transport.",
    "soil_temperature": "Subsurface thermal energy. Regulates microbial nitrification and root respiration.",
    "air_temperature": "Ambient temperature. Governs photosynthetic enzymatic rates and thermal stress.",
    "relative_humidity": "Vapor saturation in canopy air. High humidity increases fungus risk; low accelerates evapotranspiration.",
    "soil_ph": "Acidity/alkalinity scale. Dictates chemical availability of phosphorus, iron, and micro-nutrients.",
    "nitrogen": "Primary macronutrient for leafy canopy, chlorophyll synthesis, and vegetative vigor.",
    "phosphorus": "Essential for early root establishment, ATP energy transfer, and floral initiation.",
    "potassium": "Regulates stomatal opening, drought resilience, enzyme activation, and fruit firmness.",
    "light_intensity": "Active light exposure in Lux, driving solar photon flux for photosynthesis.",
    "solar_radiation": "NASA POWER satellite daily accumulated solar irradiance impacting yield potential.",
    "wind_speed": "Canopy boundary layer wind speed; modulates transpiration and mechanical stability.",
    "rainfall": "Cumulative precipitative intake over current tracking window.",
}


class IoTSensorSimulator:
    def __init__(self):
        self.step_counter = 0
        self.history_buffer: Dict[str, List[SensorReading]] = {z.id: [] for z in ZONE_DEFINITIONS}
        self.current_state: Dict[str, Dict[str, float]] = {}
        self._init_zone_states()
        self._seed_history(num_points=35)

    def _init_zone_states(self):
        # Base initial conditions tuned per zone
        self.current_state = {
            "zone-a": {
                "soil_moisture": 54.2,
                "soil_temperature": 21.4,
                "air_temperature": 23.8,
                "relative_humidity": 62.0,
                "soil_ph": 6.55,
                "nitrogen": 132.0,
                "phosphorus": 44.0,
                "potassium": 148.0,
                "light_intensity": 58000.0,
                "rainfall": 12.0,
                "solar_radiation": 19.4,
                "wind_speed": 11.2,
            },
            "zone-b": {
                "soil_moisture": 36.8,  # Deliberately lower for Rice (triggers warning)
                "soil_temperature": 24.1,
                "air_temperature": 27.5,
                "relative_humidity": 68.0,
                "soil_ph": 5.92,
                "nitrogen": 115.0,
                "phosphorus": 36.0,
                "potassium": 122.0,
                "light_intensity": 62000.0,
                "rainfall": 5.0,
                "solar_radiation": 21.0,
                "wind_speed": 9.5,
            },
            "zone-c": {
                "soil_moisture": 66.5,
                "soil_temperature": 20.8,
                "air_temperature": 22.5,
                "relative_humidity": 70.5,
                "soil_ph": 6.30,
                "nitrogen": 145.0,
                "phosphorus": 58.0,
                "potassium": 195.0,
                "light_intensity": 49000.0,
                "rainfall": 0.0,  # Greenhouse
                "solar_radiation": 17.8,
                "wind_speed": 3.2,
            },
            "zone-d": {
                "soil_moisture": 58.0,
                "soil_temperature": 22.8,
                "air_temperature": 25.2,
                "relative_humidity": 58.0,
                "soil_ph": 6.70,
                "nitrogen": 165.0,
                "phosphorus": 50.0,
                "potassium": 155.0,
                "light_intensity": 64000.0,
                "rainfall": 8.5,
                "solar_radiation": 20.2,
                "wind_speed": 13.8,
            },
        }

    def _seed_history(self, num_points: int = 35):
        now = datetime.now(timezone.utc)
        for i in range(num_points, 0, -1):
            past_time = now - timedelta(seconds=i * 3)
            # Add synthetic historical points with minor variance
            for z in ZONE_DEFINITIONS:
                base = self.current_state[z.id]
                drift = math.sin(i * 0.3) * 1.5
                reading = SensorReading(
                    zone_id=z.id,
                    zone_name=z.name,
                    timestamp=past_time,
                    soil_moisture=round(max(15.0, base["soil_moisture"] + drift + random.uniform(-0.5, 0.5)), 1),
                    soil_temperature=round(base["soil_temperature"] + drift * 0.4 + random.uniform(-0.2, 0.2), 1),
                    air_temperature=round(base["air_temperature"] + drift * 0.6 + random.uniform(-0.3, 0.3), 1),
                    relative_humidity=round(base["relative_humidity"] - drift * 0.8 + random.uniform(-0.8, 0.8), 1),
                    soil_ph=round(base["soil_ph"] + random.uniform(-0.02, 0.02), 2),
                    nitrogen=round(base["nitrogen"] + random.uniform(-1.0, 1.0), 1),
                    phosphorus=round(base["phosphorus"] + random.uniform(-0.4, 0.4), 1),
                    potassium=round(base["potassium"] + random.uniform(-0.8, 0.8), 1),
                    light_intensity=round(max(1000.0, base["light_intensity"] + random.uniform(-800, 800)), 0),
                    rainfall=round(base["rainfall"], 1),
                    solar_radiation=round(base["solar_radiation"] + random.uniform(-0.2, 0.2), 1),
                    wind_speed=round(base["wind_speed"] + random.uniform(-0.5, 0.5), 1),
                    status=z.status,
                )
                self.history_buffer[z.id].append(reading)

    def tick(self) -> Dict[str, SensorReading]:
        """Advances physical simulation step and generates fresh readings."""
        self.step_counter += 1
        now = datetime.now(timezone.utc)
        fresh_readings: Dict[str, SensorReading] = {}

        t = self.step_counter * 0.08  # time phase for diurnal curves

        for z in ZONE_DEFINITIONS:
            state = self.current_state[z.id]

            # Natural physical decay and sinusoidal diurnal waves
            # Air temp warms slightly with solar wave
            diurnal_wave = math.sin(t) * 1.2
            state["air_temperature"] = round(state["air_temperature"] + diurnal_wave * 0.06 + random.uniform(-0.15, 0.15), 1)
            # Soil temp follows air temp with thermal lag
            state["soil_temperature"] = round(state["soil_temperature"] + (state["air_temperature"] - 2.5 - state["soil_temperature"]) * 0.05, 1)

            # Humidity inversely correlates with temperature
            state["relative_humidity"] = round(max(25.0, min(95.0, state["relative_humidity"] - diurnal_wave * 0.08 + random.uniform(-0.3, 0.3))), 1)

            # Gradual soil drying due to evapotranspiration
            evap = 0.03 + max(0.0, (state["air_temperature"] - 20.0) * 0.004)
            state["soil_moisture"] = round(max(12.0, state["soil_moisture"] - evap + random.uniform(-0.05, 0.04)), 1)

            # Micro-fluctuations in NPK and pH
            state["soil_ph"] = round(max(5.0, min(8.2, state["soil_ph"] + random.uniform(-0.01, 0.01))), 2)
            state["nitrogen"] = round(max(20.0, state["nitrogen"] - 0.02 + random.uniform(-0.2, 0.2)), 1)
            state["phosphorus"] = round(max(10.0, state["phosphorus"] + random.uniform(-0.1, 0.1)), 1)
            state["potassium"] = round(max(30.0, state["potassium"] - 0.01 + random.uniform(-0.15, 0.15)), 1)
            state["solar_radiation"] = round(max(6.0, min(28.0, state["solar_radiation"] + math.sin(t * 0.5) * 0.1 + random.uniform(-0.1, 0.1))), 1)
            state["light_intensity"] = round(max(5000.0, min(95000.0, state["light_intensity"] + math.sin(t) * 350 + random.uniform(-200, 200))), 0)
            state["wind_speed"] = round(max(1.0, min(35.0, state["wind_speed"] + random.uniform(-0.4, 0.4))), 1)

            # Determine dynamic health status
            status = "Optimal"
            if z.id == "zone-b" and state["soil_moisture"] < 40.0:
                status = "Needs Attention"
            if state["soil_moisture"] < 25.0 or state["air_temperature"] > 35.0:
                status = "Anomaly Detected"

            reading = SensorReading(
                zone_id=z.id,
                zone_name=z.name,
                timestamp=now,
                soil_moisture=state["soil_moisture"],
                soil_temperature=state["soil_temperature"],
                air_temperature=state["air_temperature"],
                relative_humidity=state["relative_humidity"],
                soil_ph=state["soil_ph"],
                nitrogen=state["nitrogen"],
                phosphorus=state["phosphorus"],
                potassium=state["potassium"],
                light_intensity=state["light_intensity"],
                rainfall=state["rainfall"],
                solar_radiation=state["solar_radiation"],
                wind_speed=state["wind_speed"],
                status=status,
            )

            # Append to rolling ring buffer (max 60 points)
            buf = self.history_buffer[z.id]
            buf.append(reading)
            if len(buf) > 60:
                buf.pop(0)

            fresh_readings[z.id] = reading

        return fresh_readings

    def apply_action(self, req: SensorActionRequest) -> str:
        """Applies manual farmer intervention immediately into physical state."""
        state = self.current_state.get(req.zone_id)
        if not state:
            return f"Zone {req.zone_id} not found."

        mult = req.intensity or 1.0

        if req.action == "irrigate":
            state["soil_moisture"] = round(min(88.0, state["soil_moisture"] + 18.0 * mult), 1)
            state["soil_temperature"] = round(max(16.0, state["soil_temperature"] - 1.5 * mult), 1)
            return f"Irrigation cycle executed for {req.zone_id}. Soil moisture boosted to {state['soil_moisture']}%."

        elif req.action == "fertilize_npk":
            state["nitrogen"] = round(min(240.0, state["nitrogen"] + 35.0 * mult), 1)
            state["phosphorus"] = round(min(90.0, state["phosphorus"] + 15.0 * mult), 1)
            state["potassium"] = round(min(250.0, state["potassium"] + 30.0 * mult), 1)
            state["soil_ph"] = round(max(5.8, min(7.2, state["soil_ph"] + 0.15)), 2)
            return f"Fertigation applied in {req.zone_id}. N-P-K elevated to {state['nitrogen']}/{state['phosphorus']}/{state['potassium']} mg/kg."

        elif req.action == "heatwave_trigger":
            state["air_temperature"] = round(min(43.0, state["air_temperature"] + 8.5 * mult), 1)
            state["soil_moisture"] = round(max(15.0, state["soil_moisture"] - 12.0 * mult), 1)
            state["relative_humidity"] = round(max(20.0, state["relative_humidity"] - 22.0 * mult), 1)
            return f"Simulated acute heatwave event in {req.zone_id}. Air temperature spiked to {state['air_temperature']}°C."

        elif req.action == "frost_snap_trigger":
            state["air_temperature"] = round(max(2.0, state["air_temperature"] - 15.0 * mult), 1)
            state["soil_temperature"] = round(max(6.0, state["soil_temperature"] - 8.0 * mult), 1)
            return f"Simulated unseasonal frost snap in {req.zone_id}. Air temperature plummeted to {state['air_temperature']}°C."

        elif req.action == "heavy_rain":
            state["soil_moisture"] = round(min(92.0, state["soil_moisture"] + 25.0 * mult), 1)
            state["rainfall"] = round(state["rainfall"] + 45.0 * mult, 1)
            state["air_temperature"] = round(max(15.0, state["air_temperature"] - 3.5 * mult), 1)
            return f"Heavy precipitation simulated for {req.zone_id}. Rainfall added: {45.0 * mult:.1f} mm."

        elif req.action == "reset_optimal":
            self._init_zone_states()
            return f"Reset all zones to baseline optimal agronomic parameters."

        return f"Unknown action: {req.action}"

    def get_summary(self, zone_id: str) -> Optional[ZoneTelemetrySummary]:
        zone = next((z for z in ZONE_DEFINITIONS if z.id == zone_id), None)
        if not zone or not self.history_buffer[zone_id]:
            return None

        latest = self.history_buffer[zone_id][-1]
        prev = self.history_buffer[zone_id][-2] if len(self.history_buffer[zone_id]) >= 2 else latest

        metrics_map: Dict[str, SensorMetric] = {}
        for attr, label_info in [
            ("soil_moisture", ("Soil Moisture", "%")),
            ("soil_temperature", ("Soil Temperature", "°C")),
            ("air_temperature", ("Air Temperature", "°C")),
            ("relative_humidity", ("Relative Humidity", "%")),
            ("soil_ph", ("Soil pH", "pH")),
            ("nitrogen", ("Nitrogen (N)", "mg/kg")),
            ("phosphorus", ("Phosphorus (P)", "mg/kg")),
            ("potassium", ("Potassium (K)", "mg/kg")),
            ("light_intensity", ("Light Intensity", "Lux")),
            ("solar_radiation", ("Solar Radiation", "MJ/m²")),
            ("wind_speed", ("Wind Speed", "km/h")),
            ("rainfall", ("Precipitation", "mm")),
        ]:
            val = getattr(latest, attr)
            prev_val = getattr(prev, attr)
            diff = val - prev_val

            if diff > 0.1:
                trend = "up"
            elif diff < -0.1:
                trend = "down"
            else:
                trend = "stable"

            safe_rng = SAFE_RANGES[attr]
            if safe_rng.optimal_min <= val <= safe_rng.optimal_max:
                status = "optimal"
            elif (safe_rng.min <= val < safe_rng.optimal_min) or (safe_rng.optimal_max < val <= safe_rng.max):
                status = "warning"
            else:
                status = "critical"

            metrics_map[attr] = SensorMetric(
                name=label_info[0],
                value=val,
                unit=label_info[1],
                trend=trend,
                status=status,
                safe_range=safe_rng,
                tooltip=METRIC_TOOLTIPS.get(attr, "Agronomic sensor metric"),
            )

        return ZoneTelemetrySummary(
            zone=zone,
            latest_reading=latest,
            metrics=metrics_map,
        )

    def get_history(self, zone_id: str, limit: int = 40) -> List[SensorReading]:
        buf = self.history_buffer.get(zone_id, [])
        return buf[-limit:]


# Global simulator instance
iot_simulator = IoTSensorSimulator()
