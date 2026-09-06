import React from 'react';
import {
  Zap,
  AlertOctagon,
  Flame,
  FileCode,
  CheckCircle2,
  Server,
  Database,
  Layers,
  X,
} from 'lucide-react';

interface ChaosSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateGatewayCrash: () => void;
  onSimulateVectorDbCrash: () => void;
  onSimulateLatencySpike: () => void;
  onSimulateSkillTamper: () => void;
  onRestoreAllHealthy: () => void;
}

export const ChaosSimulatorModal: React.FC<ChaosSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulateGatewayCrash,
  onSimulateVectorDbCrash,
  onSimulateLatencySpike,
  onSimulateSkillTamper,
  onRestoreAllHealthy,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Section 4.4) */}
        <div className="h-12 px-5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                故障注入与独立告警演练 (Chaos & Resilience Sandbox)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs text-slate-700">
          <p className="text-slate-500 text-[11px] leading-relaxed">
            用于主动检验独立工作台在 OPENCLAW 异常、崩溃或热改时的非侵入感知与留痕表现：
          </p>

          {/* Scenario 1: Gateway Crash */}
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300">
            <div className="flex items-start space-x-3">
              <Server className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  演练 1: 模拟 Gateway 核心服务突发挂掉 (Kill Process)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  验证工作台在 2 秒内发出红色警报、声音报警并出具一键拉起方案。
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onSimulateGatewayCrash();
                onClose();
              }}
              className="h-7 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors shrink-0"
            >
              模拟挂掉
            </button>
          </div>

          {/* Scenario 2: VectorDB Crash */}
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300">
            <div className="flex items-start space-x-3">
              <Database className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  演练 2: 模拟向量数据库崩溃 (复盘历史丢数据事故)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  检验独立工作台对内存未刷盘的严重丢数据风险是否精准预警。
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onSimulateVectorDbCrash();
                onClose();
              }}
              className="h-7 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors shrink-0"
            >
              模拟断电
            </button>
          </div>

          {/* Scenario 3: Latency Spike */}
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300">
            <div className="flex items-start space-x-3">
              <Layers className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  演练 3: 模拟并发任务堵塞 + P99 延迟突破 3500ms
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  验证算力看板是否自动触发高延迟指标红色预警。
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onSimulateLatencySpike();
                onClose();
              }}
              className="h-7 px-3 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors shrink-0"
            >
              模拟延迟激增
            </button>
          </div>

          {/* Scenario 4: Skill Code Modified */}
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300">
            <div className="flex items-start space-x-3">
              <FileCode className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  演练 4: 模拟某 Agent 偷偷修改本地 Skill 代码
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  检验资产目录是否实时捕获 Checksum 差异并带上 NEW/变更标记。
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onSimulateSkillTamper();
                onClose();
              }}
              className="h-7 px-3 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shrink-0"
            >
              模拟代码变动
            </button>
          </div>
        </div>

        {/* Footer (Section 4.4) */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={() => {
              onRestoreAllHealthy();
              onClose();
            }}
            className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>一键恢复全系统健康状态</span>
          </button>

          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
