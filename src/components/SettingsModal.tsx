import React, { useState } from 'react';
import { Sliders, Folder, Shield, HardDrive, Check, Terminal, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  openClawPath: string;
  setOpenClawPath: (path: string) => void;
  autoHealEnabled: boolean;
  setAutoHealEnabled: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  openClawPath,
  setOpenClawPath,
  autoHealEnabled,
  setAutoHealEnabled,
}) => {
  const [localPathInput, setLocalPathInput] = useState<string>(openClawPath);
  const [isSaved, setIsSaved] = useState<boolean>(false);

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
