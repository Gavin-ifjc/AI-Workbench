import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  LocalService,
  HealthLogEntry,
  AgentAsset,
  AgentSkill,
  WorkflowRegistryItem,
  WorkflowAuditLog,
} from './types';
import {
  INITIAL_SERVICES,
  INITIAL_HEALTH_LOGS,
  AGENT_LIST,
  INITIAL_SKILLS,
  INITIAL_WORKFLOWS,
  INITIAL_AUDIT_LOGS,
} from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { ServiceHealthDashboard } from './components/ServiceHealthDashboard';
import { AgentSkillCatalog } from './components/AgentSkillCatalog';
import { WorkflowRegistry } from './components/WorkflowRegistry';
import { SettingsModal } from './components/SettingsModal';
import { ExportReportModal } from './components/ExportReportModal';
import { AgentConnectHubModal } from './components/AgentConnectHubModal';
import { AgentDetailDrawer } from './components/AgentDetailDrawer';
import { SkillDetailModal } from './components/SkillDetailModal';
import { soundManager } from './utils/audioAlert';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('health');

  // Core Data States (TYHOO / OpenClaw Architecture)
  const [services, setServices] = useState<LocalService[]>(() => {
    const saved = localStorage.getItem('openclaw_services_v3');
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  const [logs, setLogs] = useState<HealthLogEntry[]>(() => {
    const saved = localStorage.getItem('openclaw_health_logs_v3');
    return saved ? JSON.parse(saved) : INITIAL_HEALTH_LOGS;
  });

  const [agents, setAgents] = useState<AgentAsset[]>(AGENT_LIST);
  const [skills, setSkills] = useState<AgentSkill[]>(() => {
    const saved = localStorage.getItem('openclaw_skills_v3');
    return saved ? JSON.parse(saved) : INITIAL_SKILLS;
  });

  const [workflows, setWorkflows] = useState<WorkflowRegistryItem[]>(() => {
    const saved = localStorage.getItem('openclaw_workflows_v3');
    return saved ? JSON.parse(saved) : INITIAL_WORKFLOWS;
  });

  const [auditLogs, setAuditLogs] = useState<WorkflowAuditLog[]>(() => {
    const saved = localStorage.getItem('openclaw_audit_logs_v3');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Configuration & States
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(3);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [openClawPath, setOpenClawPath] = useState<string>('~/.openclaw');
  const [autoHealEnabled, setAutoHealEnabled] = useState<boolean>(false);

  // Modals & Drawers
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isAgentConnectOpen, setIsAgentConnectOpen] = useState<boolean>(false);

  // Right Drawer & Modal states
  const [selectedDrawerAgent, setSelectedDrawerAgent] = useState<AgentAsset | null>(null);
  const [selectedModalSkill, setSelectedModalSkill] = useState<AgentSkill | null>(null);

  // Sound sync
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Local storage persistence
  useEffect(() => {
    try {
      localStorage.setItem('openclaw_services_v3', JSON.stringify(services));
      localStorage.setItem('openclaw_health_logs_v3', JSON.stringify(logs.slice(0, 50)));
      localStorage.setItem('openclaw_skills_v3', JSON.stringify(skills));
      localStorage.setItem('openclaw_workflows_v3', JSON.stringify(workflows));
      localStorage.setItem('openclaw_audit_logs_v3', JSON.stringify(auditLogs.slice(0, 50)));
    } catch {
      // ignore quota limits
    }
  }, [services, logs, skills, workflows, auditLogs]);

  // Helper to append a lightweight health log
  const appendHealthLog = useCallback(
    (
      serviceId: string,
      serviceName: string,
      level: 'info' | 'warn' | 'error' | 'fatal',
      message: string,
      latencyMs: number,
      lossRisk: boolean = false
    ) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const newEntry: HealthLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: timeStr,
        serviceId,
        serviceName,
        level,
        message,
        latencyMs,
        lossRisk,
      };
      setLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
    },
    []
  );

  // Execute heartbeat poll
  const executeHeartbeatPulse = useCallback(() => {
    setIsPolling(true);

    setServices((prev) =>
      prev.map((srv) => {
        if (srv.status === 'down') {
          return srv;
        }
        const jitter = Math.floor(Math.random() * 6) - 3;
        const newPing = Math.max(2, srv.lastPingMs + jitter);
        const cpuJitter = +(srv.cpuPercent + (Math.random() * 0.6 - 0.3)).toFixed(1);

        return {
          ...srv,
          lastPingMs: newPing,
          lastHeartbeat: '刚刚 (探活正常)',
          cpuPercent: Math.max(0.2, cpuJitter),
        };
      })
    );

    setTimeout(() => {
      setIsPolling(false);
    }, 350);
  }, []);

  // Timer for heartbeat polling
  useEffect(() => {
    const timer = setInterval(() => {
      executeHeartbeatPulse();
    }, pollIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [pollIntervalSec, executeHeartbeatPulse]);

  // Restart Service Action
  const handleRestartService = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          return {
            ...s,
            status: 'healthy',
            lastPingMs: Math.floor(Math.random() * 12) + 4,
            uptime: '刚刚拉起 (0m)',
            lastHeartbeat: '刚刚 (进程重新就绪)',
            pid: Math.floor(Math.random() * 10000) + 50000,
          };
        }
        return s;
      })
    );

    const srv = services.find((s) => s.id === serviceId);
    if (srv) {
      appendHealthLog(
        srv.id,
        srv.name,
        'info',
        `【服务拉起调度】成功执行服务拉起命令，分配新 PID，心跳正常，无持久化数据丢失。`,
        10,
        false
      );
      soundManager.playSuccessPip();
    }
  };

  // Restart all down services
  const handleRestartAllDown = () => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.status === 'down') {
          return {
            ...s,
            status: 'healthy',
            lastPingMs: Math.floor(Math.random() * 12) + 4,
            uptime: '批量拉起 (0m)',
            lastHeartbeat: '刚刚 (批量拉起成功)',
            pid: Math.floor(Math.random() * 10000) + 50000,
          };
        }
        return s;
      })
    );
    appendHealthLog('srv-supervisor', 'Supervisor', 'info', `批量拉起所有故障服务完毕。`, 5, false);
    soundManager.playSuccessPip();
  };

  // Probe single service
  const handleProbeService = (serviceId: string) => {
    const srv = services.find((s) => s.id === serviceId);
    if (!srv) return;

    if (srv.status === 'down') {
      appendHealthLog(srv.id, srv.name, 'error', `探活失败：端口 ${srv.port} 无响应 (ECONNREFUSED)`, 0, srv.isCritical);
      soundManager.playAlertChime();
    } else {
      const ping = Math.floor(Math.random() * 10) + 3;
      appendHealthLog(srv.id, srv.name, 'info', `探活成功：延迟 ${ping}ms，健康度指标良好。`, ping, false);
      soundManager.playSuccessPip();
    }
  };

  // Rescan Skills from Mac local 3 physical directories
  const handleRescanSkills = () => {
    setIsScanning(true);
    setTimeout(() => {
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          lastScanned: '刚刚 (目录哈希一致)',
        }))
      );

      setSkills((prev) =>
        prev.map((sk) => {
          if (sk.id === 'sk-03') {
            return {
              ...sk,
              lastModified: '刚刚 (扫描更新)',
              isModifiedRecently: true,
              checksum: Math.random().toString(36).slice(2, 10),
            };
          }
          return sk;
        })
      );

      appendHealthLog(
        'srv-scanner',
        'OpenClaw Skill Scanner',
        'info',
        `完成 16 个 Agent 目录与全局/企微插件扫描，共索引 78 项能力资产，严格遵循非侵入不复制全文原则。`,
        6,
        false
      );
      setIsScanning(false);
      soundManager.playSuccessPip();
    }, 600);
  };

  // Update step assigned agent with audit diff
  const handleUpdateStepAgent = (
    workflowId: string,
    stepId: string,
    newAgentId: string,
    reason: string
  ) => {
    const targetWf = workflows.find((w) => w.id === workflowId);
    if (!targetWf) return;
    const targetStep = targetWf.steps.find((s) => s.id === stepId);
    if (!targetStep) return;

    const oldAgentName = agents.find((a) => a.id === targetStep.assignedAgentId)?.name || targetStep.assignedAgentId;
    const newAgentName = agents.find((a) => a.id === newAgentId)?.name || newAgentId;

    const newAudit: WorkflowAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      editor: 'Gavin (管理员 / Local Mac)',
      action: 'OWNER_CHANGE',
      targetWorkflowId: workflowId,
      summary: `调整步骤【${targetStep.name}】责任 Agent 归属`,
      diffBefore: `步骤 ${targetStep.name} -> 责任人: ${oldAgentName}`,
      diffAfter: `步骤 ${targetStep.name} -> 责任人: ${newAgentName}`,
      reason: reason || '明确协作环节责任边界',
    };

    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id === workflowId) {
          return {
            ...wf,
            updatedAt: `刚刚 (由 Gavin 调整环节负责人)`,
            steps: wf.steps.map((st) => {
              if (st.id === stepId) {
                return { ...st, assignedAgentId: newAgentId };
              }
              return st;
            }),
          };
        }
        return wf;
      })
    );

    setAuditLogs((prev) => [newAudit, ...prev]);
    soundManager.playSuccessPip();
  };

  // Add rule to workflow
  const handleAddRule = (workflowId: string, newRule: string) => {
    const newAudit: WorkflowAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      editor: 'Gavin (管理员 / Local Mac)',
      action: 'RULE_REVISED',
      targetWorkflowId: workflowId,
      summary: `新增协作准则规则`,
      diffBefore: `规则总数: ${workflows.find((w) => w.id === workflowId)?.collaborationContractRules.length || 0} 条`,
      diffAfter: `新增规则: "${newRule}"`,
      reason: '补充团队人可读协作规范',
    };

    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id === workflowId) {
          return {
            ...wf,
            collaborationContractRules: [...wf.collaborationContractRules, newRule],
            updatedAt: '刚刚 (新增协作原则)',
          };
        }
        return wf;
      })
    );

    setAuditLogs((prev) => [newAudit, ...prev]);
    soundManager.playSuccessPip();
  };

  // Toggle workflow status (Active / Paused)
  const handleToggleWorkflowStatus = (workflowId: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id === workflowId) {
          const newStatus = wf.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          return { ...wf, status: newStatus };
        }
        return wf;
      })
    );
  };

  const conflictSkillCount = 2;

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-900 overflow-hidden flex flex-col">
      {/* 1. Collapsible 72px Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        services={services}
        isPolling={isPolling}
        onRefreshNow={executeHeartbeatPulse}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportReport={() => setIsExportOpen(true)}
        onOpenAgentConnect={() => setIsAgentConnectOpen(true)}
        conflictSkillCount={conflictSkillCount}
        pollIntervalSec={pollIntervalSec}
      />

      {/* 2. Main Workspace Offset by 72px */}
      <div className="pl-[72px] flex flex-col flex-1 min-w-0 relative h-screen bg-slate-50 overflow-hidden">
        {/* Top Header Command Toolbar */}
        <TopHeader
          activeTab={activeTab}
          services={services}
          isPolling={isPolling}
          pollIntervalSec={pollIntervalSec}
          onRefreshNow={executeHeartbeatPulse}
          onExportReport={() => setIsExportOpen(true)}
          onRestartAllDown={handleRestartAllDown}
          onOpenAgentConnect={() => setIsAgentConnectOpen(true)}
        />

        {/* Scrollable Work Area */}
        <main className="flex-1 px-5 lg:px-6 pt-2.5 pb-4 overflow-y-auto space-y-4">
          {/* Tab 1: 服务健康总览 */}
          {activeTab === 'health' && (
            <ServiceHealthDashboard
              services={services}
              logs={logs}
              onRestartService={handleRestartService}
              onProbeService={handleProbeService}
              onClearLogs={() => setLogs([])}
              pollIntervalSec={pollIntervalSec}
              setPollIntervalSec={setPollIntervalSec}
            />
          )}

          {/* Tab 2: Agent·Skill 资产目录 */}
          {activeTab === 'skills' && (
            <AgentSkillCatalog
              agents={agents}
              skills={skills}
              onRescanSkills={handleRescanSkills}
              isScanning={isScanning}
              onOpenAgentDrawer={(agent) => setSelectedDrawerAgent(agent)}
              onOpenSkillModal={(skill) => setSelectedModalSkill(skill)}
            />
          )}

          {/* Tab 3: 工作流台账与变更留痕 */}
          {activeTab === 'workflows' && (
            <WorkflowRegistry
              workflows={workflows}
              auditLogs={auditLogs}
              agents={agents}
              onUpdateStepAgent={handleUpdateStepAgent}
              onAddRule={handleAddRule}
              onToggleWorkflowStatus={handleToggleWorkflowStatus}
            />
          )}
        </main>

        {/* macOS Style High-Density Status Footer */}
        <footer className="h-7 px-6 bg-white border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              TYHOO / OpenClaw 本地工作台在线
            </span>
            <span>•</span>
            <span className="text-slate-400">本地路径: {openClawPath}</span>
            <span>•</span>
            <span className="text-blue-600 font-medium">原则：不复制业务全文 · 仅登记元数据与契约</span>
          </div>

          <div className="flex items-center space-x-3">
            <span>16 Agent / 5 业务流</span>
            <span>•</span>
            <span>心跳巡检: 每 {pollIntervalSec}s</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">8901 邮件防断流保障</span>
          </div>
        </footer>
      </div>

      {/* Right Sliding Detail Drawer for Agent */}
      <AgentDetailDrawer
        agent={selectedDrawerAgent}
        skills={skills}
        isOpen={Boolean(selectedDrawerAgent)}
        onClose={() => setSelectedDrawerAgent(null)}
        onSelectSkill={(skill) => {
          setSelectedDrawerAgent(null);
          setSelectedModalSkill(skill);
        }}
      />

      {/* Skill Detail Modal */}
      <SkillDetailModal
        skill={selectedModalSkill}
        agent={agents.find((a) => a.id === selectedModalSkill?.agentId)}
        isOpen={Boolean(selectedModalSkill)}
        onClose={() => setSelectedModalSkill(null)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        openClawPath={openClawPath}
        setOpenClawPath={setOpenClawPath}
        autoHealEnabled={autoHealEnabled}
        setAutoHealEnabled={setAutoHealEnabled}
      />

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        workflows={workflows}
        auditLogs={auditLogs}
        skills={skills}
        agents={agents}
        services={services}
      />

      {/* Agent Connect Hub Modal */}
      <AgentConnectHubModal
        isOpen={isAgentConnectOpen}
        onClose={() => setIsAgentConnectOpen(false)}
        onHeartbeatSent={(agentName) => {
          appendHealthLog(
            'agent-ext',
            agentName,
            'info',
            `【Agent 连线】接收到 ${agentName} 上报的 API 心跳与任务就绪状态`,
            15,
            false
          );
          soundManager.playSuccessPip();
        }}
      />
    </div>
  );
}
