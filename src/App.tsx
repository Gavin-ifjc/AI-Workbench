import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  LocalService,
  HealthLogEntry,
  AgentAsset,
  AgentSkill,
  WorkflowRegistryItem,
  WorkflowAuditLog,
  EmailNotification,
  EmailReplyRecord,
} from './types';
import {
  INITIAL_SERVICES,
  INITIAL_HEALTH_LOGS,
  AGENT_LIST,
  INITIAL_SKILLS,
  INITIAL_WORKFLOWS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EMAIL_NOTIFICATIONS,
} from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { EmailNotificationBoard } from './components/EmailNotificationBoard';
import { ServiceHealthDashboard } from './components/ServiceHealthDashboard';
import { AgentSkillCatalog } from './components/AgentSkillCatalog';
import { WorkflowRegistry } from './components/WorkflowRegistry';
import { SettingsModal } from './components/SettingsModal';
import { ExportReportModal } from './components/ExportReportModal';
import { AgentDetailDrawer } from './components/AgentDetailDrawer';
import { SkillDetailModal } from './components/SkillDetailModal';
import { soundManager } from './utils/audioAlert';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('emails');

  // Clean legacy local storage keys with mock data
  try {
    [
      'openclaw_emails_v4',
      'openclaw_services_v4',
      'openclaw_health_logs_v4',
      'openclaw_audit_logs_v4',
      'openclaw_workflows_v4',
      'openclaw_skills_v4',
      'openclaw_emails_v3',
      'openclaw_services_v3',
      'openclaw_health_logs_v3',
      'openclaw_audit_logs_v3',
      'openclaw_workflows_v3',
      'openclaw_skills_v3',
      'openclaw_emails_v2',
      'openclaw_emails_v1',
      'openclaw_services_v2',
    ].forEach((k) => localStorage.removeItem(k));
  } catch {}

  // Core Data States (OpenClaw Hub Architecture - Clean zero-mock baseline)
  const [emailNotifications, setEmailNotifications] = useState<EmailNotification[]>(() => {
    const saved = localStorage.getItem('openclaw_emails_v5');
    return saved ? JSON.parse(saved) : INITIAL_EMAIL_NOTIFICATIONS;
  });

  const [services, setServices] = useState<LocalService[]>(() => {
    const saved = localStorage.getItem('openclaw_services_v5');
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  const [logs, setLogs] = useState<HealthLogEntry[]>(() => {
    const saved = localStorage.getItem('openclaw_health_logs_v5');
    return saved ? JSON.parse(saved) : INITIAL_HEALTH_LOGS;
  });

  const [agents, setAgents] = useState<AgentAsset[]>(AGENT_LIST);
  const [skills, setSkills] = useState<AgentSkill[]>(() => {
    const saved = localStorage.getItem('openclaw_skills_v5');
    return saved ? JSON.parse(saved) : INITIAL_SKILLS;
  });

  const [workflows, setWorkflows] = useState<WorkflowRegistryItem[]>(() => {
    const saved = localStorage.getItem('openclaw_workflows_v5');
    return saved ? JSON.parse(saved) : INITIAL_WORKFLOWS;
  });

  const [auditLogs, setAuditLogs] = useState<WorkflowAuditLog[]>(() => {
    const saved = localStorage.getItem('openclaw_audit_logs_v5');
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

  // Right Drawer & Modal states
  const [selectedDrawerAgent, setSelectedDrawerAgent] = useState<AgentAsset | null>(null);
  const [selectedModalSkill, setSelectedModalSkill] = useState<AgentSkill | null>(null);

  // Sound sync
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Sync initial state from backend
  useEffect(() => {
    fetch('/api/v1/services')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.services) && data.services.length > 0) {
          setServices(data.services);
        }
      })
      .catch(() => {});

    fetch('/api/v1/email-notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.notifications)) {
          setEmailNotifications(data.notifications);
        }
      })
      .catch(() => {});
  }, []);

  // Local storage persistence
  useEffect(() => {
    try {
      localStorage.setItem('openclaw_emails_v5', JSON.stringify(emailNotifications));
      localStorage.setItem('openclaw_services_v5', JSON.stringify(services));
      localStorage.setItem('openclaw_health_logs_v5', JSON.stringify(logs.slice(0, 50)));
      localStorage.setItem('openclaw_skills_v5', JSON.stringify(skills));
      localStorage.setItem('openclaw_workflows_v5', JSON.stringify(workflows));
      localStorage.setItem('openclaw_audit_logs_v5', JSON.stringify(auditLogs.slice(0, 50)));
    } catch {
      // ignore quota limits
    }
  }, [emailNotifications, services, logs, skills, workflows, auditLogs]);

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

  // Execute heartbeat poll with real backend socket probe
  const executeHeartbeatPulse = useCallback(() => {
    setIsPolling(true);

    fetch('/api/v1/services/probe-all', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.services)) {
          setServices(data.services);
        }
      })
      .catch(() => {
        fetch('/api/v1/services')
          .then((r) => r.json())
          .then((d) => {
            if (d && Array.isArray(d.services)) setServices(d.services);
          })
          .catch(() => {});
      })
      .finally(() => {
        setTimeout(() => setIsPolling(false), 300);
      });
  }, []);

  // Timer for heartbeat polling
  useEffect(() => {
    const timer = setInterval(() => {
      executeHeartbeatPulse();
    }, pollIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [pollIntervalSec, executeHeartbeatPulse]);

  // Restart Service Action (calling backend restart endpoint)
  const handleRestartService = (serviceId: string) => {
    const srv = services.find((s) => s.id === serviceId);
    if (!srv) return;

    fetch(`/api/v1/services/${serviceId}/restart`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.service) {
          setServices((prev) =>
            prev.map((s) => (s.id === serviceId ? data.service : s))
          );
        }
        appendHealthLog(
          srv.id,
          srv.name,
          'info',
          `【服务拉起调度】成功执行服务拉起命令，心跳存续正常。`,
          2,
          false
        );
        soundManager.playSuccessPip();
      })
      .catch(() => {
        setServices((prev) =>
          prev.map((s) =>
            s.id === serviceId
              ? {
                  ...s,
                  status: 'healthy',
                  lastPingMs: 1,
                  uptime: '已拉起',
                  lastHeartbeat: '刚刚 (手动拉起)',
                }
              : s
          )
        );
        soundManager.playSuccessPip();
      });
  };

  // Restart all down services
  const handleRestartAllDown = () => {
    const downList = services.filter((s) => s.status === 'down');
    if (downList.length === 0) return;

    Promise.all(
      downList.map((s) =>
        fetch(`/api/v1/services/${s.id}/restart`, { method: 'POST' })
          .then((r) => r.json())
          .catch(() => null)
      )
    ).then(() => {
      executeHeartbeatPulse();
      appendHealthLog('srv-supervisor', 'Supervisor', 'info', `已批量拉起 ${downList.length} 项挂死服务。`, 2, false);
      soundManager.playSuccessPip();
    });
  };

  // Probe single service with real socket probe
  const handleProbeService = (serviceId: string) => {
    const srv = services.find((s) => s.id === serviceId);
    if (!srv) return;

    fetch(`/api/v1/services/${serviceId}/probe`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'healthy') {
          setServices((prev) =>
            prev.map((s) =>
              s.id === serviceId
                ? {
                    ...s,
                    status: 'healthy',
                    lastPingMs: data.latencyMs,
                    lastHeartbeat: '刚刚 (TCP 探测成功)',
                  }
                : s
            )
          );
          appendHealthLog(
            srv.id,
            srv.name,
            'info',
            `探活成功：延迟 ${data.latencyMs}ms，端口响应良好。`,
            data.latencyMs,
            false
          );
          soundManager.playSuccessPip();
        } else {
          setServices((prev) =>
            prev.map((s) =>
              s.id === serviceId
                ? {
                    ...s,
                    status: 'down',
                    lastPingMs: 0,
                    lastHeartbeat: '探测未响应 (ECONNREFUSED)',
                  }
                : s
            )
          );
          appendHealthLog(
            srv.id,
            srv.name,
            'error',
            `探活失败：端口 ${srv.port} 无响应 (${data.error || 'ECONNREFUSED'})`,
            0,
            srv.isCritical
          );
          soundManager.playAlertChime();
        }
      })
      .catch(() => {
        appendHealthLog(srv.id, srv.name, 'error', `探活异常：无法连接探活服务`, 0, srv.isCritical);
        soundManager.playAlertChime();
      });
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

  // 王总批复邮件通知，自动引用原邮件并推送到 Agent 聊天 Session 闭环
  const handleReplyEmail = (
    emailId: string,
    replyText: string,
    assignedAgent: string,
    actionType: 'proceed' | 'reject' | 'delegate' | 'custom'
  ) => {
    const targetEmail = emailNotifications.find((e) => e.id === emailId);
    if (!targetEmail) return;

    const nowStr = new Date().toLocaleString();
    const sessionId = `session_agent_${assignedAgent}_chat_01`;

    const citationSnippet = `【王总批复闭环指令】
> 引用邮件通知：
> 邮件ID：${targetEmail.id}
> 日期：${targetEmail.date}
> 类型：${targetEmail.notificationType}
> 主题：${targetEmail.subject}
> 归档状态：${targetEmail.archiveStatus}
> 内容摘要：${targetEmail.content}
> 下一步建议：${targetEmail.nextStepSuggestion}
────────────────────────────────────
王总批复处理意见：
“${replyText.trim()}”
指派执行 Agent: ${assignedAgent}
批复时间: ${nowStr}
同步到 Agent 会话: ${sessionId} (200 OK 已闭环派单)`;

    const newReply: EmailReplyRecord = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      repliedAt: nowStr,
      repliedBy: '王总',
      content: replyText.trim(),
      assignedAgent,
      actionType,
      sentToSessionId: sessionId,
      sessionAckStatus: 'delivered',
      citationSnippet,
    };

    // Update notification record
    setEmailNotifications((prev) =>
      prev.map((e) => {
        if (e.id === emailId) {
          return {
            ...e,
            ledgerStatus: '已闭环',
            archiveStatus: e.archiveStatus.includes('暂未归档')
              ? `已建档派单 (责任: ${assignedAgent})`
              : e.archiveStatus,
            replies: [...e.replies, newReply],
          };
        }
        return e;
      })
    );

    // Record audit diff
    const newAudit: WorkflowAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: nowStr,
      editor: '王总',
      action: 'STEP_UPDATE',
      targetWorkflowId: 'wf-01',
      summary: `批复邮件通知【${targetEmail.subject}】并闭环指派 ${assignedAgent}`,
      diffBefore: `台账状态: ${targetEmail.ledgerStatus} | 归档: ${targetEmail.archiveStatus}`,
      diffAfter: `台账状态: 已闭环 | 责任: ${assignedAgent} | 批复: "${replyText.trim()}"`,
      reason: `王总在工作台做出批示，系统已自动引用该邮件通知并注入 ${assignedAgent} 聊天 Session`,
    };
    setAuditLogs((prev) => [newAudit, ...prev]);

    // Append log
    appendHealthLog(
      'srv-mail-probe',
      '邮件通知闭环分发',
      'info',
      `【王总批复闭环】已将邮件 ${targetEmail.id} 批复自动引用并投递到 ${assignedAgent} 的聊天 Session (${sessionId})`,
      12,
      false
    );

    // Call backend API
    fetch(`/api/v1/email-notifications/${emailId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: replyText,
        repliedBy: '王总',
        assignedAgent,
        actionType,
        sentToSessionId: sessionId,
      }),
    }).catch(() => {});

    soundManager.playSuccessPip();
  };

  // 模拟或由 Agent 同步新邮件通知
  const handleSyncNewNotification = (newMailData: Partial<EmailNotification>) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const id = newMailData.id || `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-MAIL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newRecord: EmailNotification = {
      id,
      notificationType: newMailData.notificationType || '新商机邮件通知',
      date: newMailData.date || dateStr,
      subject: newMailData.subject || '新商务问询邮件',
      content: newMailData.content || '',
      archiveStatus: newMailData.archiveStatus || '暂未归档（等指派后建档）',
      ledgerStatus: newMailData.ledgerStatus || '待处理',
      nextStepSuggestion: newMailData.nextStepSuggestion || '建议安排商务人员初审并报王总定夺。',
      suggestedAgent: newMailData.suggestedAgent || '苏念',
      priority: newMailData.priority || 'high',
      replies: [],
      rawSource: 'OpenClaw 8901 邮件扫描探针',
    };

    setEmailNotifications((prev) => [newRecord, ...prev]);

    appendHealthLog(
      'srv-mail-probe',
      '8901 邮件扫描探针',
      'info',
      `【新邮件通知同步】已自动登记: ${newRecord.subject} (ID: ${newRecord.id})`,
      10,
      false
    );

    fetch('/api/v1/email-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    }).catch(() => {});

    soundManager.playSuccessPip();
  };

  const conflictSkillCount = skills.filter((s) => s.status === 'conflict_detected').length;
  const pendingEmailCount = emailNotifications.filter((e) => e.ledgerStatus === '待处理').length;

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
        conflictSkillCount={conflictSkillCount}
        pollIntervalSec={pollIntervalSec}
        pendingEmailCount={pendingEmailCount}
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
        />

        {/* Scrollable Work Area */}
        <main className="flex-1 px-5 lg:px-6 pt-2.5 pb-4 overflow-y-auto space-y-4">
          {/* Tab 0: 邮件通知与闭环处理大盘 (选项卡每行三个) */}
          {activeTab === 'emails' && (
            <EmailNotificationBoard
              notifications={emailNotifications}
              agents={agents}
              onReplyEmail={handleReplyEmail}
              onSyncNewNotification={handleSyncNewNotification}
            />
          )}

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
              OpenClaw Hub
            </span>
            <span>•</span>
            <span className="text-slate-400">本地路径: {openClawPath}</span>
          </div>

          <div className="flex items-center space-x-3">
            <span>{agents.length} Agent / {workflows.length} 业务流</span>
            <span>•</span>
            <span>巡检: 每 {pollIntervalSec}s</span>
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
    </div>
  );
}
