import React, { useState } from 'react';
import {
  Droplets,
  Thermometer,
  Wind,
  Gauge,
  Sun,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ZoneInfo, ZoneTelemetrySummary, SensorReading } from '../../types';
import { AgronomyTooltip } from '../common/AgronomyTooltip';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { CardSkeleton, ChartSkeleton } from '../common/SkeletonLoader';
import { api } from '../../services/api';

interface HomeDashboardProps {
  zones: ZoneInfo[];
  selectedZoneId: string;
  onSelectZone: (id: string) => void;
  summary?: ZoneTelemetrySummary;
  history: SensorReading[];
  onTriggerActionSuccess?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  summary,
  history,
  onTriggerActionSuccess,
}) => {
  const [selectedChartMetric, setSelectedChartMetric] = useState<'all' | 'moisture' | 'temperature' | 'humidity'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
  const reading = summary?.latest_reading;
  const metrics = summary?.metrics;

  const handleAction = async (action: string) => {
    setActionLoading(action);
    setActionFeedback(null);
    try {
      const res = await api.triggerAction(selectedZoneId, action);
      setActionFeedback(res.message);
      onTriggerActionSuccess?.();
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (e: any) {
      setActionFeedback(`Action failed: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Format time series data for Recharts
  const chartData = history.map((item) => {
    const d = new Date(item.timestamp);
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      moisture: item.soil_moisture,
      soilTemp: item.soil_temperature,
      airTemp: item.air_temperature,
      humidity: item.relative_humidity,
      ph: item.soil_ph,
      nitrogen: item.nitrogen,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">
              {selectedZone?.name}
            </h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              {selectedZone?.crop} Field
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry, IoT safe-ranges, and continuous agronomic diagnostics.
          </p>
        </div>

        {/* Quick Simulator Interventions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Test Interventions:
          </span>
          <button
            onClick={() => handleAction('irrigate')}
            disabled={!!actionLoading}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Droplets className="w-3.5 h-3.5 text-blue-600" />
            {actionLoading === 'irrigate' ? 'Pumping...' : 'Trigger Irrigation'}
          </button>
          <button
            onClick={() => handleAction('fertilize_npk')}
            disabled={!!actionLoading}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            {actionLoading === 'fertilize_npk' ? 'Applying...' : 'Apply NPK Fertigation'}
          </button>
          <button
            onClick={() => handleAction('heatwave_trigger')}
            disabled={!!actionLoading}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            {actionLoading === 'heatwave_trigger' ? 'Simulating...' : 'Simulate Heatwave'}
          </button>
          <button
            onClick={() => handleAction('reset_optimal')}
            disabled={!!actionLoading}
            className="p-2 text-xs text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            title="Reset telemetry to baseline optimal values"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs animate-fadeIn">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {actionFeedback}
          </span>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 1. Live Sensor KPI Cards */}
      <ErrorBoundary fallbackMessage="Unable to render Sensor KPI cards">
        {!metrics || !reading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* KPI 1: Soil Moisture */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <AgronomyTooltip
                  term="Soil Moisture"
                  definition={metrics.soil_moisture.tooltip}
                />
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-slate-800 tracking-tight">
                  {reading.soil_moisture.toFixed(1)}
                  <span className="text-xs font-normal text-slate-500 ml-0.5">%</span>
                </div>
                <div className={`flex items-center text-xs font-semibold ${
                  metrics.soil_moisture.trend === 'up' ? 'text-emerald-600' : metrics.soil_moisture.trend === 'down' ? 'text-amber-600' : 'text-slate-400'
                }`}>
                  {metrics.soil_moisture.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : metrics.soil_moisture.trend === 'down' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  <span className="capitalize">{metrics.soil_moisture.trend}</span>
                </div>
              </div>
              {/* Safe Range Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Target: 45-70%</span>
                  <span className={metrics.soil_moisture.status === 'optimal' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {metrics.soil_moisture.status}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      metrics.soil_moisture.status === 'optimal' ? 'bg-emerald-500' : metrics.soil_moisture.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, reading.soil_moisture))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* KPI 2: Temperatures (Soil & Air) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <AgronomyTooltip
                  term="Temperature"
                  definition="Ambient air vs root-zone subsurface soil temperature in °C."
                />
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Thermometer className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-800 tracking-tight">
                    {reading.air_temperature.toFixed(1)}
                    <span className="text-xs font-normal text-slate-500 ml-0.5">°C Air</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Soil: {reading.soil_temperature.toFixed(1)}°C
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    metrics.air_temperature.status === 'optimal' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {metrics.air_temperature.status}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Safe: 18 - 28°C</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (reading.air_temperature / 45) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* KPI 3: Relative Humidity */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <AgronomyTooltip
                  term="Relative Humidity"
                  definition={metrics.relative_humidity.tooltip}
                />
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Wind className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-slate-800 tracking-tight">
                  {reading.relative_humidity.toFixed(1)}
                  <span className="text-xs font-normal text-slate-500 ml-0.5">%</span>
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Vapor: Normal
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Target: 50-75%</span>
                  <span className="text-emerald-600 font-semibold">{metrics.relative_humidity.status}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-500"
                    style={{ width: `${reading.relative_humidity}%` }}
                  />
                </div>
              </div>
            </div>

            {/* KPI 4: Soil pH */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <AgronomyTooltip
                  term="Soil pH"
                  definition={metrics.soil_ph.tooltip}
                />
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Gauge className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-slate-800 tracking-tight">
                  {reading.soil_ph.toFixed(2)}
                  <span className="text-xs font-normal text-slate-500 ml-1">pH</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                  {reading.soil_ph < 6.0 ? 'Slightly Acidic' : reading.soil_ph > 7.3 ? 'Slightly Alkaline' : 'Optimal Neutral'}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Target: 6.0 - 7.2</span>
                  <span className="text-emerald-600 font-semibold">Good</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${((reading.soil_ph - 4.5) / 4.0) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* KPI 5: NPK Levels */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <AgronomyTooltip
                  term="NPK Macronutrients"
                  definition="Nitrogen (N), Phosphorus (P), Potassium (K) available in root-zone soil (mg/kg)."
                />
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-slate-800 tracking-tight flex items-baseline gap-1">
                  <span>N: <span className="text-emerald-700">{reading.nitrogen.toFixed(0)}</span></span>
                  <span className="text-slate-300">|</span>
                  <span>P: <span className="text-blue-700">{reading.phosphorus.toFixed(0)}</span></span>
                  <span className="text-slate-300">|</span>
                  <span>K: <span className="text-purple-700">{reading.potassium.toFixed(0)}</span></span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">mg/kg soil availability</div>
              </div>
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Balance Ratio</span>
                  <span className="text-emerald-600 font-semibold">Synchronized</span>
                </div>
                <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-0.5">
                  <div className="bg-emerald-500 flex-1" title="Nitrogen" />
                  <div className="bg-blue-500 flex-1" title="Phosphorus" />
                  <div className="bg-purple-500 flex-1" title="Potassium" />
                </div>
              </div>
            </div>

            {/* KPI 6: Solar & Light */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <AgronomyTooltip
                  term="Solar & Weather"
                  definition="NASA POWER daily solar radiation flux combined with field Lux intensity."
                />
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Sun className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-bold text-slate-800 tracking-tight">
                    {(reading.light_intensity / 1000).toFixed(1)}k
                    <span className="text-xs font-normal text-slate-500 ml-0.5">Lux</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {reading.solar_radiation.toFixed(1)} MJ/m² solar
                  </div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                  Photosynthetic
                </span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Rain: {reading.rainfall} mm</span>
                  <span>Wind: {reading.wind_speed} km/h</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (reading.light_intensity / 80000) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </ErrorBoundary>

      {/* 2. Live Time-Series Charts & Interactive Farm Zones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Live Sensor Stream Chart */}
        <div className="lg:col-span-2 min-w-0 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Telemetry Time-Series Stream
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Streaming rolling history every 3 seconds for {selectedZone?.name}.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
              {(['all', 'moisture', 'temperature', 'humidity'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedChartMetric(type)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                    selectedChartMetric === type
                      ? 'bg-white text-slate-800 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Explicit Container Height Guardrail: h-80 with min-w-0 */}
          <ErrorBoundary fallbackMessage="Time-series chart rendering error">
            {chartData.length === 0 ? (
              <ChartSkeleton height="h-80" />
            ) : (
              <div className="w-full h-80 min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={320} minWidth={0}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} width={36} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#FFF',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                    {(selectedChartMetric === 'all' || selectedChartMetric === 'moisture') && (
                      <Area
                        type="monotone"
                        dataKey="moisture"
                        name="Soil Moisture (%)"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#moistGrad)"
                        isAnimationActive={false}
                      />
                    )}
                    {(selectedChartMetric === 'all' || selectedChartMetric === 'temperature') && (
                      <Area
                        type="monotone"
                        dataKey="airTemp"
                        name="Air Temp (°C)"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#tempGrad)"
                        isAnimationActive={false}
                      />
                    )}
                    {(selectedChartMetric === 'all' || selectedChartMetric === 'humidity') && (
                      <Area
                        type="monotone"
                        dataKey="humidity"
                        name="Humidity (%)"
                        stroke="#10B981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#humGrad)"
                        isAnimationActive={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ErrorBoundary>
        </div>

        {/* Right (1 col): Visual Farm Zones Grid Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">Farm Zones Health Grid</h2>
              <span className="text-xs text-slate-400 font-medium">Click to inspect</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Continuous field status across all active agricultural plots.
            </p>

            <div className="space-y-3">
              {zones.map((zone) => {
                const isSelected = zone.id === selectedZoneId;
                const statusColor =
                  zone.status === 'Optimal'
                    ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                    : zone.status === 'Needs Attention'
                    ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
                    : 'border-rose-200 bg-rose-50/50 hover:bg-rose-50';

                const badgeColor =
                  zone.status === 'Optimal'
                    ? 'bg-emerald-100 text-emerald-800'
                    : zone.status === 'Needs Attention'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800';

                return (
                  <div
                    key={zone.id}
                    onClick={() => onSelectZone(zone.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${statusColor} ${
                      isSelected ? 'ring-2 ring-emerald-600 shadow-sm' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        />
                        <span className="text-sm font-bold text-slate-800">{zone.name}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {zone.status}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Crop: <strong className="text-slate-700">{zone.crop}</strong></span>
                      <span>Area: <strong className="text-slate-700">{zone.area_hectares} ha</strong></span>
                      <span>Soil: <strong className="text-slate-700">{zone.soil_type}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Optimal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Needs Attention
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Anomaly
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
