export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'probing';

export interface LocalService {
  id: string;
  name: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'IPC' | 'WebSocket';
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

export type ActiveTab = 'health' | 'skills' | 'workflows';
