import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Droplets,
  Thermometer,
  CloudRain,
  Flame,
  Sun,
  ShieldAlert,
  Zap,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import { ZoneInfo, WhatIfSimulationResponse, SensorReading } from '../../types';
import { AgronomyTooltip } from '../common/AgronomyTooltip';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ChartSkeleton } from '../common/SkeletonLoader';
import { api } from '../../services/api';

interface WhatIfSimulatorViewProps {
  zones: ZoneInfo[];
  selectedZoneId: string;
  currentReading?: SensorReading;
}

export const WhatIfSimulatorView: React.FC<WhatIfSimulatorViewProps> = ({
  zones,
  selectedZoneId,
  currentReading,
}) => {
  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  // Sliders state
  const [moisture, setMoisture] = useState<number>(currentReading?.soil_moisture || 54.0);
  const [nitrogen, setNitrogen] = useState<number>(currentReading?.nitrogen || 130.0);
  const [phosphorus, setPhosphorus] = useState<number>(currentReading?.phosphorus || 45.0);
  const [potassium, setPotassium] = useState<number>(currentReading?.potassium || 145.0);
  const [soilPh, setSoilPh] = useState<number>(currentReading?.soil_ph || 6.5);
  const [temperature, setTemperature] = useState<number>(currentReading?.air_temperature || 24.0);
  const [rainfall, setRainfall] = useState<number>(currentReading?.rainfall || 65.0);

  const [simulationResult, setSimulationResult] = useState<WhatIfSimulationResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const debounceTimer = useRef<any>(null);

  // Sync with live reading initially if available
  useEffect(() => {
    if (currentReading) {
      setMoisture(currentReading.soil_moisture);
      setNitrogen(currentReading.nitrogen);
      setPhosphorus(currentReading.phosphorus);
      setPotassium(currentReading.potassium);
      setSoilPh(currentReading.soil_ph);
      setTemperature(currentReading.air_temperature);
      setRainfall(currentReading.rainfall > 0 ? currentReading.rainfall : 65.0);
    }
  }, [selectedZoneId]);

  // Recalculate simulation with debounce
  const runSimulation = async () => {
    setIsCalculating(true);
    try {
      const res = await api.simulateWhatIf({
        zone_id: selectedZoneId,
        crop_type: selectedZone.crop,
        soil_moisture: moisture,
        nitrogen,
        phosphorus,
        potassium,
        soil_ph: soilPh,
        temperature,
        rainfall,
      });
      setSimulationResult(res);
    } catch (e) {
      console.error('Simulation calculation error:', e);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runSimulation();
    }, 280);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [moisture, nitrogen, phosphorus, potassium, soilPh, temperature, rainfall, selectedZoneId]);

  // Presets
  const applyPreset = (presetName: string) => {
    if (presetName === 'drought') {
      setMoisture(18.0);
      setTemperature(35.5);
      setRainfall(2.0);
    } else if (presetName === 'fertilizer_boost') {
      setNitrogen(165.0);
      setPhosphorus(60.0);
      setPotassium(180.0);
      setSoilPh(6.6);
      setMoisture(58.0);
    } else if (presetName === 'monsoon') {
      setMoisture(88.0);
      setRainfall(240.0);
      setTemperature(23.0);
    } else if (presetName === 'frost') {
      setTemperature(4.0);
      setMoisture(45.0);
    } else if (presetName === 'optimal') {
      setMoisture(56.0);
      setTemperature(22.0);
      setSoilPh(6.5);
      setNitrogen(135.0);
      setPhosphorus(45.0);
      setPotassium(140.0);
      setRainfall(75.0);
    }
  };

  // Bar chart data for Baseline vs Simulated
  const comparisonData = simulationResult
    ? [
        {
          name: 'Baseline Historical',
          yield: simulationResult.baseline_yield_t_ha,
          fill: '#64748B',
        },
        {
          name: 'Simulated Scenario',
          yield: simulationResult.simulated_yield_t_ha,
          fill: simulationResult.delta_yield_t_ha >= 0 ? '#15803D' : '#E11D48',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Presets */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-700" />
            Interactive "What-If" Yield Simulator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate climate, irrigation, and fertilizer variables in real-time to forecast yield shifts and resource efficiency.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1">Preset Scenarios:</span>
          <button
            onClick={() => applyPreset('drought')}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all"
          >
            ☀️ Drought Stress Test
          </button>
          <button
            onClick={() => applyPreset('fertilizer_boost')}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all"
          >
            🌱 Optimal Fertilizer Boost
          </button>
          <button
            onClick={() => applyPreset('monsoon')}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all"
          >
            🌧️ Heavy Monsoon
          </button>
          <button
            onClick={() => applyPreset('frost')}
            className="px-3 py-1.5 text-xs font-semibold bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 rounded-xl transition-all"
          >
            ❄️ Frost Snap
          </button>
          <button
            onClick={() => applyPreset('optimal')}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition-all"
            title="Reset to Ideal Agronomic Baseline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Controls vs Visual Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Interactive Parameter Sliders */}
        <div className="lg:col-span-5 min-w-0 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Adjust Agronomic Inputs
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              Crop: <strong>{selectedZone.crop}</strong>
            </span>
          </div>

          {/* Slider 1: Soil Moisture */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <AgronomyTooltip
                term="Soil Moisture"
                definition="Root-zone moisture content. Too low leads to wilting; too high causes root asphyxiation."
              />
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                {moisture.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="0.5"
              value={moisture}
              onChange={(e) => setMoisture(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>10% (Severe Drought)</span>
              <span>Ideal: 45-70%</span>
              <span>90% (Flooded)</span>
            </div>
          </div>

          {/* Slider 2: Nitrogen (N) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <AgronomyTooltip
                term="Nitrogen (N)"
                definition="Macronutrient driving leaf canopy expansion, chlorophyll synthesis, and vegetative vigor."
              />
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                {nitrogen.toFixed(0)} mg/kg
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="250"
              step="5"
              value={nitrogen}
              onChange={(e) => setNitrogen(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>20 mg/kg</span>
              <span>Target: 110-160</span>
              <span>250 mg/kg</span>
            </div>
          </div>

          {/* Slider 3: Phosphorus (P) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <AgronomyTooltip
                term="Phosphorus (P)"
                definition="Powers early root architecture, ATP biochemical storage, and flowering intensity."
              />
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                {phosphorus.toFixed(0)} mg/kg
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="110"
              step="2"
              value={phosphorus}
              onChange={(e) => setPhosphorus(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>10 mg/kg</span>
              <span>Target: 30-60</span>
              <span>110 mg/kg</span>
            </div>
          </div>

          {/* Slider 4: Potassium (K) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <AgronomyTooltip
                term="Potassium (K)"
                definition="Regulates stomatal transpiration, osmotic drought endurance, and kernel grain density."
              />
              <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                {potassium.toFixed(0)} mg/kg
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="260"
              step="5"
              value={potassium}
              onChange={(e) => setPotassium(parseFloat(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>30 mg/kg</span>
              <span>Target: 100-180</span>
              <span>260 mg/kg</span>
            </div>
          </div>

          {/* Slider 5: Soil pH */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <AgronomyTooltip
                term="Soil pH"
                definition="Acidity/Alkalinity. Extreme pH locks nutrients in insoluble forms."
              />
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                {soilPh.toFixed(1)} pH
              </span>
            </div>
            <input
              type="range"
              min="4.5"
              max="8.5"
              step="0.1"
              value={soilPh}
              onChange={(e) => setSoilPh(parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>4.5 (Acidic)</span>
              <span>Optimal: 6.0 - 7.0</span>
              <span>8.5 (Alkaline)</span>
            </div>
          </div>

          {/* Slider 6: Air Temperature */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <AgronomyTooltip
                term="Air Temperature"
                definition="Ambient field temperature driving photosynthesis vs thermal stress."
              />
              <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                {temperature.toFixed(1)} °C
              </span>
            </div>
            <input
              type="range"
              min="8"
              max="42"
              step="0.5"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>8°C (Frost)</span>
              <span>Target: 18 - 25°C</span>
              <span>42°C (Extreme Heat)</span>
            </div>
          </div>

          {/* Slider 7: Rainfall */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <AgronomyTooltip
                term="Rainfall Volume"
                definition="Simulated monthly cumulative precipitation in mm."
              />
              <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                {rainfall.toFixed(0)} mm
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              step="5"
              value={rainfall}
              onChange={(e) => setRainfall(parseFloat(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 mm</span>
              <span>Normal: 60 - 120 mm</span>
              <span>300 mm (Monsoon)</span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Side-by-Side Yield Comparison & Actionable Tips */}
        <div className="lg:col-span-7 min-w-0 space-y-6">
          {/* Side-by-Side Yield Comparison Bar Chart Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Yield Shift: Baseline vs. Simulated
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dynamic yield response curve calculated via Machine Learning engine.
                </p>
              </div>

              {simulationResult && (
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
                    simulationResult.delta_pct >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {simulationResult.delta_pct >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      {simulationResult.delta_pct > 0 ? `+${simulationResult.delta_pct}%` : `${simulationResult.delta_pct}%`}
                    </span>
                    <span className="text-[10px] font-normal opacity-80">
                      ({simulationResult.delta_yield_t_ha > 0 ? `+${simulationResult.delta_yield_t_ha}` : simulationResult.delta_yield_t_ha} t/ha)
                    </span>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-xl uppercase ${
                    simulationResult.risk_level === 'Low'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : simulationResult.risk_level === 'Moderate'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {simulationResult.risk_level} Risk
                  </span>
                </div>
              )}
            </div>

            {/* Recharts Bar Chart with explicit height guardrail: h-72 */}
            <ErrorBoundary fallbackMessage="Unable to render what-if comparison chart">
              {isCalculating || !simulationResult ? (
                <ChartSkeleton height="h-72" />
              ) : (
                <div className="w-full h-72 min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={288} minWidth={0}>
                    <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94A3B8' }}
                        width={45}
                        unit=" t/ha"
                        domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.25)]}
                      />
                      <Tooltip
                        formatter={(val: any) => [`${val} tons/ha`, 'Predicted Yield']}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#FFF',
                        }}
                      />
                      <Bar dataKey="yield" radius={[8, 8, 0, 0]} barSize={64} isAnimationActive={false}>
                        {comparisonData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ErrorBoundary>

            {/* Metric KPI Summary */}
            {simulationResult && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[11px] text-slate-500 font-medium">Baseline Yield</div>
                  <div className="text-lg font-bold text-slate-700 mt-0.5">
                    {simulationResult.baseline_yield_t_ha} <span className="text-xs font-normal">t/ha</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <div className="text-[11px] text-emerald-800 font-medium">Simulated Yield</div>
                  <div className="text-lg font-bold text-emerald-800 mt-0.5">
                    {simulationResult.simulated_yield_t_ha} <span className="text-xs font-normal">t/ha</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[11px] text-slate-500 font-medium">Resource Efficiency</div>
                  <div className="text-lg font-bold text-slate-800 mt-0.5">
                    {simulationResult.resource_efficiency_score}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actionable Tips & Agronomic Advisory Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Agronomic Remediation & Resource Efficiency Tips
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {simulationResult?.agronomic_advisory || 'Calculating agronomic advisory based on parameter shifts...'}
            </p>

            <div className="space-y-2.5">
              {(simulationResult?.actionable_tips || []).map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs text-slate-700"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
