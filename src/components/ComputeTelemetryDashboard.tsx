import React, { useState } from 'react';
import {
  Gauge,
  Layers,
  Clock,
  Zap,
  Flame,
  AlertTriangle,
  Cpu,
  Sliders,
  Plus,
  Trash2,
  Play,
  TrendingUp,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { ComputeMetrics, QueuedTask } from '../types';

interface ComputeTelemetryDashboardProps {
  metrics: ComputeMetrics;
  onUpdateThreshold: (threshold: number) => void;
  onSimulateTaskQueueSpike: () => void;
  onEnqueueTask: (task: QueuedTask) => void;
  onRemoveTask: (taskId: string) => void;
}

export const ComputeTelemetryDashboard: React.FC<ComputeTelemetryDashboardProps> = ({
  metrics,
  onUpdateThreshold,
  onSimulateTaskQueueSpike,
  onEnqueueTask,
  onRemoveTask,
}) => {
  const [thresholdInput, setThresholdInput] = useState<number>(metrics.peakLatencyThresholdMs);
  const [showThresholdEditor, setShowThresholdEditor] = useState<boolean>(false);

  const isAlert = metrics.isLatencyAlertTriggered || metrics.latencyP99Ms >= metrics.peakLatencyThresholdMs;

  const handleApplyThreshold = () => {
    onUpdateThreshold(thresholdInput);
    setShowThresholdEditor(false);
  };

  return (
    <div className="space-y-4">
      {/* Alert Banner when P99 breaches threshold */}
      {isAlert && (
        <div
          id="banner-latency-alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-pulse"
        >
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-900">
                  ⚠️ 全局算力推理延迟告警 (P99 Spike Alert)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-600 text-white font-mono font-bold">
                  {metrics.latencyP99Ms} ms &gt; 阈值 {metrics.peakLatencyThresholdMs} ms
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                当前排队任务已积压至 {metrics.queuedTasks} 项，MPS 显存与计算槽位利用率达到{' '}
                {metrics.metalMpsUtilization}%，建议暂停非核心 Agent 向量化抽取任务。
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onUpdateThreshold(metrics.latencyP99Ms + 500)}
              className="h-7.5 px-3 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all"
            >
              临时提高阈值 (+500ms)
            </button>
          </div>
        </div>
      )}

      {/* 4 Large KPI Cards (Light Enterprise Typography) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: P99 Peak Latency */}
        <div
          className={`p-4 rounded-xl bg-white border shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between ${
            isAlert ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              P99 PEAK INFERENCE LATENCY
            </span>
            <div
              className={`text-2xl font-black font-mono mt-0.5 ${
                isAlert ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {metrics.latencyP99Ms}{' '}
              <span className="text-xs text-slate-400 font-normal">ms</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              告警红线阈值: {metrics.peakLatencyThresholdMs}ms
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isAlert
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-indigo-50 text-indigo-600 border-indigo-200'
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Task Queue Depth */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              QUEUED TASKS (DEPTH)
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {metrics.taskQueue.length}{' '}
              <span className="text-xs text-slate-400 font-normal">个等待中</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              并发槽位: {metrics.activeSlots}/{metrics.totalSlots} 正在推理
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Token Generation Speed */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              TOKEN THROUGHPUT
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {metrics.tokensPerSec}{' '}
              <span className="text-xs text-slate-400 font-normal">tokens/s</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              并发吞吐稳定 · 本地 Ollama/vLLM
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Apple Metal MPS GPU */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              APPLE METAL MPS & RAM
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {metrics.metalMpsUtilization}%
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Mac 统一内存: {metrics.memoryUsedGb}GB / {metrics.memoryTotalGb}GB
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Latency Quantiles Bar & Threshold Controls */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              推理时延分位统计 (P50 / P95 / P99 Latency Distribution)
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowThresholdEditor(!showThresholdEditor)}
              className="h-7 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium flex items-center space-x-1"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>调整预警阈值 ({metrics.peakLatencyThresholdMs}ms)</span>
            </button>

            <button
              onClick={onSimulateTaskQueueSpike}
              className="h-7 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center space-x-1"
              title="模拟多 Agent 突发并发任务，测试排队与延迟告警"
            >
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>模拟并发排队拥堵</span>
            </button>
          </div>
        </div>

        {/* Quantiles Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">P50 中位数时延:</span>
            <span className="font-bold text-slate-800">{metrics.latencyP50Ms} ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">P95 尾部时延:</span>
            <span className="font-bold text-slate-800">{metrics.latencyP95Ms} ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">P99 峰值时延:</span>
            <span
              className={`font-black ${isAlert ? 'text-amber-600' : 'text-slate-800'}`}
            >
              {metrics.latencyP99Ms} ms
            </span>
          </div>
        </div>

        {/* Threshold Editor Drawer */}
        {showThresholdEditor && (
          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
              <span className="text-slate-700 font-semibold">
                自定义 P99 延迟告警红线 (ms):
              </span>
              <input
                type="range"
                min="1000"
                max="6000"
                step="100"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(Number(e.target.value))}
                className="flex-1 accent-blue-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-blue-700 w-16 text-right">
                {thresholdInput} ms
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleApplyThreshold}
                className="h-7 px-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-xs"
              >
                保存阈值
              </button>
              <button
                onClick={() => setShowThresholdEditor(false)}
                className="h-7 px-2 text-slate-500 hover:text-slate-700"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Queued Tasks Table (Section 4.3: py-[7px], px-3, hover:bg-[#ebf3ff]) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              全局实时排队任务清单 (Task Queue Depth & Priority)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            调度算法: 权重抢占式 (P0 绝对优先 &gt; P1 &gt; P2 FIFO)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap border-separate border-spacing-0">
            <thead className="text-[11px] text-slate-500 font-medium tracking-wider bg-slate-50">
              <tr>
                <th className="px-3 py-[7px] border-b border-slate-200 text-center w-[48px]">
                  #
                </th>
                <th className="px-3 py-[7px] border-b border-slate-200">排队任务标题与上下文</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-center">优先级</th>
                <th className="px-3 py-[7px] border-b border-slate-200">目标推理模型</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-right">已等待时长</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-right">预估完成时延</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-center">排队状态</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {metrics.taskQueue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    算力槽位空闲，当前无等待中的排队任务
                  </td>
                </tr>
              ) : (
                metrics.taskQueue.map((task, idx) => {
                  const isP0 = task.priority === 'P0';
                  const isP1 = task.priority === 'P1';

                  return (
                    <tr
                      key={task.id}
                      className="group hover:bg-[#ebf3ff] transition-colors"
                    >
                      <td className="px-3 py-[7px] text-center font-mono text-slate-400">
                        0{idx + 1}
                      </td>

                      <td className="px-3 py-[7px]">
                        <span className="font-bold text-slate-900">{task.title}</span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {task.id}
                        </div>
                      </td>

                      <td className="px-3 py-[7px] text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isP0
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : isP1
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      <td className="px-3 py-[7px] font-mono text-[11px] text-slate-700">
                        {task.modelTarget}
                      </td>

                      <td className="px-3 py-[7px] text-right font-mono text-slate-600">
                        {task.queuedDurationSec}s
                      </td>

                      <td className="px-3 py-[7px] text-right font-mono font-medium text-slate-800">
                        ~{task.predictedWaitMs} ms
                      </td>

                      <td className="px-3 py-[7px] text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            task.status === 'running'
                              ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse'
                              : task.status === 'throttled'
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {task.status === 'running'
                            ? '● 槽位计算中'
                            : task.status === 'throttled'
                            ? '限流降频'
                            : '队列等待'}
                        </span>
                      </td>

                      <td className="px-3 py-[7px] text-right">
                        <button
                          onClick={() => onRemoveTask(task.id)}
                          className="h-6.5 px-2 rounded-md bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-[11px] font-medium transition-colors"
                          title="从队列中取消此任务"
                        >
                          取消
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
