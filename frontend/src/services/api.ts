import {
  ZoneInfo,
  ZoneTelemetrySummary,
  SensorReading,
  YieldPredictionResponse,
  WhatIfSimulationRequest,
  WhatIfSimulationResponse,
  AlertItem,
  ZoneThresholds,
  AssistantChatResponse,
} from '../types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit, fallback?: T): Promise<T> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`API Error [${res.status}] ${url}:`, errText);
      if (fallback !== undefined) return fallback;
      throw new Error(`API ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`Fetch failed for ${url}, using resilient fallback. Error:`, err);
    if (fallback !== undefined) return fallback;
    throw err;
  }
}

export const api = {
  getStatus: () =>
    fetchJSON<{
      status: string;
      stream_mode: string;
      storage_mode: string;
      active_zones: number;
    }>(`${API_BASE}/status`, undefined, {
      status: 'healthy',
      stream_mode: 'Simulated Stream (Active)',
      storage_mode: 'Resilient In-Memory Fallback',
      active_zones: 4,
    }),

  getZones: () =>
    fetchJSON<ZoneInfo[]>(`${API_BASE}/zones`, undefined, [
      {
        id: 'zone-a',
        name: 'Zone A - North Wheat Field',
        crop: 'Wheat',
        area_hectares: 14.5,
        soil_type: 'Clay-Loam',
        status: 'Optimal',
        color: '#15803D',
        description: 'Well-drained loam soil planted with durum wheat in early heading stage.',
      },
      {
        id: 'zone-b',
        name: 'Zone B - East Rice Paddy',
        crop: 'Rice',
        area_hectares: 10.2,
        soil_type: 'Alluvial Clay',
        status: 'Needs Attention',
        color: '#D97706',
        description: 'Lowland clay basin with high water retention demand; moisture borderline low.',
      },
      {
        id: 'zone-c',
        name: 'Zone C - South Greenhouse',
        crop: 'Tomato',
        area_hectares: 4.8,
        soil_type: 'Controlled Peat-Perlite',
        status: 'Optimal',
        color: '#15803D',
        description: 'Climate-monitored greenhouse with automated fertigation and high-intensity lighting.',
      },
      {
        id: 'zone-d',
        name: 'Zone D - West Corn Orchard',
        crop: 'Maize',
        area_hectares: 18.0,
        soil_type: 'Silt-Loam',
        status: 'Optimal',
        color: '#15803D',
        description: 'Expansive maize plot under pivot sprinkler coverage; vegetative growth phase.',
      },
    ]),

  getZoneDetails: (zoneId: string) =>
    fetchJSON<ZoneTelemetrySummary>(`${API_BASE}/zones/${zoneId}`),

  getCurrentSensors: (zoneId?: string) =>
    fetchJSON<any>(zoneId ? `${API_BASE}/sensors/current?zone_id=${zoneId}` : `${API_BASE}/sensors/current`),

  getSensorHistory: (zoneId: string, limit: number = 35) =>
    fetchJSON<SensorReading[]>(`${API_BASE}/sensors/history?zone_id=${zoneId}&limit=${limit}`, undefined, []),

  triggerAction: (zoneId: string, action: string, intensity: number = 1.0) =>
    fetchJSON<{ success: boolean; message: string; action: string; zone_id: string }>(
      `${API_BASE}/sensors/action`,
      {
        method: 'POST',
        body: JSON.stringify({ zone_id: zoneId, action, intensity }),
      }
    ),

  predictYield: (params: {
    zone_id: string;
    crop_type?: string;
    growth_stage?: string;
    soil_moisture?: number;
    nitrogen?: number;
    phosphorus?: number;
    potassium?: number;
    soil_ph?: number;
    temperature?: number;
    rainfall?: number;
    solar_radiation?: number;
  }) =>
    fetchJSON<YieldPredictionResponse>(`${API_BASE}/predictions/yield`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  simulateWhatIf: (params: WhatIfSimulationRequest) =>
    fetchJSON<WhatIfSimulationResponse>(`${API_BASE}/simulator/what-if`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getAlerts: (params?: { zone_id?: string; severity?: string; resolved?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.zone_id) q.set('zone_id', params.zone_id);
    if (params?.severity) q.set('severity', params.severity);
    if (params?.resolved !== undefined) q.set('resolved', String(params.resolved));
    return fetchJSON<AlertItem[]>(`${API_BASE}/alerts?${q.toString()}`, undefined, []);
  },

  resolveAlert: (alertId: string) =>
    fetchJSON<{ success: boolean; alert: AlertItem }>(`${API_BASE}/alerts/${alertId}/resolve`, {
      method: 'POST',
    }),

  getThresholds: (zoneId: string) =>
    fetchJSON<ZoneThresholds>(`${API_BASE}/alerts/thresholds?zone_id=${zoneId}`),

  updateThresholds: (data: ZoneThresholds) =>
    fetchJSON<{ success: boolean; thresholds: ZoneThresholds }>(`${API_BASE}/alerts/thresholds`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getHistoricalAnalytics: () =>
    fetchJSON<{ seasonal_data: any[]; annual_trend: any[] }>(`${API_BASE}/analytics/historical`, undefined, {
      seasonal_data: [],
      annual_trend: [],
    }),

  getExportCsvUrl: (zoneId: string) => `${API_BASE}/analytics/export-csv?zone_id=${zoneId}`,

  askAssistant: (params: { zone_id: string; message: string; history?: any[] }) =>
    fetchJSON<AssistantChatResponse>(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};
