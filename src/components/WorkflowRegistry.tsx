import React, { useState } from 'react';
import {
  FileSpreadsheet,
  GitPullRequest,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  Plus,
  Edit3,
  ArrowRight,
  History,
  ShieldAlert,
  Play,
  Pause,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Table as TableIcon,
  Copy,
  Check,
  Sparkles,
  Folder,
  SlidersHorizontal,
} from 'lucide-react';
import { WorkflowRegistryItem, WorkflowAuditLog, AgentAsset, WorkflowStep } from '../types';

interface WorkflowRegistryProps {
  workflows: WorkflowRegistryItem[];
  auditLogs: WorkflowAuditLog[];
  agents: AgentAsset[];
  onUpdateStepAgent: (
    workflowId: string,
    stepId: string,
    newAgentId: string,
    reason: string
  ) => void;
  onAddRule: (workflowId: string, newRule: string) => void;
  onToggleWorkflowStatus: (workflowId: string) => void;
}

// 稳定 Agent 分色映射 (满足需求：main=蓝/程建=靛/苏念=紫/林栀=翡翠/沈清韵=粉/陆远=橙/何超=琥珀/李晓=青/陈睿=玫红/郑铭=蓝绿/王总=金)
const AGENT_STYLE_MAP: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    chipBg: string;
    chipBorder: string;
    dot: string;
  }
> = {
  main: {
    bg: 'bg-blue-50/80',
    text: 'text-blue-700',
    border: 'border-blue-200',
    chipBg: 'bg-blue-100/80 text-blue-800',
    chipBorder: 'border-blue-200',
    dot: 'bg-blue-600',
  },
  'project-director': {
    bg: 'bg-indigo-50/80',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    chipBg: 'bg-indigo-100/80 text-indigo-800',
    chipBorder: 'border-indigo-200',
    dot: 'bg-indigo-600',
  },
  'bd-assistant': {
    bg: 'bg-purple-50/80',
    text: 'text-purple-700',
    border: 'border-purple-200',
    chipBg: 'bg-purple-100/80 text-purple-800',
    chipBorder: 'border-purple-200',
    dot: 'bg-purple-600',
  },
  'finance-director': {
    bg: 'bg-emerald-50/80',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    chipBg: 'bg-emerald-100/80 text-emerald-800',
    chipBorder: 'border-emerald-200',
    dot: 'bg-emerald-600',
  },
  'contract-specialist': {
    bg: 'bg-pink-50/80',
    text: 'text-pink-700',
    border: 'border-pink-200',
    chipBg: 'bg-pink-100/80 text-pink-800',
    chipBorder: 'border-pink-200',
    dot: 'bg-pink-600',
  },
  'tender-specialist': {
    bg: 'bg-orange-50/80',
    text: 'text-orange-700',
    border: 'border-orange-200',
    chipBg: 'bg-orange-100/80 text-orange-800',
    chipBorder: 'border-orange-200',
    dot: 'bg-orange-600',
  },
  'coating-specialist': {
    bg: 'bg-amber-50/80',
    text: 'text-amber-700',
    border: 'border-amber-200',
    chipBg: 'bg-amber-100/80 text-amber-800',
    chipBorder: 'border-amber-200',
    dot: 'bg-amber-600',
  },
  'document-formatter': {
    bg: 'bg-cyan-50/80',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    chipBg: 'bg-cyan-100/80 text-cyan-800',
    chipBorder: 'border-cyan-200',
    dot: 'bg-cyan-600',
  },
  'ifjc-engineer': {
    bg: 'bg-fuchsia-50/80',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200',
    chipBg: 'bg-fuchsia-100/80 text-fuchsia-800',
    chipBorder: 'border-fuchsia-200',
    dot: 'bg-fuchsia-600',
  },
  'hdpe-specialist': {
    bg: 'bg-teal-50/80',
    text: 'text-teal-700',
    border: 'border-teal-200',
    chipBg: 'bg-teal-100/80 text-teal-800',
    chipBorder: 'border-teal-200',
    dot: 'bg-teal-600',
  },
};

// 角色性质配置: plan=🎯计划 review=🔍审核 deliver=📦交付 support=🔧支持
const ROLE_BADGE_CONFIG: Record<
  string,
  {
    label: string;
    icon: string;
    badgeClass: string;
    borderClass: string;
    subText: string;
  }
> = {
  plan: {
    label: '🎯 计划',
    icon: '🎯',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    borderClass: 'border-blue-300',
    subText: '任务分解 / 前置策划',
  },
  review: {
    label: '🔍 审核',
    icon: '🔍',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    borderClass: 'border-violet-300',
    subText: '条款把关 / 决策拍板',
  },
  deliver: {
    label: '📦 交付',
    icon: '📦',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-300',
    subText: '实体产出 / 归档落盘',
  },
  support: {
    label: '🔧 支持',
    icon: '🔧',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    borderClass: 'border-amber-300',
    subText: '技术辅助 / 排版保障',
  },
};

// 时长转换人类可读格式 (e.g. 1800 -> 30分钟, 86400 -> 24小时)
const formatTimeoutHuman = (sec: number): string => {
  if (!sec || sec <= 0) return '未设时限';
  if (sec < 3600) return `${Math.round(sec / 60)}分钟`;
  if (sec < 86400) return `${Math.round(sec / 3600)}小时`;
  const days = Math.round(sec / 86400);
  return `${days}天 (${Math.round(sec / 3600)}h)`;
};

export const WorkflowRegistry: React.FC<WorkflowRegistryProps> = ({
  workflows,
  auditLogs,
  agents,
  onUpdateStepAgent,
  onAddRule,
  onToggleWorkflowStatus,
}) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(workflows[0]?.id || 'wf-01');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'flowchart' | 'table'>('flowchart');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<{
    workflowId: string;
    stepId: string;
    stepName: string;
    currentAgentId: string;
  } | null>(null);
  const [newAgentId, setNewAgentId] = useState<string>('');
  const [changeReason, setChangeReason] = useState<string>('');
  const [newRuleInput, setNewRuleInput] = useState<string>('');
  const [isAddingRule, setIsAddingRule] = useState<boolean>(false);

  const activeWorkflow = workflows.find((w) => w.id === selectedWorkflowId) || workflows[0];

  // 默认选中的步骤（若当前没选或切了工作流，选第一步）
  const currentStep =
    activeWorkflow?.steps.find((s) => s.id === selectedStepId) || activeWorkflow?.steps[0];

  // 获取 Agent 呈现信息与样式
  const getAgentInfo = (agentId: string) => {
    const matchedAgent = agents.find((a) => a.id === agentId);
    const agentName = matchedAgent?.name || agentId;

    // 王总特殊金色
    if (agentName.includes('王总') || agentId === 'wang') {
      return {
        name: '王总',
        role: '最终裁决与拍板',
        style: {
          bg: 'bg-amber-50/90',
          text: 'text-amber-900',
          border: 'border-amber-300',
          chipBg: 'bg-amber-100 text-amber-950 font-bold',
          chipBorder: 'border-amber-300',
          dot: 'bg-amber-600',
        },
      };
    }

    const style =
      AGENT_STYLE_MAP[agentId] || {
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        border: 'border-slate-200',
        chipBg: 'bg-slate-100 text-slate-700',
        chipBorder: 'border-slate-200',
        dot: 'bg-slate-500',
      };

    return {
      name: agentName,
      role: matchedAgent?.role || '协同 Agent',
      style,
    };
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleOpenEdit = (
    workflowId: string,
    stepId: string,
    stepName: string,
    currentAgentId: string
  ) => {
    setEditingStep({ workflowId, stepId, stepName, currentAgentId });
    setNewAgentId(currentAgentId);
    setChangeReason('');
    setIsEditModalOpen(true);
  };

  const handleConfirmEdit = () => {
    if (!editingStep || !newAgentId) return;
    onUpdateStepAgent(
      editingStep.workflowId,
      editingStep.stepId,
      newAgentId,
      changeReason || '优化业务协同分工，明确执行与审查权责'
    );
    setIsEditModalOpen(false);
  };

  const handleSaveRule = () => {
    if (!newRuleInput.trim()) return;
    onAddRule(activeWorkflow.id, newRuleInput.trim());
    setNewRuleInput('');
    setIsAddingRule(false);
  };

  // 统计各个角色的环节数
  const roleCounts = {
    plan: activeWorkflow?.steps.filter((s) => s.role === 'plan').length || 0,
    review: activeWorkflow?.steps.filter((s) => s.role === 'review').length || 0,
    deliver: activeWorkflow?.steps.filter((s) => s.role === 'deliver').length || 0,
    support: activeWorkflow?.steps.filter((s) => s.role === 'support').length || 0,
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>业务台账与协同工作流</span>
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                5条权威工作流 / 29个执行环节
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              王总全局任务拆解全景视图：一眼看懂谁计划、谁审核、谁交付，以及落地存储归档位置。
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-800 font-mono">
              {auditLogs.length} 条审计留痕
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Flowchart & Blueprint, Right: Audit Diff Log */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left 2 Cols: Active Workflow Blueprint & Stage Matrix */}
        <div className="xl:col-span-2 space-y-4">
          {workflows.length === 0 || !activeWorkflow ? (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-12 text-center text-slate-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">暂无登记的协同工作流</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                系统未查询到已持久化的工作流登记项。
              </p>
            </div>
          ) : (
            <>
              {/* Workflow Selector Tabs */}
              <div className="flex items-center space-x-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
                {workflows.map((wf) => {
                  const isSelected = wf.id === selectedWorkflowId;
                  return (
                    <button
                      key={wf.id}
                      onClick={() => {
                        setSelectedWorkflowId(wf.id);
                        setSelectedStepId(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center space-x-2 ${
                        isSelected
                          ? 'bg-white text-slate-900 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200/60 font-bold">
                        {wf.code}
                      </span>
                      <span>{wf.title}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          wf.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Active Workflow Blueprint Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-4 space-y-4">
                {/* Header info */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {activeWorkflow.code}
                      </span>
                      <h3 className="text-sm font-black text-slate-900">{activeWorkflow.title}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {activeWorkflow.version}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          activeWorkflow.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {activeWorkflow.status === 'ACTIVE' ? '● 正在执行' : '暂停调度'}
                      </span>
                      {activeWorkflow.leadResponsibleAgent && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <span>👑 牵头主管:</span>
                          <strong>{getAgentInfo(activeWorkflow.leadResponsibleAgent).name}</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">{activeWorkflow.description}</p>
                  </div>

                  {/* Right Actions: View Toggle + Pause/Play */}
                  <div className="flex items-center space-x-2">
                    {/* View Switcher: Flowchart vs Table */}
                    <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                      <button
                        onClick={() => setViewMode('flowchart')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                          viewMode === 'flowchart'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="切换为流程图视图"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>流程图</span>
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                          viewMode === 'table'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="切换为表格矩阵视图"
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>矩阵表</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onToggleWorkflowStatus(activeWorkflow.id)}
                      className="h-7.5 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium flex items-center space-x-1"
                    >
                      {activeWorkflow.status === 'ACTIVE' ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-amber-600" />
                          <span>暂停</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-600" />
                          <span>恢复</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Role Summary Legend Bar */}
                <div className="flex items-center justify-between flex-wrap gap-2 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs">
                  <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                    <span className="font-bold text-slate-700">流转权责拆解:</span>
                    <span className="font-mono text-slate-400">共 {activeWorkflow.steps.length} 个环节</span>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold flex items-center gap-1">
                      <span>🎯 计划:</span>
                      <strong className="font-mono">{roleCounts.plan}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 font-semibold flex items-center gap-1">
                      <span>🔍 审核:</span>
                      <strong className="font-mono">{roleCounts.review}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                      <span>📦 交付:</span>
                      <strong className="font-mono">{roleCounts.deliver}</strong>
                    </span>
                    {roleCounts.support > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1">
                        <span>🔧 支持:</span>
                        <strong className="font-mono">{roleCounts.support}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* 1. FLOWCHART PIPELINE VIEW (MAIN WORKSPACE REPLACEMENT)   */}
                {/* ========================================================= */}
                {viewMode === 'flowchart' ? (
                  <div className="space-y-4">
                    {/* Pipeline Canvas Container */}
                    <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/80 overflow-x-auto">
                      <div className="flex items-center gap-2 min-w-max pb-2">
                        {activeWorkflow.steps.map((step, index) => {
                          const agentInfo = getAgentInfo(step.assignedAgentId);
                          const roleInfo = step.role ? ROLE_BADGE_CONFIG[step.role] : null;
                          const isSelected = (currentStep?.id || activeWorkflow.steps[0].id) === step.id;
                          const isLast = index === activeWorkflow.steps.length - 1;

                          // 状态指示
                          const isRunning = step.status === 'IN_PROGRESS';
                          const isCompleted = step.status === 'COMPLETED';

                          return (
                            <React.Fragment key={step.id}>
                              {/* Step Node Card */}
                              <div
                                onClick={() => setSelectedStepId(step.id)}
                                className={`group relative w-60 shrink-0 p-3 rounded-xl border bg-white transition-all cursor-pointer select-none ${
                                  isSelected
                                    ? 'ring-2 ring-blue-500 border-blue-400 shadow-md bg-gradient-to-b from-blue-50/20 to-white'
                                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                                }`}
                              >
                                {/* Top Row: Index + Role Badge + Status Indicator */}
                                <div className="flex items-center justify-between gap-1 mb-2">
                                  <div className="flex items-center space-x-1.5">
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black ${
                                        isSelected
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      0{step.order}
                                    </span>

                                    {/* 角色徽章 (🎯计划/🔍审核/📦交付/🔧支持) */}
                                    {roleInfo && (
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${roleInfo.badgeClass}`}
                                      >
                                        {roleInfo.label}
                                      </span>
                                    )}
                                  </div>

                                  {/* Status Dot */}
                                  <div className="flex items-center space-x-1 shrink-0" title={`状态: ${step.status}`}>
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        isRunning
                                          ? 'bg-blue-500 animate-ping'
                                          : isCompleted
                                          ? 'bg-emerald-500'
                                          : 'bg-slate-300'
                                      }`}
                                    />
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {isRunning ? '执行中' : isCompleted ? '已交付' : '就绪'}
                                    </span>
                                  </div>
                                </div>

                                {/* Step Title */}
                                <h4
                                  className={`text-xs font-bold line-clamp-1 leading-snug mb-2 ${
                                    isSelected ? 'text-blue-950' : 'text-slate-800 group-hover:text-blue-600'
                                  }`}
                                  title={step.name}
                                >
                                  {step.name}
                                </h4>

                                {/* Assigned Agent Card Pill (分色) */}
                                <div
                                  className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-1.5 mb-2 ${agentInfo.style.bg} ${agentInfo.style.border}`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-1">
                                      <span className={`w-1.5 h-1.5 rounded-full ${agentInfo.style.dot}`} />
                                      <span className="text-[10px] text-slate-400 font-medium">责任人:</span>
                                      <strong
                                        className={`font-bold truncate text-[11.5px] ${agentInfo.style.text}`}
                                      >
                                        {agentInfo.name}
                                      </strong>
                                    </div>
                                    <div className="text-[9.5px] text-slate-500 truncate mt-0.5">
                                      {agentInfo.role}
                                    </div>
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEdit(
                                        activeWorkflow.id,
                                        step.id,
                                        step.name,
                                        step.assignedAgentId
                                      );
                                    }}
                                    className="p-1 rounded bg-white/90 hover:bg-white text-slate-500 hover:text-blue-600 border border-slate-200/80 shadow-2xs transition-colors shrink-0"
                                    title="调整责任 Agent"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Bottom Deliverable Spec Snippet */}
                                <div className="text-[10.5px] text-slate-500 bg-slate-50/80 p-1.5 rounded border border-slate-100 font-mono">
                                  <div className="flex items-center justify-between text-[9.5px] text-slate-400 mb-0.5">
                                    <span>交付物规范:</span>
                                    <span>⏱️ {formatTimeoutHuman(step.estimatedTimeoutSec)}</span>
                                  </div>
                                  <div className="truncate text-slate-700 font-semibold" title={step.deliverableContract}>
                                    {step.deliverableContract}
                                  </div>
                                </div>
                              </div>

                              {/* Flow Connector Arrow */}
                              {!isLast && (
                                <div className="flex flex-col items-center justify-center shrink-0 px-1">
                                  <div className="w-6 h-0.5 bg-slate-300 relative flex items-center justify-center">
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 absolute -right-2" />
                                  </div>
                                  <span className="text-[9px] font-mono text-slate-400 mt-1">流转</span>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step Inspection Card: 谁计划、谁审核、谁交付、交付在哪里 */}
                    {currentStep && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/90 shadow-xs space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-600 text-white">
                              环节 0{currentStep.order} 详述
                            </span>
                            <h4 className="text-xs font-black text-slate-900">{currentStep.name}</h4>
                            {currentStep.role && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  ROLE_BADGE_CONFIG[currentStep.role]?.badgeClass
                                }`}
                              >
                                {ROLE_BADGE_CONFIG[currentStep.role]?.label} ·{' '}
                                {ROLE_BADGE_CONFIG[currentStep.role]?.subText}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] text-slate-500">
                              超时时限: <strong className="text-slate-800 font-mono">{formatTimeoutHuman(currentStep.estimatedTimeoutSec)}</strong>
                            </span>
                            <button
                              onClick={() =>
                                handleOpenEdit(
                                  activeWorkflow.id,
                                  currentStep.id,
                                  currentStep.name,
                                  currentStep.assignedAgentId
                                )
                              }
                              className="h-6.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center space-x-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>转派责任 Agent</span>
                            </button>
                          </div>
                        </div>

                        {/* 4 Pillars Grid: 谁计划/审核/交付 + 交付物契约 + 落地路径 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          {/* Pillar 1: 责任人与职能 */}
                          <div className="p-3 rounded-lg bg-white border border-slate-200/80 space-y-1">
                            <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>责任归属 Agent</span>
                            </div>
                            {(() => {
                              const info = getAgentInfo(currentStep.assignedAgentId);
                              return (
                                <div>
                                  <div className="text-sm font-bold text-slate-900 mt-0.5">{info.name}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">{info.role}</div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Pillar 2: 交付物契约 */}
                          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80 space-y-1">
                            <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>交付物契约规范 (Contract)</span>
                            </div>
                            <div className="text-xs font-mono font-bold text-emerald-950 mt-0.5 leading-snug">
                              {currentStep.deliverableContract}
                            </div>
                          </div>

                          {/* Pillar 3: 落地落盘位置 */}
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                            <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Folder className="w-3.5 h-3.5 text-indigo-600" />
                                <span>实体产出落地目录</span>
                              </span>
                              {activeWorkflow.outputPath && (
                                <button
                                  onClick={() => handleCopy(activeWorkflow.outputPath || '', 'outputPath')}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                                  title="复制路径"
                                >
                                  {copiedKey === 'outputPath' ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-600">已复制</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>复制</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="text-[11px] font-mono font-semibold text-slate-700 truncate mt-0.5">
                              {activeWorkflow.outputPath || '无独立路径定义'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ========================================================= */
                  /* 2. TABLE MATRIX VIEW (FALLBACK MATRIX)                    */
                  /* ========================================================= */
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-800">
                        环节责任人与契约矩阵
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        最后核对: {activeWorkflow.updatedAt}
                      </span>
                    </div>

                    <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left whitespace-nowrap border-separate border-spacing-0">
                        <thead className="text-[11px] text-slate-500 font-medium tracking-wider bg-slate-50">
                          <tr>
                            <th className="px-3 py-[7px] border-b border-slate-200 text-center w-[48px]">
                              环节
                            </th>
                            <th className="px-3 py-[7px] border-b border-slate-200">环节性质</th>
                            <th className="px-3 py-[7px] border-b border-slate-200">环节名称</th>
                            <th className="px-3 py-[7px] border-b border-slate-200">唯一责任 Agent</th>
                            <th className="px-3 py-[7px] border-b border-slate-200">交付物契约规范</th>
                            <th className="px-3 py-[7px] border-b border-slate-200 text-center">状态</th>
                            <th className="px-3 py-[7px] border-b border-slate-200 text-right">超时</th>
                            <th className="px-3 py-[7px] border-b border-slate-200 text-right">调配</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {activeWorkflow.steps.map((step) => {
                            const agentInfo = getAgentInfo(step.assignedAgentId);
                            const roleInfo = step.role ? ROLE_BADGE_CONFIG[step.role] : null;

                            return (
                              <tr
                                key={step.id}
                                className="group hover:bg-[#ebf3ff] transition-colors"
                              >
                                <td className="px-3 py-[7px] text-center font-mono font-bold text-blue-600 bg-blue-50/40">
                                  0{step.order}
                                </td>
                                <td className="px-3 py-[7px]">
                                  {roleInfo ? (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleInfo.badgeClass}`}>
                                      {roleInfo.label}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-[7px]">
                                  <span className="font-bold text-slate-900">{step.name}</span>
                                </td>
                                <td className="px-3 py-[7px]">
                                  <div className="flex items-center space-x-1.5">
                                    <span className={`font-semibold px-1.5 py-0.2 rounded text-[11px] ${agentInfo.style.chipBg}`}>
                                      {agentInfo.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                                      {agentInfo.role}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-[7px] font-mono text-[11px] text-slate-600">
                                  {step.deliverableContract}
                                </td>
                                <td className="px-3 py-[7px] text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      step.status === 'IN_PROGRESS'
                                        ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse'
                                        : step.status === 'COMPLETED'
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {step.status === 'IN_PROGRESS'
                                      ? '执行中'
                                      : step.status === 'COMPLETED'
                                      ? '已交付'
                                      : '等待触发'}
                                  </span>
                                </td>
                                <td className="px-3 py-[7px] text-right font-mono text-slate-500">
                                  {formatTimeoutHuman(step.estimatedTimeoutSec)}
                                </td>
                                <td className="px-3 py-[7px] text-right">
                                  <button
                                    onClick={() =>
                                      handleOpenEdit(
                                        activeWorkflow.id,
                                        step.id,
                                        step.name,
                                        step.assignedAgentId
                                      )
                                    }
                                    className="h-6.5 px-2 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium transition-colors flex items-center space-x-1 inline-flex"
                                  >
                                    <Edit3 className="w-3 h-3 text-slate-500" />
                                    <span>转派</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bottom Helper Info: 产出落地路径 & 协作契约规则 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* 产出落地路径 */}
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-blue-600" />
                        统一产出落地归档路径
                      </span>
                      {activeWorkflow.outputPath && (
                        <button
                          onClick={() => handleCopy(activeWorkflow.outputPath || '', 'bottom-output')}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                        >
                          {copiedKey === 'bottom-output' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">已复制路径</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>复制完整路径</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-700 select-all break-all">
                      {activeWorkflow.outputPath || '无独立路径定义'}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      所有相关业务分析报告、报价草案、合同审查稿件必须统一落盘至该工作目录。
                    </p>
                  </div>

                  {/* 协作契约规则 */}
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        协作契约铁律准则
                      </span>
                      <button
                        onClick={() => setIsAddingRule(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>添加准则</span>
                      </button>
                    </div>

                    <ul className="space-y-1 text-xs text-slate-600 max-h-40 overflow-y-auto pr-1">
                      {activeWorkflow.collaborationContractRules.map((rule, idx) => (
                        <li key={idx} className="flex items-start space-x-2 leading-relaxed">
                          <span className="text-blue-500 font-bold font-mono shrink-0">[{idx + 1}]</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>

                    {isAddingRule && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                        <input
                          type="text"
                          value={newRuleInput}
                          onChange={(e) => setNewRuleInput(e.target.value)}
                          placeholder="输入协作契约规则..."
                          className="flex-1 h-7 bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-400"
                        />
                        <button
                          onClick={handleSaveRule}
                          className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setIsAddingRule(false)}
                          className="h-7 px-2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right 1 Col: Audit Diff Log Panel */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-800">变更留痕 (Audit Diff Log)</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{auditLogs.length} 条流水</span>
            </div>

            <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <p className="text-slate-500 font-medium">暂无变更留痕流水</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    系统已清空模拟数据。转派责任人或更新规则后将在此自动留存审计 Diff。
                  </p>
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1.5 text-xs text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px]">{log.summary}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-2">
                      <span>操作人: {log.editor}</span>
                      <span>•</span>
                      <span className="text-blue-600 font-semibold">{log.action}</span>
                    </div>

                    {/* Diff Before vs After */}
                    <div className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-[10px] space-y-1">
                      <div className="text-rose-700 bg-rose-50/60 p-1 rounded">
                        - {log.diffBefore}
                      </div>
                      <div className="text-emerald-700 bg-emerald-50/60 p-1 rounded">
                        + {log.diffAfter}
                      </div>
                    </div>

                    {log.reason && (
                      <div className="text-[10px] text-slate-500 italic">理由: {log.reason}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Agent Modal */}
      {isEditModalOpen && editingStep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-10 px-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800">
                  调整环节责任 Agent 归属并记录审计 Diff
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">当前环节名称:</label>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-bold text-slate-800 font-mono">
                  {editingStep.stepName}
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">
                  重新指派责任 Agent:
                </label>
                <select
                  value={newAgentId}
                  onChange={(e) => setNewAgentId(e.target.value)}
                  className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-400"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">
                  变更原因登记 (必填，写入审计 Diff 留痕):
                </label>
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="例如：'由程建负责总控更符合业务线索推进流程'..."
                  className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="h-[26px] px-3 rounded-md bg-white border border-slate-200 text-slate-600 text-xs hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirmEdit}
                className="h-[26px] px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                确认变更并生成审计 Diff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

