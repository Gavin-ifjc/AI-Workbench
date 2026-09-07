export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'probing';

export interface LocalService {
  id: string;
  name: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'IPC' | 'WebSocket' | 'PROC';
  path: string;
  targetUrl?: string;
  status: ServiceStatus;
  uptime: string;
  lastPingMs: number;
  lastHeartbeat: string;
  memoryMb: number;
  cpuPercent: number;
  pid: number;
  isCritical: boolean; // if critical service goes down, triggers high-priority alert
  isLaunchdManaged: boolean; // whether it is daemon-managed by macOS launchd
  launchdLabel?: string;
  incidentNote?: string; // real incident history (e.g. 8901 crash cause)
  errorDetails?: string;
  restartCmd?: string;
}

export interface HealthLogEntry {
  id: string;
  timestamp: string;
  serviceId: string;
  serviceName: string;
  level: 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  latencyMs: number;
  lossRisk: boolean; // whether this poses data loss danger
}

export interface SkillParam {
  name: string;
  type: string;
  required: boolean;
  desc: string;
}

export type SkillLocationCategory = 'agent_workspace' | 'global_shared' | 'wecom_plugin';

export interface AgentSkill {
  id: string;
  agentId: string;
  name: string;
  version: string;
  filePath: string;
  locationCategory: SkillLocationCategory;
  locationPath: string; // e.g. /Users/agents/.openclaw/workspace/<id>/skills/
  description: string;
  inputSignature: SkillParam[];
  outputType: string;
  permission: 'READ_ONLY' | 'FILE_WRITE' | 'NETWORK' | 'SYSTEM_EXEC';
  lastModified: string;
  isModifiedRecently?: boolean;
  checksum: string; // MD5/SHA256 for integrity check without copying full text
  tags: string[];
  status: 'active' | 'deprecated' | 'conflict_detected';
}

export interface AgentAsset {
  id: string;
  name: string;
  role: string;
  category: 'executive_lead' | 'business_domain' | 'engineering_tech' | 'support_admin';
  isLeadOrVvip?: boolean; // for main (元元)
  skillCount: number;
  workspaceSkillsCount: number;
  skillsDir: string;
  activeStatus: 'idle' | 'running' | 'offline';
  lastScanned: string;
  description: string;
  responsibilities: string[];
}

export type StepExecutionStatus = 'IDLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'BLOCKED';

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  assignedAgentId: string;
  deliverableContract: string; // Human readable spec of expected output
  estimatedTimeoutSec: number;
  status: StepExecutionStatus;
  lastRunAt?: string;
  errorNote?: string;
}

export interface WorkflowAuditLog {
  id: string;
  timestamp: string;
  editor: string; // e.g. "元元 (团队主管)", "程建 (项目经理)", "王总 (批复)"
  action: 'CREATE' | 'STEP_UPDATE' | 'OWNER_CHANGE' | 'RULE_REVISED' | 'EMERGENCY_OVERRIDE';
  targetWorkflowId: string;
  summary: string;
  diffBefore: string;
  diffAfter: string;
  reason: string;
}

export interface WorkflowRegistryItem {
  id: string;
  title: string;
  code: string; // WF-01 to WF-05
  category: string;
  description: string;
  outputPath?: string; // e.g. /Users/Shared/程建/<项目名>/
  leadResponsibleAgent: string;
  steps: WorkflowStep[];
  collaborationContractRules: string[]; // human readable rules
  version: string;
  updatedAt: string;
  activeRunId?: string;
  status: 'ACTIVE' | 'PAUSED' | 'MAINTENANCE';
}

export type ActiveTab = 'health' | 'skills' | 'workflows' | 'emails';

export type EmailLedgerStatus = '待处理' | '已处理' | '已闭环' | '暂缓';

export interface EmailReplyRecord {
  id: string;
  repliedAt: string;
  repliedBy: string; // e.g. "王总"
  content: string;
  assignedAgent: string; // e.g. "苏念", "元元", "程建"
  actionType: 'proceed' | 'reject' | 'delegate' | 'custom';
  sentToSessionId: string; // e.g. "session_agent_main_yuanyuan_01"
  sessionAckStatus: 'delivered' | 'pending';
  citationSnippet: string; // formatted quote sent to agent
}

export interface EmailNotification {
  id: string; // e.g. "20260906-AIS-TEST-001"
  notificationType: string; // e.g. "新商机邮件通知"
  date: string; // e.g. "2026-09-06 18:06"
  subject: string; // e.g. "AIS Technical-王总-业务 RFQ 询价（暂无编号待建档）"
  content: string; // e.g. "负责人发来询价，询问产品报价与交期。"
  archiveStatus: string; // e.g. "暂未归档（等指派后建档）"
  ledgerStatus: EmailLedgerStatus; // e.g. "待处理"
  nextStepSuggestion: string; // e.g. "建议安排苏念先做客户背景调研、出初步商务分析，再决定是否正式报价。要您定下是否推进。"
  sender?: string;
  recipient?: string;
  suggestedAgent?: string;
  priority?: 'critical' | 'high' | 'normal';
  replies: EmailReplyRecord[];
  rawSource?: string;
  projectName?: string; // 业务系统/台账里的正式项目名称(有LEAD号时由入库解析填入,前端标题优先显示)
  direction?: string; // 邮件方向: '客户来件'|'我方发出'|'我方转发' (入库时解析,判定优先级:显式传入>域名>主题线索)
}
