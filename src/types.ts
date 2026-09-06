export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'probing';

export interface LocalService {
  id: string;
  name: string;
  port: number;
  protocol: 'HTTP' | 'gRPC' | 'IPC' | 'WebSocket';
  path: string;
  status: ServiceStatus;
  uptime: string;
  lastPingMs: number;
  lastHeartbeat: string;
  memoryMb: number;
  cpuPercent: number;
  pid: number;
  isCritical: boolean; // if critical service goes down, triggers high-priority alert
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

export interface AgentSkill {
  id: string;
  agentId: string;
  name: string;
  version: string;
  filePath: string;
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
  category: 'core' | 'execution' | 'audit' | 'knowledge';
  skillCount: number;
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
  editor: string; // e.g. "DevOps / Gavin", "Orchestrator v2.4", "Auto-Heal Engine"
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
  code: string; // e.g. WF-101
  category: string;
  description: string;
  steps: WorkflowStep[];
  collaborationContractRules: string[]; // human readable rules
  version: string;
  updatedAt: string;
  activeRunId?: string;
  status: 'ACTIVE' | 'PAUSED' | 'MAINTENANCE';
}

export interface ComputeMetrics {
  queuedTasks: number;
  activeSlots: number;
  totalSlots: number;
  tokensPerSec: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  peakLatencyThresholdMs: number;
  isLatencyAlertTriggered: boolean;
  gpuMemoryUsedGb: number;
  gpuMemoryTotalGb: number;
  metalMpsUtilization: number;
  thermalState: 'Nominal' | 'Fair' | 'Serious' | 'Critical';
  taskQueue: QueuedTask[];
}

export interface QueuedTask {
  id: string;
  title: string;
  agentId: string;
  priority: 'P0' | 'P1' | 'P2';
  queuedDurationSec: number;
  predictedWaitMs: number;
  modelTarget: string;
  status: 'waiting' | 'running' | 'throttled';
}

export type ActiveTab = 'health' | 'skills' | 'workflows' | 'telemetry';
