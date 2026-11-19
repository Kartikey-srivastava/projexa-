import React, { useState } from 'react';
import {
  Bell,
  Activity,
  Sun,
  Wind,
  CloudRain,
  Bot,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { ZoneInfo, AlertItem, SensorReading } from '../../types';
import { StreamStatus } from '../../services/websocket';

interface HeaderProps {
  zones: ZoneInfo[];
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
  streamStatus: StreamStatus;
  latencyMs: number;
  currentReading?: SensorReading;
  alerts: AlertItem[];
  onOpenAlerts: () => void;
  onToggleAiAssistant: () => void;
  isAiDrawerOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  streamStatus,
  latencyMs,
  currentReading,
  alerts,
  onOpenAlerts,
  onToggleAiAssistant,
  isAiDrawerOpen,
}) => {
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Zone Selector & Quick Badge */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <label htmlFor="zone-select" className="sr-only">Select Farm Zone</label>
            <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-3 py-1.5 transition-all shadow-sm">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: selectedZone?.color || '#15803D' }}
              />
              <select
                id="zone-select"
                value={selectedZoneId}
                onChange={(e) => onSelectZone(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer pr-4"
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} ({zone.crop})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 border border-slate-200/60 rounded-lg px-2.5 py-1">
            <span className="font-medium text-slate-700">{selectedZone?.soil_type}</span>
            <span>•</span>
            <span>{selectedZone?.area_hectares} ha</span>
          </span>
        </div>

        {/* Center/Right: Live Status Badge, Weather telemetry, Bell & AI Assistant */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Stream Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors shadow-xs bg-slate-50 border-slate-200/80">
            <span className="relative flex h-2 w-2">
              {streamStatus === 'connected' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </>
              ) : streamStatus === 'fallback-polling' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
              )}
            </span>
            <span className="text-slate-700 font-semibold flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-emerald-700" />
              {streamStatus === 'connected'
                ? 'Simulated Stream (Active)'
                : streamStatus === 'fallback-polling'
                ? 'Resilient REST Polling'
                : 'Connecting...'}
            </span>
            <span className="text-[11px] text-slate-400 border-l border-slate-200 pl-2">
              {latencyMs}ms
            </span>
          </div>

          {/* Mini NASA POWER Weather Glance */}
          {currentReading && (
            <div className="hidden xl:flex items-center gap-3 px-3 py-1 bg-slate-50/80 border border-slate-200/60 rounded-xl text-xs text-slate-600">
              <div className="flex items-center gap-1" title="Solar Radiation">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{currentReading.solar_radiation} MJ/m²</span>
              </div>
              <div className="flex items-center gap-1" title="Rainfall">
                <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                <span>{currentReading.rainfall} mm</span>
              </div>
              <div className="flex items-center gap-1" title="Wind Speed">
                <Wind className="w-3.5 h-3.5 text-teal-600" />
                <span>{currentReading.wind_speed} km/h</span>
              </div>
            </div>
          )}

          {/* Quick Alert Bell with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAlertMenu(!showAlertMenu)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
              title="Quick Alerts"
            >
              <Bell className="w-5 h-5" />
              {unresolvedAlerts.length > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-rose-600 rounded-full px-1 shadow-sm">
                  {unresolvedAlerts.length}
                </span>
              )}
            </button>

            {showAlertMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 text-sm">Active Farm Alerts</span>
                    <span className="text-xs bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-full">
                      {unresolvedAlerts.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowAlertMenu(false);
                      onOpenAlerts();
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                  >
                    View All & Settings →
                  </button>
                </div>

                <div className="mt-2 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {unresolvedAlerts.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                      <span>All telemetry parameters within optimal thresholds.</span>
                    </div>
                  ) : (
                    unresolvedAlerts.slice(0, 4).map((alert) => (
                      <div key={alert.id} className="py-2.5 first:pt-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                            <AlertTriangle className={`w-3.5 h-3.5 ${alert.severity === 'critical' ? 'text-rose-600' : 'text-amber-500'}`} />
                            {alert.title}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            alert.severity === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{alert.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Farm Assistant Drawer Trigger Button */}
          <button
            onClick={onToggleAiAssistant}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              isAiDrawerOpen
                ? 'bg-emerald-800 text-white shadow-emerald-700/20'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">AI Farm Assistant</span>
          </button>
        </div>
      </div>
    </header>
  );
};
