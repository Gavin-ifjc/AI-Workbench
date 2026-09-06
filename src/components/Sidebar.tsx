import React, { useState } from 'react';
import {
  Activity,
  Boxes,
  FileSpreadsheet,
  Download,
  Sliders,
  RefreshCw,
  ShieldCheck,
  Building2,
  Crown,
  Mail,
} from 'lucide-react';
import { ActiveTab, LocalService } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  services: LocalService[];
  isPolling: boolean;
  onRefreshNow: () => void;
  onOpenSettings: () => void;
  onExportReport: () => void;
  conflictSkillCount: number;
  pollIntervalSec: number;
  pendingEmailCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  services,
  isPolling,
  onRefreshNow,
  onOpenSettings,
  onExportReport,
  conflictSkillCount,
  pollIntervalSec,
  pendingEmailCount = 0,
}) => {
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const downCount = services.filter((s) => s.status === 'down').length;

  const navItems = [
    {
      id: 'emails' as ActiveTab,
      label: '邮件通知',
      icon: Mail,
      badge: pendingEmailCount > 0 ? `${pendingEmailCount} 待批` : '0 待办',
      badgeColor:
        pendingEmailCount > 0
          ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
          : 'bg-slate-100 text-slate-500 border-slate-200',
      activeColor: 'text-indigo-600',
    },
    {
      id: 'health' as ActiveTab,
      label: '服务监管',
      icon: Activity,
      badge: services.length === 0 ? '0 服务' : downCount > 0 ? `${downCount} 挂死` : '全线正常',
      badgeColor:
        services.length === 0
          ? 'bg-slate-100 text-slate-500 border-slate-200'
          : downCount > 0
          ? 'bg-rose-50 text-rose-600 border-rose-200 font-bold'
          : 'bg-emerald-50 text-emerald-600 border-emerald-200',
      activeColor: 'text-blue-600',
    },
    {
      id: 'skills' as ActiveTab,
      label: '技能资产',
      icon: Boxes,
      badge: conflictSkillCount > 0 ? `${conflictSkillCount} 项冲突` : '资产全景',
      badgeColor:
        conflictSkillCount > 0
          ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium',
      activeColor: 'text-indigo-600',
    },
    {
      id: 'workflows' as ActiveTab,
      label: '业务台账',
      icon: FileSpreadsheet,
      badge: '规则台账',
      badgeColor: 'bg-blue-50 text-blue-600 border-blue-200 font-medium',
      activeColor: 'text-blue-600',
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
        <div className="h-14 flex items-center px-4 border-b border-slate-100 gap-3 bg-slate-50/50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0 tracking-wider">
            OC
          </div>
          <div className="flex items-center min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
            <span className="font-bold text-xs tracking-tight text-slate-900 flex items-center gap-1.5">
              <span>OpenClaw Hub</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-mono font-bold">
                PRO
              </span>
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
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full border font-mono font-medium ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
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

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs transition-colors"
          title="本地 Mac 监控参数与 launchd 守护配置"
        >
          <div className="shrink-0 flex items-center justify-center w-6 h-6">
            <Sliders className="w-4 h-4 text-slate-500" />
          </div>
          <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
            守护与环境配置
          </span>
        </button>

        {/* Sidecar Daemon Status Indicator */}
        <div className="px-3 py-2 border-t border-slate-100 mt-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] text-slate-400 font-mono whitespace-nowrap truncate">
            Mac 独立常驻 · 127.0.0.1
          </span>
        </div>
      </div>
    </aside>
  );
};
