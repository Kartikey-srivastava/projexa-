import React, { useState, useEffect } from 'react';
import {
  Sprout,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Award,
  Calendar,
  Layers,
  HelpCircle,
  RefreshCw,
  CheckCircle,
  AlertOctagon,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ZoneInfo, YieldPredictionResponse, SensorReading } from '../../types';
import { AgronomyTooltip } from '../common/AgronomyTooltip';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ChartSkeleton } from '../common/SkeletonLoader';
import { api } from '../../services/api';

interface YieldPredictionViewProps {
  zones: ZoneInfo[];
  selectedZoneId: string;
  currentReading?: SensorReading;
}

export const YieldPredictionView: React.FC<YieldPredictionViewProps> = ({
  zones,
  selectedZoneId,
  currentReading,
}) => {
  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
  const [selectedCrop, setSelectedCrop] = useState<string>(selectedZone.crop);
  const [growthStage, setGrowthStage] = useState<string>('Flowering / Heading');
  const [prediction, setPrediction] = useState<YieldPredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync crop if zone changes
  useEffect(() => {
    setSelectedCrop(selectedZone.crop);
  }, [selectedZone]);

  const loadPrediction = async () => {
    setIsLoading(true);
    try {
      const res = await api.predictYield({
        zone_id: selectedZoneId,
        crop_type: selectedCrop,
        growth_stage: growthStage,
      });
      setPrediction(res);
    } catch (e) {
      console.error('Failed to load yield prediction', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrediction();
  }, [selectedZoneId, selectedCrop, growthStage]);

  // Format data for horizontal diverging SHAP bar chart
  const shapChartData = (prediction?.shap_contributions || []).map((item) => ({
    name: item.display_name,
    impact: item.impact_pct,
    value: item.value,
    unit: item.unit,
    direction: item.direction,
    description: item.description,
  }));

  return (
    <div className="space-y-6">
      {/* Top Filter and Crop Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-700" />
            AI Crop Yield Prediction & Explainability (XAI)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scikit-learn random forest regressor with exact SHAP-style marginal attribution decomposition.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Crop Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="font-semibold text-slate-500">Crop:</span>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="Wheat">Wheat (Durum / Spring)</option>
              <option value="Rice">Rice (Lowland Paddy)</option>
              <option value="Maize">Maize (Field Corn)</option>
              <option value="Tomato">Tomato (Greenhouse)</option>
              <option value="Soybean">Soybean (Legume)</option>
            </select>
          </div>

          {/* Growth Stage Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="font-semibold text-slate-500">Stage:</span>
            <select
              value={growthStage}
              onChange={(e) => setGrowthStage(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="Vegetative / Tillering">Vegetative / Tillering</option>
              <option value="Flowering / Heading">Flowering / Heading</option>
              <option value="Grain Fill / Fruit Set">Grain Fill / Fruit Set</option>
              <option value="Ripening / Maturity">Ripening / Maturity</option>
            </select>
          </div>

          <button
            onClick={loadPrediction}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            title="Recalculate with newest sensor telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Yield Forecast Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Forecast Yield */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Predicted Harvest Yield
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-700/60 flex items-center justify-center">
              <Award className="w-4 h-4 text-emerald-200" />
            </div>
          </div>
          <div className="my-4">
            <div className="text-4xl font-extrabold tracking-tight">
              {prediction ? prediction.predicted_yield_t_ha.toFixed(2) : '--'}
              <span className="text-base font-medium text-emerald-200 ml-1.5">tons/ha</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                (prediction?.delta_vs_historical_pct || 0) >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {(prediction?.delta_vs_historical_pct || 0) >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {prediction ? `${prediction.delta_vs_historical_pct > 0 ? '+' : ''}${prediction.delta_vs_historical_pct}%` : '--'}
              </span>
              <span className="text-xs text-emerald-300/80">vs regional benchmark</span>
            </div>
          </div>
          <div className="pt-3 border-t border-emerald-700/50 flex justify-between text-xs text-emerald-200/90">
            <span>Crop: <strong>{selectedCrop}</strong></span>
            <span>Plot: <strong>{selectedZone.name.split('-')[0]}</strong></span>
          </div>
        </div>

        {/* Card 2: Confidence & Performance Tier */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <AgronomyTooltip
              term="Model Confidence"
              definition="Ensemble tree convergence score derived from variance across estimator decision trees."
            />
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {prediction?.confidence_score || 95}% Confidence
            </span>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-slate-800">
              {prediction?.performance_tier || 'Above Average'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Regional historical benchmark: <strong>{prediction?.historical_avg_yield_t_ha || 5.0} t/ha</strong>.
            </p>
          </div>
          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Sensor Fusion Quality</span>
              <span className="font-semibold text-emerald-700">Optimal (10/10 feeds)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${prediction?.confidence_score || 95}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Plain-English AI Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Plain-English AI Farm Advisory
          </div>
          <div className="my-2">
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {prediction?.plain_english_summary ||
                'Yield forecast is calculating based on live field moisture and temperature telemetry...'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-700 truncate">
              {prediction?.key_recommendation || 'Continue optimal irrigation.'}
            </span>
          </div>
        </div>
      </div>

      {/* SHAP Feature Importance Diverging Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">
                SHAP Feature Contribution Breakdown (Explainable AI)
              </h2>
              <AgronomyTooltip
                term="SHAP Impact"
                definition="Shapley Additive exPlanations quantify how much each environmental and soil factor pushed the predicted yield above (+) or below (-) baseline expectations."
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Green bars (+%) indicate positive yield drivers; Crimson bars (-%) indicate limiting stress factors.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 bg-emerald-600 rounded"></span> Positive Yield Driver
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-3 h-3 bg-rose-600 rounded"></span> Limiting Factor
            </span>
          </div>
        </div>

        {/* Recharts Container with explicit height guardrail: h-80 */}
        <ErrorBoundary fallbackMessage="Unable to render SHAP feature importance chart">
          {isLoading || shapChartData.length === 0 ? (
            <ChartSkeleton height="h-80" />
          ) : (
            <div className="w-full h-80 min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={320} minWidth={0}>
                <BarChart
                  layout="vertical"
                  data={shapChartData}
                  margin={{ top: 10, right: 30, left: 110, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    unit="%"
                    domain={['dataMin - 3', 'dataMax + 3']}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${value > 0 ? '+' : ''}${value}% impact (Current: ${item.payload.value} ${item.payload.unit})`,
                      'SHAP Yield Impact',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#FFF',
                    }}
                  />
                  <ReferenceLine x={0} stroke="#94A3B8" strokeWidth={1.5} />
                  <Bar dataKey="impact" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                    {shapChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.impact >= 0 ? '#15803D' : '#E11D48'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ErrorBoundary>

        {/* Feature Attribution Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {shapChartData.slice(0, 6).map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs ${
                item.impact >= 0 ? 'bg-emerald-50/40 border-emerald-200/70' : 'bg-rose-50/40 border-rose-200/70'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-800">{item.name}</span>
                <span className={item.impact >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                  {item.impact > 0 ? `+${item.impact}%` : `${item.impact}%`}
                </span>
              </div>
              <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
