import React from 'react';
import {
  RefreshCw,
  Download,
  RotateCcw,
} from 'lucide-react';
import { ActiveTab, LocalService } from '../types';

interface TopHeaderProps {
  activeTab: ActiveTab;
  services: LocalService[];
  isPolling: boolean;
  pollIntervalSec: number;
  onRefreshNow: () => void;
  onExportReport: () => void;
  onRestartAllDown: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  services,
  isPolling,
  pollIntervalSec,
  onRefreshNow,
  onExportReport,
  onRestartAllDown,
}) => {
  const downServices = services.filter((s) => s.status === 'down');
  const healthyCount = services.filter((s) => s.status === 'healthy').length;

  const getTabTitle = () => {
    switch (activeTab) {
      case 'emails':
        return '邮件通知';
      case 'health':
        return '服务监管';
      case 'skills':
        return '技能资产';
      case 'workflows':
        return '业务台账';
    }
  };

  const title = getTabTitle();

  return (
    <header className="h-12 bg-white border-b border-slate-200/80 px-4 lg:px-6 flex items-center justify-between shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] z-30">
      {/* Left: Section title */}
      <div className="flex items-center space-x-3 min-w-0">
        <h1 className="text-sm font-bold text-slate-800 tracking-tight truncate">
          {title}
        </h1>
      </div>

      {/* Right: Action & Status Bar */}
      <div className="flex items-center space-x-2">
        {/* Down Alert Quick Action if any service is down */}
        {downServices.length > 0 && (
          <button
            onClick={onRestartAllDown}
            className="h-7.5 px-2.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors animate-pulse"
            title="排查并拉起挂死服务"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>拉起挂死服务 ({downServices.length})</span>
          </button>
        )}

        {/* Global Stats Capsule */}
        <div className="h-7.5 px-2.5 rounded-lg bg-slate-900 text-white text-xs font-mono font-medium flex items-center space-x-2 shadow-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              downServices.length > 0 ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span>
            {healthyCount}/{services.length} 服务存活
          </span>
        </div>

        {/* Polling Interval Indicator */}
        <div
          onClick={onRefreshNow}
          className="h-7.5 px-2.5 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-mono flex items-center space-x-1.5 cursor-pointer transition-colors"
          title="点击执行即刻探活"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-slate-500 ${isPolling ? 'animate-spin text-blue-600' : ''}`}
          />
          <span className="text-[11px]">每 {pollIntervalSec}s 探活</span>
        </div>

        {/* Export */}
        <button
          onClick={onExportReport}
          className="h-7.5 px-2.5 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-semibold flex items-center space-x-1 transition-colors"
          title="导出协作台账"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">导出台账</span>
        </button>
      </div>
    </header>
  );
};
