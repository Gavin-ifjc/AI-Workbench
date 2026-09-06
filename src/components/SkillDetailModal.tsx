import React from 'react';
import {
  X,
  Boxes,
  Shield,
  FileCode,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { AgentSkill, AgentAsset } from '../types';

interface SkillDetailModalProps {
  skill: AgentSkill | null;
  agent?: AgentAsset;
  isOpen: boolean;
  onClose: () => void;
}

export const SkillDetailModal: React.FC<SkillDetailModalProps> = ({
  skill,
  agent,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !skill) return null;

  const copyContract = () => {
    const json = JSON.stringify(
      {
        skillName: skill.name,
        version: skill.version,
        agent: agent?.name,
        permission: skill.permission,
        inputSignature: skill.inputSignature,
        outputType: skill.outputType,
        checksum: skill.checksum,
      },
      null,
      2
    );
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <FileCode className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5">
                {skill.name}
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                  v{skill.version}
                </span>
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

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700">
          {/* Metadata banner */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">归属 Agent</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{agent?.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">调用权限等级</span>
              <span className="font-bold text-rose-600 mt-0.5 block">{skill.permission}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-200/60">
              <span className="text-slate-400 block text-[10px]">物理执行文件</span>
              <span className="text-slate-600 truncate block mt-0.5">{skill.filePath}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-1">功能定义与契约边界</h4>
            <p className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 leading-relaxed">
              {skill.description}
            </p>
          </div>

          {/* Input schema */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-1">输入参数签名规范 (Input Schema)</h4>
            <div className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1">
              {skill.inputSignature.length === 0 ? (
                <div className="text-slate-500">无显式传参 (Zero Argument Signature)</div>
              ) : (
                skill.inputSignature.map((arg, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-cyan-300 font-semibold">{arg.name}:</span>
                    <span className="text-amber-300 font-medium">{arg.type}</span>
                    <span className="text-slate-400 text-[10px]">{arg.description}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Output contract */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-1">输出交付契约 (Output Contract)</h4>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 font-mono text-[11px] text-indigo-700">
              {skill.outputType}
            </div>
          </div>

          {/* Non-copy full text assurance */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-800 leading-relaxed flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">严格遵循“不复制全文”原则：</span>
              <span>
                本台账仅登记元数据契约与 Checksum (
                <code className="font-mono bg-blue-100 px-1 rounded">{skill.checksum}</code>
                )，不持久化任何业务明文与长文本知识。
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <button
            onClick={copyContract}
            className="h-7 px-3 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center space-x-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已复制契约' : '复制 JSON 契约'}</span>
          </button>

          <button
            onClick={onClose}
            className="h-7 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
