import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { HomeDashboard } from './components/views/HomeDashboard';
import { YieldPredictionView } from './components/views/YieldPredictionView';
import { WhatIfSimulatorView } from './components/views/WhatIfSimulatorView';
import { AlertsCenterView } from './components/views/AlertsCenterView';
import { HistoricalAnalyticsView } from './components/views/HistoricalAnalyticsView';
import { FarmZonesView } from './components/views/FarmZonesView';
import { AIAssistantDrawer } from './components/common/AIAssistantDrawer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ZoneInfo, ZoneTelemetrySummary, SensorReading, AlertItem } from './types';
import { api } from './services/api';
import { useLiveStream } from './services/websocket';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);

  // Core state
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone-a');
  const [summary, setSummary] = useState<ZoneTelemetrySummary | undefined>(undefined);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Real-time WebSocket hook with resilient fallback
  const handleReadingUpdate = useCallback((readings: Record<string, SensorReading>) => {
    // If update includes selected zone, append to local rolling history
    const zReading = readings[selectedZoneId];
    if (zReading) {
      setHistory((prev) => {
        const next = [...prev, zReading];
        return next.length > 40 ? next.slice(next.length - 40) : next;
      });
    }
  }, [selectedZoneId]);

  const { streamStatus, latencyMs, currentZoneReading, latestReadings } = useLiveStream({
    zoneId: selectedZoneId,
    onReadingUpdate: handleReadingUpdate,
  });

  // Load initial zones and alerts
  const loadInitialData = useCallback(async () => {
    try {
      const [fetchedZones, fetchedAlerts] = await Promise.all([
        api.getZones(),
        api.getAlerts(),
      ]);
      setZones(fetchedZones);
      setAlerts(fetchedAlerts);
    } catch (e) {
      console.warn('Initial data load error, using resilient fallback', e);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load summary and history when selected zone changes
  const loadZoneData = useCallback(async (zoneId: string) => {
    try {
      const [sum, hist] = await Promise.all([
        api.getZoneDetails(zoneId).catch(() => undefined),
        api.getSensorHistory(zoneId, 35).catch(() => []),
      ]);
      if (sum) setSummary(sum);
      if (hist && hist.length > 0) setHistory(hist);
    } catch (e) {
      console.warn('Zone telemetry load error', e);
    }
  }, []);

  useEffect(() => {
    loadZoneData(selectedZoneId);
  }, [selectedZoneId, loadZoneData]);

  // Keep summary synchronized when live stream pushes fresh values
  useEffect(() => {
    if (currentZoneReading && summary) {
      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latest_reading: currentZoneReading,
        };
      });
    }
  }, [currentZoneReading]);

  // Refresh alerts helper
  const refreshAlerts = async () => {
    try {
      const fetchedAlerts = await api.getAlerts();
      setAlerts(fetchedAlerts);
    } catch (e) {
      console.warn('Refresh alerts error', e);
    }
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0] || {
    id: 'zone-a',
    name: 'Zone A - North Wheat Field',
    crop: 'Wheat',
    area_hectares: 14.5,
    soil_type: 'Clay-Loam',
    status: 'Optimal',
    color: '#15803D',
    description: 'Well-drained loam soil planted with durum wheat in early heading stage.',
  };

  const unresolvedAlertCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex overflow-x-hidden">
      {/* Collapsible Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        unresolvedAlertCount={unresolvedAlertCount}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top Header Bar */}
        <Header
          zones={zones}
          selectedZoneId={selectedZoneId}
          onSelectZone={setSelectedZoneId}
          streamStatus={streamStatus}
          latencyMs={latencyMs}
          currentReading={currentZoneReading}
          alerts={alerts}
          onOpenAlerts={() => setActiveTab('alerts')}
          onToggleAiAssistant={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
          isAiDrawerOpen={isAiDrawerOpen}
        />

        {/* Dynamic Page Views with Error Boundary */}
        <main className="flex-1 min-w-0 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary fallbackMessage="An error occurred while loading this view">
            {activeTab === 'overview' && (
              <HomeDashboard
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
                summary={summary}
                history={history}
                onTriggerActionSuccess={() => {
                  loadZoneData(selectedZoneId);
                  refreshAlerts();
                }}
              />
            )}

            {activeTab === 'yield-xai' && (
              <YieldPredictionView
                zones={zones}
                selectedZoneId={selectedZoneId}
                currentReading={currentZoneReading}
              />
            )}

            {activeTab === 'what-if' && (
              <WhatIfSimulatorView
                zones={zones}
                selectedZoneId={selectedZoneId}
                currentReading={currentZoneReading}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertsCenterView
                zones={zones}
                selectedZoneId={selectedZoneId}
                alerts={alerts}
                onRefreshAlerts={refreshAlerts}
              />
            )}

            {activeTab === 'analytics' && (
              <HistoricalAnalyticsView
                zones={zones}
                selectedZoneId={selectedZoneId}
              />
            )}

            {activeTab === 'zones' && (
              <FarmZonesView
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
                readings={latestReadings}
                onNavigateToView={setActiveTab}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Floating / Slide-Over AI Farm Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        selectedZone={selectedZone}
        currentReading={currentZoneReading}
        activeAlertCount={unresolvedAlertCount}
      />
    </div>
  );
}

export default App;
