import React from 'react';
import {
  LayoutDashboard,
  Sprout,
  Sliders,
  AlertTriangle,
  LineChart,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export type ActiveTab = 'overview' | 'yield-xai' | 'what-if' | 'alerts' | 'analytics' | 'zones';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  unresolvedAlertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  unresolvedAlertCount,
}) => {
  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'Live Farm Monitoring',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'yield-xai' as ActiveTab,
      label: 'Yield Prediction & XAI',
      icon: Sprout,
      badge: 'ML',
    },
    {
      id: 'what-if' as ActiveTab,
      label: 'What-If Yield Simulator',
      icon: Sliders,
      badge: 'Interactive',
    },
    {
      id: 'alerts' as ActiveTab,
      label: 'Anomaly & Alerts Center',
      icon: AlertTriangle,
      badge: unresolvedAlertCount > 0 ? String(unresolvedAlertCount) : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'analytics' as ActiveTab,
      label: 'Historical Trends & CSV',
      icon: LineChart,
      badge: null,
    },
    {
      id: 'zones' as ActiveTab,
      label: 'Farm Zones & Soil Diagnostics',
      icon: MapPin,
      badge: null,
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-40 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-800 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/10 shrink-0">
              <Sprout className="w-5 h-5 text-emerald-200" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-slate-800 text-base tracking-tight">AgriPredict AI</span>
                <span className="text-[11px] font-medium text-emerald-700">Precision Smart Farming</span>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/60 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden text-left">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-100">
        {!isCollapsed ? (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Cpu className="w-4 h-4 text-emerald-700" />
              <span>XAI Yield Engine</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Model</span>
              <span className="font-medium text-slate-700">RandomForest + SHAP</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Status</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Resilient
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Engine: RandomForest + SHAP">
            <Cpu className="w-5 h-5 text-emerald-700" />
          </div>
        )}
      </div>
    </aside>
  );
};
