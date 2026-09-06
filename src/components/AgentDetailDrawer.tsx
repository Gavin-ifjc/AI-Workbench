import React from 'react';
import {
  X,
  Boxes,
  Shield,
  Clock,
  FolderGit2,
  FileCode,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AgentAsset, AgentSkill } from '../types';

interface AgentDetailDrawerProps {
  agent: AgentAsset | null;
  skills: AgentSkill[];
  isOpen: boolean;
  onClose: () => void;
  onSelectSkill: (skill: AgentSkill) => void;
}

export const AgentDetailDrawer: React.FC<AgentDetailDrawerProps> = ({
  agent,
  skills,
  isOpen,
  onClose,
  onSelectSkill,
}) => {
  if (!isOpen || !agent) return null;

  const agentSkills = skills.filter((s) => s.agentId === agent.id);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] h-full bg-white shadow-2xl border-l border-slate-200/80 flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs">
              {agent.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-800 font-mono">{agent.name}</h2>
                <span
                  className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${
                    agent.activeStatus === 'running'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {agent.activeStatus === 'running' ? '● 活跃就绪' : '待命'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{agent.role}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">系统职责分类</span>
              <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                {agent.category} 核心节点
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">已挂载 Skill 资产</span>
              <span className="font-semibold text-blue-600 mt-0.5 block">
                {agentSkills.length} 个规范函数
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200/50">
              <span className="text-[10px] text-slate-400 block uppercase">物理代码目录</span>
              <span className="text-slate-600 text-[11px] truncate block mt-0.5">
                {agent.skillsDir}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              职责边界与职能定义
            </h3>
            <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
              {agent.description}
            </p>
          </div>

          {/* Key Responsibilities */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              契约负责事项 (Responsibilities)
            </h3>
            <div className="space-y-1.5">
              {agent.responsibilities.map((resp, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center space-x-2 text-slate-700"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>{resp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bound Skills List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                所辖 Skill 资产清单 (遵循不复制全文原则)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                最后巡检: {agent.lastScanned}
              </span>
            </div>

            <div className="space-y-2">
              {agentSkills.map((sk) => (
                <div
                  key={sk.id}
                  onClick={() => onSelectSkill(sk)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-[#ebf3ff]/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs font-mono text-slate-800 group-hover:text-blue-600">
                        {sk.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                        v{sk.version}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                        sk.permission === 'SYSTEM_EXEC'
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : sk.permission === 'FILE_WRITE'
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {sk.permission}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{sk.description}</p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                    <span>in: {sk.inputSignature.map((p) => p.name).join(', ') || 'none'}</span>
                    <span>md5:{sk.checksum}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="h-14 px-6 border-t border-slate-100 flex items-center justify-end bg-slate-50/60">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs shadow-xs"
          >
            关闭抽屉
          </button>
        </div>
      </div>
    </div>
  );
};
