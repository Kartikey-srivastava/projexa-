import React from 'react';
import {
  MapPin,
  Layers,
  Droplets,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ZoneInfo, SensorReading } from '../../types';

interface FarmZonesViewProps {
  zones: ZoneInfo[];
  selectedZoneId: string;
  onSelectZone: (id: string) => void;
  readings: Record<string, SensorReading>;
  onNavigateToView: (view: any) => void;
}

export const FarmZonesView: React.FC<FarmZonesViewProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  readings,
  onNavigateToView,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-700" />
          Farm Zones & Soil Diagnostic Profiles
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          High-resolution soil profile, parcel acreage, and real-time vegetative status across all quadrants.
        </p>
      </div>

      {/* 4 Farm Zone Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {zones.map((zone) => {
          const reading = readings[zone.id];
          const isSelected = zone.id === selectedZoneId;

          return (
            <div
              key={zone.id}
              className={`bg-white rounded-2xl border transition-all p-6 shadow-xs flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: zone.color }}
                    />
                    <div>
                      <h2 className="text-base font-bold text-slate-800">{zone.name}</h2>
                      <span className="text-xs font-semibold text-emerald-700">{zone.crop} Cultivation</span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      zone.status === 'Optimal'
                        ? 'bg-emerald-100 text-emerald-800'
                        : zone.status === 'Needs Attention'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {zone.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {zone.description}
                </p>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs mb-4">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Area Coverage</span>
                    <strong className="text-slate-700">{zone.area_hectares} Hectares</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Soil Classification</span>
                    <strong className="text-slate-700">{zone.soil_type}</strong>
                  </div>
                </div>

                {/* Live Diagnostic Telemetry */}
                {reading && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Live Field Diagnostics
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-blue-50/60 border border-blue-100 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Moisture</span>
                        <strong className="text-blue-800">{reading.soil_moisture.toFixed(1)}%</strong>
                      </div>
                      <div className="p-2 bg-amber-50/60 border border-amber-100 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Soil Temp</span>
                        <strong className="text-amber-800">{reading.soil_temperature.toFixed(1)}°C</strong>
                      </div>
                      <div className="p-2 bg-purple-50/60 border border-purple-100 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Soil pH</span>
                        <strong className="text-purple-800">{reading.soil_ph.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => onSelectZone(zone.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isSelected ? '✓ Active Zone' : 'Select Zone'}
                </button>

                <button
                  onClick={() => {
                    onSelectZone(zone.id);
                    onNavigateToView('yield-xai');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Forecast Yield & SHAP →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
