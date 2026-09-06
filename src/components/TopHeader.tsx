import React from 'react';
import {
  Activity,
  Boxes,
  FileSpreadsheet,
  RefreshCw,
  Download,
  ShieldCheck,
  RotateCcw,
  Bot,
  Crown,
  AlertTriangle,
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
  onOpenAgentConnect: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  services,
  isPolling,
  pollIntervalSec,
  onRefreshNow,
  onExportReport,
  onRestartAllDown,
  onOpenAgentConnect,
}) => {
  const downServices = services.filter((s) => s.status === 'down');
  const healthyCount = services.filter((s) => s.status === 'healthy').length;

  const getTabTitle = () => {
    switch (activeTab) {
      case 'health':
        return {
          title: '本地与云端服务存续大盘',
          subtitle: '核心问答一：本地服务死是活？18789 网关 / 3000 工作台 / 8901 邮件事故排查与 launchd 托管',
        };
      case 'skills':
        return {
          title: '16 Agent · 技能资产全景透视',
          subtitle: '核心问答二：团队 16 个 Agent 各自会什么？三处物理存放目录实时归组与检索',
        };
      case 'workflows':
        return {
          title: '日常业务协作台账与留痕',
          subtitle: '核心问答三：日常业务工作流跑没跑、谁负责、到哪一步？5 大主线协作契约与落地归档',
        };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="h-13 bg-white border-b border-slate-200/80 px-4 lg:px-6 flex items-center justify-between shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] z-30">
      {/* Left: Section title & Breadcrumb */}
      <div className="flex items-center space-x-3 min-w-0">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-black text-slate-800 tracking-tight truncate">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/70">
              <Crown className="w-3 h-3 text-amber-500" />
              <span>王总 & 元元 专属</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 truncate hidden md:block">
            {subtitle}
          </span>
        </div>
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

        {/* Agent Connect Hub */}
        <button
          onClick={onOpenAgentConnect}
          className="h-7.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
          title="Agent 连线终端：支持元元等通过 cURL / Python 访问系统"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Agent 连线 API</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
        </button>

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
