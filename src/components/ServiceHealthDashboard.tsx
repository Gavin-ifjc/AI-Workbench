import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Play,
  RotateCcw,
  Server,
  ShieldAlert,
  Terminal,
  Zap,
  Check,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { LocalService, HealthLogEntry } from '../types';

interface ServiceHealthDashboardProps {
  services: LocalService[];
  logs: HealthLogEntry[];
  onRestartService: (serviceId: string) => void;
  onSimulateCrash: (serviceId: string) => void;
  onProbeService: (serviceId: string) => void;
  onClearLogs: () => void;
  pollIntervalSec: number;
  setPollIntervalSec: (sec: number) => void;
}

export const ServiceHealthDashboard: React.FC<ServiceHealthDashboardProps> = ({
  services,
  logs,
  onRestartService,
  onSimulateCrash,
  onProbeService,
  onClearLogs,
  pollIntervalSec,
  setPollIntervalSec,
}) => {
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn'>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const downServices = services.filter((s) => s.status === 'down');
  const degradedServices = services.filter((s) => s.status === 'degraded');
  const healthyServices = services.filter((s) => s.status === 'healthy');

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'error') return log.level === 'error' || log.level === 'fatal';
    if (logFilter === 'warn')
      return log.level === 'warn' || log.level === 'error' || log.level === 'fatal';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Critical Alert Banner if down services */}
      {downServices.length > 0 && (
        <div
          id="banner-critical-service-down"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-pulse"
        >
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-900">
                  🚨 本地核心服务异常中断！(已启动最高级丢数据预警)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-600 text-white font-mono font-bold">
                  {downServices.length} 个离线
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                中断服务:{' '}
                <span className="font-semibold text-rose-900">
                  {downServices.map((s) => `${s.name} (Port ${s.port})`).join(', ')}
                </span>
                。注意：历史曾发生持久化中断事故，内存池若未刷盘将导致向量与消息丢失！
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {downServices.map((s) => (
              <button
                key={s.id}
                onClick={() => onRestartService(s.id)}
                className="h-7.5 px-3 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>立即拉起 {s.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Stats Strip (Light Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: System Availability */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              SYSTEM AVAILABILITY
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {Math.round((healthyServices.length / services.length) * 100)}%
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {healthyServices.length} / {services.length} 服务正常存续
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Anti-Data Loss Sentinel */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                DATA LOSS PREVENTION
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
              零丢数据防护
            </div>
            <span className="text-[11px] text-slate-500">WAL 快照与双重探针在线</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Avg Probe Latency */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              AVG PROBE LATENCY
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {Math.round(
                services.reduce((acc, s) => acc + (s.status === 'down' ? 0 : s.lastPingMs), 0) /
                  (healthyServices.length || 1)
              )}{' '}
              <span className="text-xs text-slate-500 font-normal">ms</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">本地 Mac 回环 IPC / Socket</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Polling Interval Controller */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              POLLING FREQUENCY
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold">
              每 {pollIntervalSec}s
            </span>
          </div>
          <div className="flex items-center space-x-1.5 mt-2">
            {[2, 5, 10, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => setPollIntervalSec(sec)}
                className={`flex-1 py-1 rounded-lg text-xs font-mono transition-colors ${
                  pollIntervalSec === sec
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Services Table Matrix (High Density Specification: py-[7px], px-3, hover:bg-[#ebf3ff]) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
        {/* Table Header Section */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              本地服务存续探活矩阵 (Local Service Health Matrix)
            </h2>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
            <span>隔离监控进程: PID 10422</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">零侵入 Out-of-band</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap border-separate border-spacing-0">
            <thead className="text-[11px] text-slate-500 font-medium tracking-wider sticky top-0 z-[60]">
              <tr className="bg-slate-50/95 backdrop-blur-sm">
                <th className="px-3 py-[7px] border-b border-slate-200 text-center sticky left-0 z-[70] bg-slate-50/95 w-[48px]">
                  #
                </th>
                <th className="px-3 py-[7px] border-b border-slate-200 sticky left-[48px] z-[70] bg-slate-50/95 min-w-[220px]">
                  服务名称与角色
                </th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-center">端口 / 协议</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-center">PID 标识</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-center">存续健康状态</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-right">探活延迟 (ms)</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-right">内存占用</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-right">运行时长</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-center">最后心跳时间</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-right">治理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {services.map((srv, idx) => {
                const isDown = srv.status === 'down';
                const isDegraded = srv.status === 'degraded';

                return (
                  <tr
                    key={srv.id}
                    onClick={() => setSelectedServiceId(srv.id)}
                    className="group hover:bg-[#ebf3ff] cursor-pointer transition-colors"
                  >
                    {/* Index */}
                    <td className="px-3 py-[7px] text-center font-mono text-slate-400 sticky left-0 z-20 bg-white group-hover:bg-[#ebf3ff]">
                      0{idx + 1}
                    </td>

                    {/* Service Name */}
                    <td className="px-3 py-[7px] sticky left-[48px] z-20 bg-white group-hover:bg-[#ebf3ff]">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 group-hover:text-blue-700">
                          {srv.name}
                        </span>
                        {srv.isCritical && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-200 font-mono">
                            Critical
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[240px]">
                        {srv.path}
                      </div>
                    </td>

                    {/* Port & Protocol */}
                    <td className="px-3 py-[7px] text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {srv.port}/{srv.protocol}
                      </span>
                    </td>

                    {/* PID */}
                    <td className="px-3 py-[7px] text-center font-mono text-slate-600">
                      {srv.pid}
                    </td>

                    {/* Status with Breathing Light */}
                    <td className="px-3 py-[7px] text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isDown
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : isDegraded
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isDown
                              ? 'bg-rose-600'
                              : isDegraded
                              ? 'bg-amber-500'
                              : 'bg-emerald-500 animate-ping'
                          }`}
                        />
                        {isDown ? '挂死 (DOWN)' : isDegraded ? '降级' : '健康存续'}
                      </span>
                    </td>

                    {/* Latency with mini sparkline bar */}
                    <td className="px-3 py-[7px] text-right font-mono font-medium">
                      <div className="flex items-center justify-end space-x-1.5">
                        <span className={isDown ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                          {isDown ? 'TIMEOUT' : `${srv.lastPingMs} ms`}
                        </span>
                        {!isDown && (
                          <div className="w-10 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, (srv.lastPingMs / 80) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Memory */}
                    <td className="px-3 py-[7px] text-right font-mono text-slate-700">
                      {srv.memoryMb > 1024
                        ? `${(srv.memoryMb / 1024).toFixed(1)} GB`
                        : `${srv.memoryMb} MB`}
                    </td>

                    {/* Uptime */}
                    <td className="px-3 py-[7px] text-right font-mono text-slate-600">
                      {srv.uptime}
                    </td>

                    {/* Last Heartbeat */}
                    <td className="px-3 py-[7px] text-center font-mono text-slate-400 text-[11px]">
                      {srv.lastHeartbeat}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-[7px] text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onProbeService(srv.id)}
                          className="h-6.5 px-2 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium transition-colors"
                          title="非阻塞即刻探活"
                        >
                          探活
                        </button>
                        <button
                          onClick={() => onRestartService(srv.id)}
                          className="h-6.5 px-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-[11px] font-semibold transition-colors flex items-center space-x-1"
                          title="重启服务"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{isDown ? '拉起' : '重启'}</span>
                        </button>
                        <button
                          onClick={() => onSimulateCrash(srv.id)}
                          className={`h-6.5 px-2 rounded-md border text-[10px] font-mono transition-colors ${
                            isDown
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                          }`}
                          title={isDown ? '恢复服务' : '模拟进程挂死，测试告警'}
                        >
                          {isDown ? '恢复' : '模拟崩溃'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightweight Health Audit Logs (Non-Fulltext Log Viewer) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              轻量健康日志流 (Lightweight Health Audit Logs)
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">
              原则：不复制业务全文 · 仅记录心跳/时延/存续/风险
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setLogFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  logFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                全部 ({logs.length})
              </button>
              <button
                onClick={() => setLogFilter('warn')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  logFilter === 'warn'
                    ? 'bg-amber-50 text-amber-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                告警/异常
              </button>
              <button
                onClick={() => setLogFilter('error')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  logFilter === 'error'
                    ? 'bg-rose-50 text-rose-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                致命错误
              </button>
            </div>

            <button
              onClick={onClearLogs}
              className="h-7 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium transition-colors"
            >
              清空
            </button>
          </div>
        </div>

        {/* Clean Log Stream Viewer */}
        <div className="rounded-lg bg-slate-900 text-slate-200 p-3 font-mono text-xs max-h-60 overflow-y-auto space-y-1.5 shadow-inner">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              暂无符合条件的轻量探活日志记录
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isError = log.level === 'error' || log.level === 'fatal';
              const isWarn = log.level === 'warn';

              return (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-2 py-0.5 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 px-1 rounded transition-colors"
                >
                  <div className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-slate-500 shrink-0 text-[11px]">[{log.timestamp}]</span>
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-black uppercase shrink-0 ${
                        isError
                          ? 'bg-rose-900/60 text-rose-300'
                          : isWarn
                          ? 'bg-amber-900/60 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-blue-400 font-bold shrink-0">{log.serviceName}:</span>
                    <span
                      className={`text-xs ${
                        isError ? 'text-rose-200' : isWarn ? 'text-amber-200' : 'text-slate-300'
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 text-[11px]">
                    {log.lossRisk && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[9px]">
                        丢数据风险
                      </span>
                    )}
                    <span className="text-slate-400">{log.latencyMs}ms</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
