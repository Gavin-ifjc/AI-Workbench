import React, { useState } from 'react';
import { Download, Copy, Check, FileText, X } from 'lucide-react';
import {
  WorkflowRegistryItem,
  WorkflowAuditLog,
  AgentSkill,
  AgentAsset,
  LocalService,
} from '../types';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflows: WorkflowRegistryItem[];
  auditLogs: WorkflowAuditLog[];
  skills: AgentSkill[];
  agents: AgentAsset[];
  services: LocalService[];
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  workflows,
  auditLogs,
  skills,
  agents,
  services,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');

  if (!isOpen) return null;

  // Generate Markdown report
  const generateMarkdown = () => {
    let md = `# OPENCLAW 独立 AI 工作台 · 协作规则台账与全景审计报告\n`;
    md += `> 生成时间: ${new Date().toLocaleString()} (Local Mac)\n`;
    md += `> 监控模式: 独立 Out-of-band 运行 (完全解耦，不复制业务全文)\n\n`;

    md += `## 1. 本地服务存续健康现状\n\n`;
    md += `| 服务名称 | 端口/协议 | 存续状态 | 连续运行时长 | 延迟 (ms) | 防丢数据重点 |\n`;
    md += `|---|---|---|---|---|---|\n`;
    services.forEach((s) => {
      md += `| ${s.name} | ${s.port}/${s.protocol} | **${s.status.toUpperCase()}** | ${s.uptime} | ${s.lastPingMs}ms | ${s.isCritical ? '是 (Critical)' : '否'} |\n`;
    });
    md += `\n`;

    md += `## 2. 11 个 Agent · Skill 资产目录 (按原则不复制全文)\n\n`;
    md += `总计收录 11 个 Agent，${skills.length} 项标准化 Skill 契约：\n\n`;
    md += `| Skill 名称 | 负责 Agent | 版本 | 权限等级 | 交付/输出规范 | 校验和 (MD5) |\n`;
    md += `|---|---|---|---|---|---|\n`;
    skills.forEach((sk) => {
      const agent = agents.find((a) => a.id === sk.agentId);
      md += `| \`${sk.name}\` | ${agent?.name || sk.agentId} | v${sk.version} | ${sk.permission} | \`${sk.outputType}\` | \`${sk.checksum}\` |\n`;
    });
    md += `\n`;

    md += `## 3. 工作流协作台账 (人可读、可核对规则)\n\n`;
    workflows.forEach((wf) => {
      md += `### ${wf.code}: ${wf.title} (${wf.version})\n`;
      md += `${wf.description}\n\n`;
      md += `**协作原则与准则：**\n`;
      wf.collaborationContractRules.forEach((r) => {
        md += `- ${r}\n`;
      });
      md += `\n**流水线阶段与责任 Agent：**\n\n`;
      md += `| 阶段序号 | 环节名称 | 负责 Agent | 交付物契约规范 | 超时限制 |\n`;
      md += `|---|---|---|---|---|\n`;
      wf.steps.forEach((st) => {
        const ag = agents.find((a) => a.id === st.assignedAgentId);
        md += `| 0${st.order} | ${st.name} | **${ag?.name || st.assignedAgentId}** | ${st.deliverableContract} | ${st.estimatedTimeoutSec}s |\n`;
      });
      md += `\n`;
    });

    md += `## 4. 变更留痕审计历史 (Audit Diff Log)\n\n`;
    auditLogs.forEach((l) => {
      md += `#### [${l.timestamp}] ${l.action} · 修改人: ${l.editor}\n`;
      md += `- **变更概要**: ${l.summary}\n`;
      md += `- **修改前 (Before)**: \`${l.diffBefore}\`\n`;
      md += `- **修改后 (After)**: \`${l.diffAfter}\`\n`;
      if (l.reason) md += `- **变更原因**: ${l.reason}\n`;
      md += `\n`;
    });

    return md;
  };

  const generateJson = () => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        environment: 'macOS Local Out-of-band Workbench',
        services,
        agents,
        skills,
        workflows,
        auditLogs,
      },
      null,
      2
    );
  };

  const content = format === 'markdown' ? generateMarkdown() : generateJson();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], {
      type: format === 'markdown' ? 'text/markdown;charset=utf-8' : 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      format === 'markdown'
        ? `openclaw-workflow-ledger-${Date.now()}.md`
        : `openclaw-workbench-snapshot-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 px-5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
              导出工作流协作台账与健康审计报告
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-mono">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  format === 'markdown'
                    ? 'bg-white text-blue-600 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Markdown (.md)
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  format === 'json'
                    ? 'bg-white text-blue-600 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                JSON 快照
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-4">
          <textarea
            readOnly
            value={content}
            className="w-full flex-1 min-h-[320px] p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 resize-none focus:outline-none"
          />
        </div>

        <div className="h-14 px-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            可直接提交至 Git 仓库作为防篡改协作台账归档
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? '已复制' : '复制全文'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 {format === 'markdown' ? '.md 台账文件' : '.json 快照'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
