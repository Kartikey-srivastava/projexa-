from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class ZoneInfo(BaseModel):
    id: str
    name: str
    crop: str
    area_hectares: float
    soil_type: str
    status: Literal["Optimal", "Needs Attention", "Anomaly Detected"]
    color: str
    description: str


class SafeRange(BaseModel):
    min: float
    max: float
    optimal_min: float
    optimal_max: float
    unit: str


class SensorMetric(BaseModel):
    name: str
    value: float
    unit: str
    trend: Literal["up", "down", "stable"]
    status: Literal["optimal", "warning", "critical"]
    safe_range: SafeRange
    tooltip: str


class SensorReading(BaseModel):
    zone_id: str
    zone_name: str
    timestamp: datetime
    soil_moisture: float = Field(..., description="Soil Moisture percentage (%)")
    soil_temperature: float = Field(..., description="Soil Temperature in °C")
    air_temperature: float = Field(..., description="Ambient Air Temperature in °C")
    relative_humidity: float = Field(..., description="Air Relative Humidity (%)")
    soil_ph: float = Field(..., description="Soil pH level (0-14)")
    nitrogen: float = Field(..., description="Nitrogen level in mg/kg")
    phosphorus: float = Field(..., description="Phosphorus level in mg/kg")
    potassium: float = Field(..., description="Potassium level in mg/kg")
    light_intensity: float = Field(..., description="Light Intensity in Lux")
    rainfall: float = Field(..., description="Recent precipitation in mm")
    solar_radiation: float = Field(..., description="NASA POWER Solar Radiation in MJ/m^2/day")
    wind_speed: float = Field(..., description="Wind Speed in km/h")
    status: Literal["Optimal", "Needs Attention", "Anomaly Detected"]


class ZoneTelemetrySummary(BaseModel):
    zone: ZoneInfo
    latest_reading: SensorReading
    metrics: Dict[str, SensorMetric]


class ShapFeatureContribution(BaseModel):
    feature: str
    display_name: str
    value: float
    unit: str
    impact_pct: float
    direction: Literal["positive", "negative", "neutral"]
    description: str


class YieldPredictionRequest(BaseModel):
    zone_id: str
    crop_type: Optional[str] = None
    growth_stage: Optional[str] = "Flowering"
    soil_moisture: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    soil_ph: Optional[float] = None
    temperature: Optional[float] = None
    rainfall: Optional[float] = None
    solar_radiation: Optional[float] = None


class YieldPredictionResponse(BaseModel):
    zone_id: str
    zone_name: str
    crop_type: str
    growth_stage: str
    predicted_yield_t_ha: float
    confidence_score: float
    historical_avg_yield_t_ha: float
    delta_vs_historical_pct: float
    performance_tier: Literal["Above Average", "Average", "Below Average", "Severely Depressed"]
    shap_contributions: List[ShapFeatureContribution]
    plain_english_summary: str
    key_recommendation: str
    generated_at: datetime


class WhatIfSimulationRequest(BaseModel):
    zone_id: str
    crop_type: str
    baseline_yield_t_ha: Optional[float] = None
    soil_moisture: float
    nitrogen: float
    phosphorus: float
    potassium: float
    soil_ph: float
    temperature: float
    rainfall: float
    solar_radiation: Optional[float] = 18.5


class WhatIfSimulationResponse(BaseModel):
    zone_id: str
    crop_type: str
    baseline_yield_t_ha: float
    simulated_yield_t_ha: float
    delta_yield_t_ha: float
    delta_pct: float
    resource_efficiency_score: float  # 0 to 100%
    agronomic_advisory: str
    risk_level: Literal["Low", "Moderate", "High", "Critical"]
    optimal_target_comparison: Dict[str, Dict[str, float]]
    actionable_tips: List[str]


class AlertItem(BaseModel):
    id: str
    zone_id: str
    zone_name: str
    severity: Literal["critical", "warning", "info"]
    metric: str
    title: str
    message: str
    current_value: float
    threshold_value: float
    unit: str
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    suggested_action: str


class ZoneThresholds(BaseModel):
    zone_id: str
    min_soil_moisture: float = 25.0
    max_soil_moisture: float = 75.0
    min_soil_ph: float = 6.0
    max_soil_ph: float = 7.5
    min_temp: float = 12.0
    max_temp: float = 34.0
    min_nitrogen: float = 60.0
    max_nitrogen: float = 220.0
    min_phosphorus: float = 25.0
    min_potassium: float = 40.0


class HistoricalDataPoint(BaseModel):
    timestamp: str
    soil_moisture: float
    air_temperature: float
    relative_humidity: float
    soil_ph: float
    nitrogen: float
    predicted_yield: float
    actual_yield: Optional[float] = None


class SeasonalComparisonPoint(BaseModel):
    season: str
    crop: str
    predicted_yield_t_ha: float
    actual_yield_t_ha: float
    avg_rainfall_mm: float
    avg_moisture_pct: float
    efficiency_pct: float


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[datetime] = None


class AssistantChatRequest(BaseModel):
    zone_id: str
    message: str
    history: Optional[List[ChatMessage]] = []


class AssistantChatResponse(BaseModel):
    answer: str
    zone_id: str
    key_factors: List[str]
    suggested_actions: List[str]
    relevant_metrics: Dict[str, Any]
    timestamp: datetime


class SensorActionRequest(BaseModel):
    zone_id: str
    action: Literal["irrigate", "fertilize_npk", "heatwave_trigger", "frost_snap_trigger", "heavy_rain", "reset_optimal"]
    intensity: Optional[float] = 1.0  # Multiplier or intensity
