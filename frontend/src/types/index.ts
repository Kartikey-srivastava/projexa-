export interface ZoneInfo {
  id: string;
  name: string;
  crop: string;
  area_hectares: number;
  soil_type: string;
  status: 'Optimal' | 'Needs Attention' | 'Anomaly Detected';
  color: string;
  description: string;
}

export interface SafeRange {
  min: number;
  max: number;
  optimal_min: number;
  optimal_max: number;
  unit: string;
}

export interface SensorMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'optimal' | 'warning' | 'critical';
  safe_range: SafeRange;
  tooltip: string;
}

export interface SensorReading {
  zone_id: string;
  zone_name: string;
  timestamp: string;
  soil_moisture: number;
  soil_temperature: number;
  air_temperature: number;
  relative_humidity: number;
  soil_ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  light_intensity: number;
  rainfall: number;
  solar_radiation: number;
  wind_speed: number;
  status: 'Optimal' | 'Needs Attention' | 'Anomaly Detected';
}

export interface ZoneTelemetrySummary {
  zone: ZoneInfo;
  latest_reading: SensorReading;
  metrics: Record<string, SensorMetric>;
}

export interface ShapFeatureContribution {
  feature: string;
  display_name: string;
  value: number;
  unit: string;
  impact_pct: number;
  direction: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface YieldPredictionResponse {
  zone_id: string;
  zone_name: string;
  crop_type: string;
  growth_stage: string;
  predicted_yield_t_ha: number;
  confidence_score: number;
  historical_avg_yield_t_ha: number;
  delta_vs_historical_pct: number;
  performance_tier: 'Above Average' | 'Average' | 'Below Average' | 'Severely Depressed';
  shap_contributions: ShapFeatureContribution[];
  plain_english_summary: string;
  key_recommendation: string;
  generated_at: string;
}

export interface WhatIfSimulationRequest {
  zone_id: string;
  crop_type: string;
  baseline_yield_t_ha?: number;
  soil_moisture: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soil_ph: number;
  temperature: number;
  rainfall: number;
  solar_radiation?: number;
}

export interface WhatIfSimulationResponse {
  zone_id: string;
  crop_type: string;
  baseline_yield_t_ha: number;
  simulated_yield_t_ha: number;
  delta_yield_t_ha: number;
  delta_pct: number;
  resource_efficiency_score: number;
  agronomic_advisory: string;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  optimal_target_comparison: Record<string, { simulated: number; optimal_min: number; optimal_max: number }>;
  actionable_tips: string[];
}

export interface AlertItem {
  id: string;
  zone_id: string;
  zone_name: string;
  severity: 'critical' | 'warning' | 'info';
  metric: string;
  title: string;
  message: string;
  current_value: number;
  threshold_value: number;
  unit: string;
  timestamp: string;
  resolved: boolean;
  resolved_at?: string;
  suggested_action: string;
}

export interface ZoneThresholds {
  zone_id: string;
  min_soil_moisture: number;
  max_soil_moisture: number;
  min_soil_ph: number;
  max_soil_ph: number;
  min_temp: number;
  max_temp: number;
  min_nitrogen: number;
  max_nitrogen: number;
  min_phosphorus: number;
  max_potassium: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  key_factors?: string[];
  suggested_actions?: string[];
}

export interface AssistantChatResponse {
  answer: string;
  zone_id: string;
  key_factors: string[];
  suggested_actions: string[];
  relevant_metrics: Record<string, any>;
  timestamp: string;
}

export interface SeasonalComparisonPoint {
  season: string;
  crop: string;
  predicted_yield_t_ha: number;
  actual_yield_t_ha: number;
  avg_rainfall_mm: number;
  avg_moisture_pct: number;
  efficiency_pct: number;
}
