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
} from 'lucide-react';
import { WorkflowRegistryItem, WorkflowAuditLog, AgentAsset } from '../types';

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

export const WorkflowRegistry: React.FC<WorkflowRegistryProps> = ({
  workflows,
  auditLogs,
  agents,
  onUpdateStepAgent,
  onAddRule,
  onToggleWorkflowStatus,
}) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(workflows[0]?.id || 'wf-01');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
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

  const handleOpenEdit = (workflowId: string, stepId: string, stepName: string, currentAgentId: string) => {
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
      changeReason || '规范责任划分，防止流程篡改'
    );
    setIsEditModalOpen(false);
  };

  const handleSaveRule = () => {
    if (!newRuleInput.trim()) return;
    onAddRule(activeWorkflow.id, newRuleInput.trim());
    setNewRuleInput('');
    setIsAddingRule(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Description Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-800">
            工作流台账
          </h2>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-800 font-mono">
              {auditLogs.length} 条变更记录
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Tabs & Workflow Detail, Right: Audit Diff Log */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left 2 Cols: Active Workflow Blueprint & Stage Matrix */}
        <div className="xl:col-span-2 space-y-4">
          {workflows.length === 0 || !activeWorkflow ? (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-12 text-center text-slate-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">暂无登记的协同工作流</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                系统已清空预置模拟业务流数据。可通过工作流定义或外部 API 接入真实调度台账。
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
                      onClick={() => setSelectedWorkflowId(wf.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center space-x-2 ${
                        isSelected
                          ? 'bg-white text-slate-900 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded">
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

              {/* Active Workflow Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-slate-900">{activeWorkflow.title}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
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
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <span>👑 牵头:</span>
                      <span>{activeWorkflow.leadResponsibleAgent}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{activeWorkflow.description}</p>
                {activeWorkflow.outputPath && (
                  <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] font-mono text-slate-500">
                    <span className="font-semibold text-slate-600">📁 交付落盘路径:</span>
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200 truncate">
                      {activeWorkflow.outputPath}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
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

            {/* Collaboration Rules Box */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  协作契约准则
                </span>
                <button
                  onClick={() => setIsAddingRule(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>添加准则</span>
                </button>
              </div>

              <ul className="space-y-1 text-xs text-slate-600">
                {activeWorkflow.collaborationContractRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-blue-500 font-bold">•</span>
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
                    保存规则
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

            {/* Stages Responsibility Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800">
                  环节责任人与契约
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
                      const agent = agents.find((a) => a.id === step.assignedAgentId);

                      return (
                        <tr
                          key={step.id}
                          className="group hover:bg-[#ebf3ff] transition-colors"
                        >
                          <td className="px-3 py-[7px] text-center font-mono font-bold text-blue-600 bg-blue-50/40">
                            0{step.order}
                          </td>
                          <td className="px-3 py-[7px]">
                            <span className="font-bold text-slate-900">{step.name}</span>
                            <span className="block text-[10px] text-slate-400">{step.description}</span>
                          </td>
                          <td className="px-3 py-[7px]">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-slate-800">{agent?.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                                {agent?.role}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-[7px] font-mono text-[11px] text-slate-600">
                            {step.deliverableContract}
                          </td>
                          <td className="px-3 py-[7px] text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                step.status === 'RUNNING'
                                  ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse'
                                  : step.status === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {step.status === 'RUNNING'
                                ? '执行中'
                                : step.status === 'COMPLETED'
                                ? '已交付'
                                : '等待触发'}
                            </span>
                          </td>
                          <td className="px-3 py-[7px] text-right font-mono text-slate-500">
                            {step.estimatedTimeoutSec}s
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
          </div>
        </>
      )}
    </div>

        {/* Right 1 Col: Audit Diff Log Panel (Section 1.2 & 4.3) */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-800">
                  变更留痕
                </h3>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1.5 text-xs text-slate-700 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">{log.summary}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-2">
                    <span>修改人: {log.editor}</span>
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
                    <div className="text-[10px] text-slate-500 italic">
                      理由: {log.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Agent Modal (Section 4.4 & 4.2: High density modal form) */}
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
                <label className="block text-slate-500 font-semibold mb-1">
                  当前环节名称:
                </label>
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
                  变更原因登记 (必填，用于审计留痕):
                </label>
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="例如：'由 DevOps 负责容器打包更符合职能划分'..."
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
