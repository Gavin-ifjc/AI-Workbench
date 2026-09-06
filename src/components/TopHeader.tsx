import React from 'react';
import {
  Activity,
  Boxes,
  FileSpreadsheet,
  Gauge,
  RefreshCw,
  Zap,
  Download,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Bot,
} from 'lucide-react';
import { ActiveTab, LocalService } from '../types';

interface TopHeaderProps {
  activeTab: ActiveTab;
  services: LocalService[];
  isPolling: boolean;
  pollIntervalSec: number;
  onRefreshNow: () => void;
  onOpenChaos: () => void;
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
  onOpenChaos,
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
          title: '服务健康总览与异常告警',
          subtitle: '实时轮询 Mac 本地核心服务存续状态，提供防丢数据专项告警',
        };
      case 'skills':
        return {
          title: 'Agent·Skill 资产目录表',
          subtitle: '实时扫描 11 个 Agent 本地目录，解析入参出参契约（严格不复制业务全文）',
        };
      case 'workflows':
        return {
          title: '工作流协作台账与变更留痕',
          subtitle: '独立人可读协作规则登记，各环节责任 Agent 绑定与 Git 式 Diff 变更审计',
        };
      case 'telemetry':
        return {
          title: '全局算力监控与排队看板',
          subtitle: '实时任务排队深度、并发计算槽位、P50/P95/P99 延迟预警与 Apple Silicon 显存',
        };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="h-13 bg-white border-b border-slate-200/80 px-5 lg:px-6 flex items-center justify-between shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] z-30">
      {/* Left: Section title & Breadcrumb */}
      <div className="flex items-center space-x-3 min-w-0">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-black text-slate-800 tracking-tight truncate">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-600 border border-blue-200/70">
              macOS Local Native
            </span>
          </div>
          <span className="text-[11px] text-slate-500 truncate hidden md:block">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Right: Action & Status Bar */}
      <div className="flex items-center space-x-2">
        {/* Anti-Data Loss Shield Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-mono text-[11px]">防丢数据隔离守护 ACTIVE</span>
        </div>

        {/* Down Alert Quick Action if any service is down */}
        {downServices.length > 0 && (
          <button
            onClick={onRestartAllDown}
            className="h-7.5 px-2.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors animate-pulse"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>一键拉起 {downServices.length} 个崩溃服务</span>
          </button>
        )}

        {/* Global Stats Capsule */}
        <div className="h-7.5 px-2.5 rounded-lg bg-slate-900 text-white text-xs font-mono font-medium flex items-center space-x-2 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
          <span className="text-[11px]">每 {pollIntervalSec}s 巡检</span>
        </div>

        {/* Agent Connect Hub */}
        <button
          onClick={onOpenAgentConnect}
          className="h-7.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
          title="外部 AI Agent 连线与 API 接入"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Agent 连线 API</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
        </button>

        {/* Chaos Test Quick trigger */}
        <button
          onClick={onOpenChaos}
          className="h-7.5 px-2.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-semibold flex items-center space-x-1 transition-colors"
          title="故障演练"
        >
          <Zap className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">故障演练</span>
        </button>

        {/* Export */}
        <button
          onClick={onExportReport}
          className="h-7.5 px-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-semibold flex items-center space-x-1 transition-colors"
          title="导出台账"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">导出台账</span>
        </button>
      </div>
    </header>
  );
};
