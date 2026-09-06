import React, { useState } from 'react';
import {
  Activity,
  Boxes,
  FileSpreadsheet,
  Gauge,
  Zap,
  Download,
  Sliders,
  Volume2,
  VolumeX,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Server,
  Layers,
  Bot,
} from 'lucide-react';
import { ActiveTab, LocalService } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  services: LocalService[];
  isPolling: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onRefreshNow: () => void;
  onOpenChaos: () => void;
  onOpenSettings: () => void;
  onExportReport: () => void;
  onOpenAgentConnect: () => void;
  conflictSkillCount: number;
  hasLatencyAlert: boolean;
  pollIntervalSec: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  services,
  isPolling,
  soundEnabled,
  setSoundEnabled,
  onRefreshNow,
  onOpenChaos,
  onOpenSettings,
  onExportReport,
  onOpenAgentConnect,
  conflictSkillCount,
  hasLatencyAlert,
  pollIntervalSec,
}) => {
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const downCount = services.filter((s) => s.status === 'down').length;

  const navItems = [
    {
      id: 'health' as ActiveTab,
      label: '服务健康总览',
      sublabel: '存续探测 & 告警',
      icon: Activity,
      badge: downCount > 0 ? `${downCount} 异常` : '正常',
      badgeColor:
        downCount > 0
          ? 'bg-rose-50 text-rose-600 border-rose-200'
          : 'bg-emerald-50 text-emerald-600 border-emerald-200',
      activeColor: 'text-blue-600',
    },
    {
      id: 'skills' as ActiveTab,
      label: 'Agent·Skill 资产目录',
      sublabel: '11 个 Agent 实时扫描',
      icon: Boxes,
      badge: conflictSkillCount > 0 ? '冲突预警' : '11 Agent',
      badgeColor:
        conflictSkillCount > 0
          ? 'bg-amber-50 text-amber-600 border-amber-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
      activeColor: 'text-indigo-600',
    },
    {
      id: 'workflows' as ActiveTab,
      label: '工作流台账与留痕',
      sublabel: '协作规则 & 审计Diff',
      icon: FileSpreadsheet,
      badge: '规则登记',
      badgeColor: 'bg-blue-50 text-blue-600 border-blue-200',
      activeColor: 'text-blue-600',
    },
    {
      id: 'telemetry' as ActiveTab,
      label: '全局算力监控看板',
      sublabel: '排队 & P99 延迟预警',
      icon: Gauge,
      badge: hasLatencyAlert ? '延迟告警' : 'MPS 在线',
      badgeColor: hasLatencyAlert
        ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
        : 'bg-slate-100 text-slate-600 border-slate-200',
      activeColor: 'text-amber-600',
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-50 bg-white border-r border-slate-200/80 shadow-[4px_0_24px_rgba(0,0,0,0.03)] transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
        isPinned ? 'w-[240px]' : 'w-[72px] hover:w-[240px]'
      }`}
    >
      {/* Top Brand Area */}
      <div>
        <div className="h-14 flex items-center px-4 border-b border-slate-100 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
            OC
          </div>
          <div className="flex flex-col min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
            <span className="font-bold text-xs tracking-tight text-slate-900 flex items-center gap-1">
              OPENCLAW
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 font-mono font-medium">
                Workbench
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono truncate">
              Mac 本地独立工作台
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-left transition-all relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="shrink-0 flex items-center justify-center w-6 h-6">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>

                <div className="ml-3 flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{item.label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full border font-mono font-medium ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{item.sublabel}</div>
                </div>

                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utility Controls */}
      <div className="p-2 border-t border-slate-100 space-y-1 bg-slate-50/50">
        {/* Agent Connect Hub */}
        <button
          onClick={onOpenAgentConnect}
          className="w-full flex items-center px-3 py-2 rounded-lg bg-blue-50/70 text-blue-700 hover:bg-blue-100/80 text-xs transition-colors border border-blue-200/60"
          title="外部 Agent 接入与开放 API 中心"
        >
          <div className="shrink-0 flex items-center justify-center w-6 h-6">
            <Bot className="w-4 h-4 text-blue-600" />
          </div>
          <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-bold flex items-center justify-between flex-1">
            <span>Agent 连线终端</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
          </span>
        </button>

        {/* Chaos Test */}
        <button
          onClick={onOpenChaos}
          className="w-full flex items-center px-3 py-2 rounded-lg text-amber-700 hover:bg-amber-50 text-xs transition-colors"
          title="故障注入与自愈演练"
        >
          <div className="shrink-0 flex items-center justify-center w-6 h-6">
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
            故障演练沙箱
          </span>
        </button>

        {/* Quick Polling Refresh */}
        <button
          onClick={onRefreshNow}
          className="w-full flex items-center px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs transition-colors"
          title={`立即探活扫描 (当前 ${pollIntervalSec}s 周期)`}
        >
          <div className="shrink-0 flex items-center justify-center w-6 h-6">
            <RefreshCw
              className={`w-4 h-4 text-slate-500 ${isPolling ? 'animate-spin text-blue-600' : ''}`}
            />
          </div>
          <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium font-mono">
            手动探活巡检
          </span>
        </button>

        {/* Export Report */}
        <button
          onClick={onExportReport}
          className="w-full flex items-center px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs transition-colors"
          title="导出协作规则与变更留痕台账"
        >
          <div className="shrink-0 flex items-center justify-center w-6 h-6">
            <Download className="w-4 h-4 text-slate-500" />
          </div>
          <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
            导出协作台账
          </span>
        </button>

        {/* Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="w-full flex items-center px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs transition-colors"
          title={soundEnabled ? '已启用异常告警音效' : '已静音'}
        >
          <div className="shrink-0 flex items-center justify-center w-6 h-6">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
            {soundEnabled ? '声音告警: 开启' : '声音告警: 静音'}
          </span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs transition-colors"
          title="本地 Mac 监控参数配置"
        >
          <div className="shrink-0 flex items-center justify-center w-6 h-6">
            <Sliders className="w-4 h-4 text-slate-500" />
          </div>
          <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
            环境与路径配置
          </span>
        </button>

        {/* Sidecar Daemon Status Indicator */}
        <div className="px-3 py-2 border-t border-slate-100 mt-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] text-slate-400 font-mono whitespace-nowrap truncate">
            Sidecar PID 10422 独立存活
          </span>
        </div>
      </div>
    </aside>
  );
};
