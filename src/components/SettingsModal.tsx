import React, { useState } from 'react';
import { Sliders, Folder, Shield, HardDrive, Check, Terminal, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  openClawPath: string;
  setOpenClawPath: (path: string) => void;
  autoHealEnabled: boolean;
  setAutoHealEnabled: (enabled: boolean) => void;
  onResetDatabase?: () => void;
  dbStats?: {
    engine: string;
    dbPath: string;
    sizeKb: number;
    journalMode: string;
    tableCounts: {
      services: number;
      emailNotifications: number;
      workflows: number;
      auditLogs: number;
      healthLogs: number;
      agentSessionOutbox: number;
    };
  } | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  openClawPath,
  setOpenClawPath,
  autoHealEnabled,
  setAutoHealEnabled,
  onResetDatabase,
  dbStats,
}) => {
  const [localPathInput, setLocalPathInput] = useState<string>(openClawPath);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setOpenClawPath(localPathInput);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">
              环境配置
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-700">
          {/* Path 1: Root directory */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-slate-500" />
              OPENCLAW 本地基准目录:
            </label>
            <input
              type="text"
              value={localPathInput}
              onChange={(e) => setLocalPathInput(e.target.value)}
              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 font-mono text-slate-800 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Auto-heal switch */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800">故障自动拉起尝试 (Auto-Heal)</div>
              <div className="text-[11px] text-slate-500">
                当检测到服务意外挂死时，尝试自动发送拉起指令
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoHealEnabled}
              onChange={(e) => setAutoHealEnabled(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
          </div>

          {/* Local SQLite3 Persistence Status */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <HardDrive className="w-3.5 h-3.5 text-emerald-700" />
                <span>本地 SQLite3 持久化存储 (替代纯内存数组)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-semibold">
                {dbStats?.journalMode || 'WAL'} 模式 · 活跃存续
              </span>
            </div>
            <div className="font-mono text-[11px] text-emerald-900/80 space-y-1 mb-2.5">
              <div>数据库路径: <span className="text-slate-800 font-semibold">{dbStats?.dbPath || './data/openclaw_hub.db'}</span></div>
              <div>引擎规范: <span className="text-slate-800 font-semibold">{dbStats?.engine || 'node:sqlite (DatabaseSync)'}</span> ({dbStats?.sizeKb || 0} KB)</div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
              <div className="bg-white/80 border border-emerald-200/60 rounded-md p-1.5">
                <div className="text-slate-500">服务状态</div>
                <div className="font-bold text-slate-800 text-xs mt-0.5">{dbStats?.tableCounts?.services ?? 0}</div>
              </div>
              <div className="bg-white/80 border border-emerald-200/60 rounded-md p-1.5">
                <div className="text-slate-500">邮件通知</div>
                <div className="font-bold text-slate-800 text-xs mt-0.5">{dbStats?.tableCounts?.emailNotifications ?? 0}</div>
              </div>
              <div className="bg-white/80 border border-emerald-200/60 rounded-md p-1.5">
                <div className="text-slate-500">业务台账</div>
                <div className="font-bold text-slate-800 text-xs mt-0.5">{dbStats?.tableCounts?.workflows ?? 0}</div>
              </div>
              <div className="bg-white/80 border border-emerald-200/60 rounded-md p-1.5">
                <div className="text-slate-500">审计日志</div>
                <div className="font-bold text-slate-800 text-xs mt-0.5">{dbStats?.tableCounts?.auditLogs ?? 0}</div>
              </div>
            </div>

            {onResetDatabase && (
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                <span className="text-[10.5px] text-emerald-800">需要清除所有测试记录？</span>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => {
                    setIsResetting(true);
                    onResetDatabase();
                    setTimeout(() => setIsResetting(false), 600);
                  }}
                  className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10.5px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isResetting ? '正在重置...' : '一键清空数据 (重置为零数据纯净基准)'}
                </button>
              </div>
            )}
          </div>

          {/* Local Probes endpoints */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">探活地址映射表:</label>
            <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-300 space-y-1">
              <div>Gateway: http://127.0.0.1:8000/v1/health</div>
              <div>ChromaDB: http://127.0.0.1:8002/api/v1/heartbeat</div>
              <div>MPS Engine: http://127.0.0.1:11434/api/version</div>
              <div>Task Broker: /tmp/openclaw_redis.sock</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{isSaved ? '已保存' : '保存设置'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
