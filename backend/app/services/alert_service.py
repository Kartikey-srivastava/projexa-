import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional
from app.models.schemas import AlertItem, ZoneThresholds, SensorReading


class AlertService:
    def __init__(self):
        self.thresholds: Dict[str, ZoneThresholds] = {
            "zone-a": ZoneThresholds(
                zone_id="zone-a",
                min_soil_moisture=30.0,
                max_soil_moisture=75.0,
                min_soil_ph=6.0,
                max_soil_ph=7.4,
                min_temp=12.0,
                max_temp=32.0,
                min_nitrogen=70.0,
                max_nitrogen=220.0,
                min_phosphorus=25.0,
                min_potassium=60.0,
            ),
            "zone-b": ZoneThresholds(
                zone_id="zone-b",
                min_soil_moisture=45.0,  # Rice needs higher moisture
                max_soil_moisture=85.0,
                min_soil_ph=5.5,
                max_soil_ph=7.2,
                min_temp=18.0,
                max_temp=35.0,
                min_nitrogen=80.0,
                max_nitrogen=240.0,
                min_phosphorus=25.0,
                min_potassium=60.0,
            ),
            "zone-c": ZoneThresholds(
                zone_id="zone-c",
                min_soil_moisture=45.0,
                max_soil_moisture=80.0,
                min_soil_ph=5.8,
                max_soil_ph=7.0,
                min_temp=15.0,
                max_temp=30.0,
                min_nitrogen=80.0,
                max_nitrogen=230.0,
                min_phosphorus=30.0,
                min_potassium=90.0,
            ),
            "zone-d": ZoneThresholds(
                zone_id="zone-d",
                min_soil_moisture=35.0,
                max_soil_moisture=75.0,
                min_soil_ph=5.8,
                max_soil_ph=7.5,
                min_temp=14.0,
                max_temp=34.0,
                min_nitrogen=90.0,
                max_nitrogen=230.0,
                min_phosphorus=25.0,
                min_potassium=70.0,
            ),
        }
        self.alerts: List[AlertItem] = []
        self._init_demo_alerts()

    def _init_demo_alerts(self):
        now = datetime.now(timezone.utc)
        self.alerts = [
            AlertItem(
                id="alert-001",
                zone_id="zone-b",
                zone_name="Zone B - East Rice Paddy",
                severity="warning",
                metric="soil_moisture",
                title="Low Soil Moisture for Rice Paddy",
                message="Soil moisture level has fallen below 40% (current: 36.8%). Rice requires minimum 45% moisture to avoid panicle sterility.",
                current_value=36.8,
                threshold_value=45.0,
                unit="%",
                timestamp=now,
                resolved=False,
                suggested_action="Activate flood irrigation valves on sluice gate 2 for 45 minutes.",
            ),
            AlertItem(
                id="alert-002",
                zone_id="zone-a",
                zone_name="Zone A - North Wheat Field",
                severity="info",
                metric="nitrogen",
                title="Nitrogen Uptake Transition",
                message="Nitrogen levels stabilized around 132 mg/kg. Foliar chlorophyll index is optimal for grain filling.",
                current_value=132.0,
                threshold_value=120.0,
                unit="mg/kg",
                timestamp=now,
                resolved=False,
                suggested_action="Routine check scheduled; no immediate nitrogen top-dressing required.",
            ),
            AlertItem(
                id="alert-003",
                zone_id="zone-c",
                zone_name="Zone C - South Greenhouse",
                severity="critical",
                metric="air_temperature",
                title="High Temperature Threshold Exceeded",
                message="Greenhouse ambient air reached 31.2°C during peak noon irradiance.",
                current_value=31.2,
                threshold_value=30.0,
                unit="°C",
                timestamp=now,
                resolved=True,
                resolved_at=now,
                suggested_action="Automated roof louvers and misting nozzles engaged.",
            ),
        ]

    def check_reading(self, reading: SensorReading) -> List[AlertItem]:
        threshold = self.thresholds.get(reading.zone_id)
        if not threshold:
            return []

        new_alerts: List[AlertItem] = []
        now = datetime.now(timezone.utc)

        # Check moisture
        if reading.soil_moisture < threshold.min_soil_moisture:
            sev = "critical" if reading.soil_moisture < threshold.min_soil_moisture - 10.0 else "warning"
            # check if similar open alert exists
            exists = any(
                a.zone_id == reading.zone_id and a.metric == "soil_moisture" and not a.resolved
                for a in self.alerts
            )
            if not exists:
                item = AlertItem(
                    id=f"alt-{uuid.uuid4().hex[:8]}",
                    zone_id=reading.zone_id,
                    zone_name=reading.zone_name,
                    severity=sev,
                    metric="soil_moisture",
                    title=f"Moisture Deficit in {reading.zone_name}",
                    message=f"Soil moisture dropped to {reading.soil_moisture:.1f}% (below minimum threshold of {threshold.min_soil_moisture}%).",
                    current_value=reading.soil_moisture,
                    threshold_value=threshold.min_soil_moisture,
                    unit="%",
                    timestamp=now,
                    resolved=False,
                    suggested_action=f"Trigger irrigation for {reading.zone_name} to restore root-zone hydration.",
                )
                self.alerts.insert(0, item)
                new_alerts.append(item)

        # Check temperature
        if reading.air_temperature > threshold.max_temp:
            sev = "critical" if reading.air_temperature > threshold.max_temp + 3.0 else "warning"
            exists = any(
                a.zone_id == reading.zone_id and a.metric == "air_temperature" and not a.resolved
                for a in self.alerts
            )
            if not exists:
                item = AlertItem(
                    id=f"alt-{uuid.uuid4().hex[:8]}",
                    zone_id=reading.zone_id,
                    zone_name=reading.zone_name,
                    severity=sev,
                    metric="air_temperature",
                    title=f"Thermal Stress Warning in {reading.zone_name}",
                    message=f"Air temperature surged to {reading.air_temperature:.1f}°C (exceeds safe limit of {threshold.max_temp}°C).",
                    current_value=reading.air_temperature,
                    threshold_value=threshold.max_temp,
                    unit="°C",
                    timestamp=now,
                    resolved=False,
                    suggested_action="Deploy shading screens or activate canopy evaporative cooling.",
                )
                self.alerts.insert(0, item)
                new_alerts.append(item)

        # Keep alerts list bounded to 50
        if len(self.alerts) > 50:
            self.alerts = self.alerts[:50]

        return new_alerts

    def resolve_alert(self, alert_id: str) -> Optional[AlertItem]:
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.resolved = True
                alert.resolved_at = datetime.now(timezone.utc)
                return alert
        return None

    def get_alerts(self, zone_id: Optional[str] = None, severity: Optional[str] = None, resolved: Optional[bool] = None) -> List[AlertItem]:
        res = self.alerts
        if zone_id:
            res = [a for a in res if a.zone_id == zone_id]
        if severity:
            res = [a for a in res if a.severity == severity]
        if resolved is not None:
            res = [a for a in res if a.resolved == resolved]
        return res

    def get_thresholds(self, zone_id: str) -> Optional[ZoneThresholds]:
        return self.thresholds.get(zone_id)

    def update_thresholds(self, t: ZoneThresholds) -> ZoneThresholds:
        self.thresholds[t.zone_id] = t
        return t


# Singleton alert service
alert_service = AlertService()
