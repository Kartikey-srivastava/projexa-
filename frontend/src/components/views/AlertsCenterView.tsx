import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Filter,
  Clock,
  MapPin,
  Save,
  Check,
  RefreshCw,
  AlertOctagon,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { AlertItem, ZoneInfo, ZoneThresholds } from '../../types';
import { api } from '../../services/api';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface AlertsCenterViewProps {
  zones: ZoneInfo[];
  selectedZoneId: string;
  alerts: AlertItem[];
  onRefreshAlerts: () => void;
}

export const AlertsCenterView: React.FC<AlertsCenterViewProps> = ({
  zones,
  selectedZoneId,
  alerts,
  onRefreshAlerts,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [filterResolved, setFilterResolved] = useState<'all' | 'active' | 'resolved'>('all');
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('all');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Thresholds state
  const [thresholds, setThresholds] = useState<ZoneThresholds | null>(null);
  const [isSavingThresholds, setIsSavingThresholds] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const loadThresholds = async (zoneId: string) => {
    try {
      const res = await api.getThresholds(zoneId);
      setThresholds(res);
    } catch (e) {
      console.error('Failed to load thresholds', e);
    }
  };

  useEffect(() => {
    loadThresholds(selectedZoneId);
  }, [selectedZoneId]);

  const handleResolveAlert = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      await api.resolveAlert(alertId);
      onRefreshAlerts();
    } catch (e) {
      console.error('Failed to resolve alert', e);
    } finally {
      setResolvingId(null);
    }
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thresholds) return;
    setIsSavingThresholds(true);
    setSaveSuccessMsg(null);
    try {
      await api.updateThresholds(thresholds);
      setSaveSuccessMsg('Threshold parameters successfully updated and deployed to telemetry watchdogs.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (e) {
      console.error('Failed to update thresholds', e);
    } finally {
      setIsSavingThresholds(false);
    }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    if (activeZoneFilter !== 'all' && alert.zone_id !== activeZoneFilter) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (filterResolved === 'active' && alert.resolved) return false;
    if (filterResolved === 'resolved' && !alert.resolved) return false;
    return true;
  });

  const unresolvedCount = alerts.filter((a) => !a.resolved).length;
  const criticalCount = alerts.filter((a) => !a.resolved && a.severity === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Smart Alerts & Anomaly Detection Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time automated edge anomaly detection with customizable zone safety bands.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            {criticalCount} Critical
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
            {unresolvedCount} Active Alerts
          </div>
          <button
            onClick={onRefreshAlerts}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            title="Refresh Alert Feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Alert Feed (7 cols) vs Threshold Configuration (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Filterable Anomaly Feed */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-700" />
              Live Anomaly Feed ({filteredAlerts.length})
            </h2>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={activeZoneFilter}
                onChange={(e) => setActiveZoneFilter(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="all">All Farm Zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="warning">Warning Only</option>
                <option value="info">Info Only</option>
              </select>

              <select
                value={filterResolved}
                onChange={(e) => setFilterResolved(e.target.value as any)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="resolved">Resolved Only</option>
              </select>
            </div>
          </div>

          {/* List of Alerts */}
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="font-semibold text-slate-800 text-sm">No Anomalies Matching Filter</div>
                <p className="text-xs text-slate-400">All sensor feeds in selected criteria are within normal boundaries.</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                const isWarning = alert.severity === 'warning';

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border transition-all ${
                      alert.resolved
                        ? 'bg-slate-50/60 border-slate-200 opacity-70'
                        : isCritical
                        ? 'bg-rose-50/40 border-rose-200'
                        : isWarning
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-blue-50/40 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            alert.resolved
                              ? 'bg-slate-200 text-slate-600'
                              : isCritical
                              ? 'bg-rose-100 text-rose-700'
                              : isWarning
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {alert.resolved ? (
                            <Check className="w-4 h-4" />
                          ) : isCritical ? (
                            <AlertOctagon className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-800">{alert.title}</h3>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                alert.resolved
                                  ? 'bg-slate-200 text-slate-700'
                                  : isCritical
                                  ? 'bg-rose-100 text-rose-800'
                                  : isWarning
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {alert.resolved ? 'Resolved' : alert.severity}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <MapPin className="w-3 h-3 text-emerald-700" />
                              {alert.zone_name}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            {alert.message}
                          </p>

                          <div className="mt-2.5 p-2.5 bg-white/80 rounded-lg border border-slate-200/60 text-xs">
                            <span className="font-semibold text-emerald-800">Action: </span>
                            <span className="text-slate-700">{alert.suggested_action}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {!alert.resolved && (
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={resolvingId === alert.id}
                          className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg shadow-2xs transition-all disabled:opacity-50"
                        >
                          {resolvingId === alert.id ? 'Saving...' : 'Mark Resolved'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Threshold Customization Settings */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Zone Alert Thresholds
            </h2>
            <select
              value={selectedZoneId}
              onChange={(e) => loadThresholds(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name.split('-')[0]}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-500">
            Set safety triggers for the autonomous anomaly detector. Telemetry outside these ranges fires alerts immediately.
          </p>

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {saveSuccessMsg}
            </div>
          )}

          {thresholds ? (
            <form onSubmit={handleSaveThresholds} className="space-y-4">
              {/* Soil Moisture Min / Max */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Min Soil Moisture (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="60"
                    value={thresholds.min_soil_moisture}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, min_soil_moisture: parseFloat(e.target.value) || 20 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Max Soil Moisture (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="95"
                    value={thresholds.max_soil_moisture}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, max_soil_moisture: parseFloat(e.target.value) || 85 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* Temp Min / Max */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Min Temp (°C)</label>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={thresholds.min_temp}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, min_temp: parseFloat(e.target.value) || 10 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Max Temp Alert (°C)</label>
                  <input
                    type="number"
                    min="25"
                    max="45"
                    value={thresholds.max_temp}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, max_temp: parseFloat(e.target.value) || 35 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* Soil pH Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Min Soil pH</label>
                  <input
                    type="number"
                    step="0.1"
                    min="4.5"
                    max="7.0"
                    value={thresholds.min_soil_ph}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, min_soil_ph: parseFloat(e.target.value) || 5.8 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Max Soil pH</label>
                  <input
                    type="number"
                    step="0.1"
                    min="6.8"
                    max="8.8"
                    value={thresholds.max_soil_ph}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, max_soil_ph: parseFloat(e.target.value) || 7.5 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* Nitrogen & Potassium */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Min Nitrogen (mg/kg)</label>
                  <input
                    type="number"
                    min="30"
                    max="150"
                    value={thresholds.min_nitrogen}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, min_nitrogen: parseFloat(e.target.value) || 70 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Max Nitrogen (mg/kg)</label>
                  <input
                    type="number"
                    min="160"
                    max="300"
                    value={thresholds.max_nitrogen}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, max_nitrogen: parseFloat(e.target.value) || 240 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingThresholds}
                className="w-full mt-4 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSavingThresholds ? 'Saving Configuration...' : 'Save & Deploy Safety Bounds'}
              </button>
            </form>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">Loading thresholds...</div>
          )}
        </div>
      </div>
    </div>
  );
};
