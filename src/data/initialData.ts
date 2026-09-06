import {
  LocalService,
  HealthLogEntry,
  AgentAsset,
  AgentSkill,
  WorkflowRegistryItem,
  WorkflowAuditLog,
  EmailNotification,
} from '../types';

// =========================================================================
// 零模拟数据纯净基准 (Zero-Mock Clean State)
// 系统已清空所有预设的模拟业务数据，所有数据均由真实探针/服务/文件系统接入
// =========================================================================

export const INITIAL_SERVICES: LocalService[] = [];
export const INITIAL_HEALTH_LOGS: HealthLogEntry[] = [];
export const AGENT_LIST: AgentAsset[] = [];
export const INITIAL_SKILLS: AgentSkill[] = [];
export const INITIAL_WORKFLOWS: WorkflowRegistryItem[] = [];
export const INITIAL_AUDIT_LOGS: WorkflowAuditLog[] = [];
export const INITIAL_EMAIL_NOTIFICATIONS: EmailNotification[] = [];
