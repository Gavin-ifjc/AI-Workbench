import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import {
  LocalService,
  HealthLogEntry,
  WorkflowRegistryItem,
  WorkflowAuditLog,
  EmailNotification,
  EmailReplyRecord,
} from '../src/types';

export interface AgentSessionOutboundMessage {
  id: string;
  emailId: string;
  emailSubject: string;
  targetAgent: string;
  targetSessionId: string;
  sentAt: string;
  author: string;
  directive: string;
  formattedCitation: string;
  status: 'delivered' | 'read' | 'pending';
}

// SQLite Database File Path: persist in data/openclaw_hub.db
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'openclaw_hub.db');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite database instance
const db = new DatabaseSync(DB_PATH);

// Enable WAL journal mode for optimal concurrency and crash resilience
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Initialize Tables for '服务状态 + 邮件通知 + 业务台账 + 审计日志 + 探活日志 + 闭环出箱队列'
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    port INTEGER NOT NULL,
    protocol TEXT NOT NULL,
    path TEXT DEFAULT '',
    targetUrl TEXT DEFAULT '',
    status TEXT NOT NULL,
    uptime TEXT DEFAULT '',
    lastPingMs INTEGER DEFAULT 0,
    lastHeartbeat TEXT DEFAULT '',
    memoryMb REAL DEFAULT 0,
    cpuPercent REAL DEFAULT 0,
    pid INTEGER DEFAULT 0,
    isCritical INTEGER DEFAULT 0,
    isLaunchdManaged INTEGER DEFAULT 0,
    launchdLabel TEXT DEFAULT '',
    incidentNote TEXT DEFAULT '',
    errorDetails TEXT DEFAULT '',
    restartCmd TEXT DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_notifications (
    id TEXT PRIMARY KEY,
    notificationType TEXT NOT NULL,
    date TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    archiveStatus TEXT DEFAULT '',
    ledgerStatus TEXT NOT NULL,
    nextStepSuggestion TEXT DEFAULT '',
    sender TEXT DEFAULT '',
    recipient TEXT DEFAULT '',
    suggestedAgent TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    rawSource TEXT DEFAULT '',
    replies_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    version TEXT DEFAULT 'v1.0.0',
    category TEXT DEFAULT 'business',
    description TEXT DEFAULT '',
    status TEXT NOT NULL,
    leadResponsibleAgent TEXT DEFAULT '',
    outputPath TEXT DEFAULT '',
    steps_json TEXT DEFAULT '[]',
    rules_json TEXT DEFAULT '[]',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    editor TEXT NOT NULL,
    action TEXT NOT NULL,
    targetWorkflowId TEXT NOT NULL,
    summary TEXT NOT NULL,
    diffBefore TEXT DEFAULT '',
    diffAfter TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS health_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    serviceId TEXT NOT NULL,
    serviceName TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    latencyMs INTEGER DEFAULT 0,
    lossRisk INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_session_outbox (
    id TEXT PRIMARY KEY,
    emailId TEXT DEFAULT '',
    emailSubject TEXT DEFAULT '',
    targetAgent TEXT NOT NULL,
    targetSessionId TEXT NOT NULL,
    sentAt TEXT NOT NULL,
    author TEXT NOT NULL,
    directive TEXT NOT NULL,
    formattedCitation TEXT DEFAULT '',
    status TEXT DEFAULT 'delivered',
    created_at TEXT NOT NULL
  );
`);

console.log(`[OpenClaw Hub SQLite] 本地 SQLite 存储初始化就绪: ${DB_PATH}`);

// =========================================================================
// 1. SERVICES (服务状态)
// =========================================================================
const upsertServiceStmt = db.prepare(`
  INSERT INTO services (
    id, name, port, protocol, path, targetUrl, status, uptime,
    lastPingMs, lastHeartbeat, memoryMb, cpuPercent, pid, isCritical,
    isLaunchdManaged, launchdLabel, incidentNote, errorDetails, restartCmd, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    port = excluded.port,
    protocol = excluded.protocol,
    path = excluded.path,
    targetUrl = excluded.targetUrl,
    status = excluded.status,
    uptime = excluded.uptime,
    lastPingMs = excluded.lastPingMs,
    lastHeartbeat = excluded.lastHeartbeat,
    memoryMb = excluded.memoryMb,
    cpuPercent = excluded.cpuPercent,
    pid = excluded.pid,
    isCritical = excluded.isCritical,
    isLaunchdManaged = excluded.isLaunchdManaged,
    launchdLabel = excluded.launchdLabel,
    incidentNote = excluded.incidentNote,
    errorDetails = excluded.errorDetails,
    restartCmd = excluded.restartCmd,
    updated_at = excluded.updated_at
`);

export function upsertService(s: LocalService): void {
  upsertServiceStmt.run(
    s.id,
    s.name || '',
    Number(s.port) || 0,
    s.protocol || 'HTTP',
    s.path || '',
    s.targetUrl || '',
    s.status || 'healthy',
    s.uptime || '',
    Number(s.lastPingMs) || 0,
    s.lastHeartbeat || '',
    Number(s.memoryMb) || 0,
    Number(s.cpuPercent) || 0,
    Number(s.pid) || 0,
    s.isCritical ? 1 : 0,
    s.isLaunchdManaged ? 1 : 0,
    s.launchdLabel || '',
    s.incidentNote || '',
    s.errorDetails || '',
    s.restartCmd || '',
    new Date().toISOString()
  );
}

export function getAllServices(): LocalService[] {
  const rows = db.prepare(`SELECT * FROM services ORDER BY port ASC`).all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    port: Number(r.port),
    protocol: (r.protocol || 'HTTP') as 'HTTP' | 'HTTPS' | 'TCP' | 'IPC' | 'WebSocket',
    path: r.path,
    targetUrl: r.targetUrl,
    status: (r.status || 'healthy') as 'healthy' | 'degraded' | 'down' | 'probing',
    uptime: r.uptime,
    lastPingMs: Number(r.lastPingMs),
    lastHeartbeat: r.lastHeartbeat,
    memoryMb: Number(r.memoryMb),
    cpuPercent: Number(r.cpuPercent),
    pid: Number(r.pid),
    isCritical: Boolean(r.isCritical),
    isLaunchdManaged: Boolean(r.isLaunchdManaged),
    launchdLabel: r.launchdLabel,
    incidentNote: r.incidentNote,
    errorDetails: r.errorDetails,
    restartCmd: r.restartCmd,
  }));
}

export function getServiceById(id: string): LocalService | null {
  const r = db.prepare(`SELECT * FROM services WHERE id = ?`).get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    port: Number(r.port),
    protocol: (r.protocol || 'HTTP') as 'HTTP' | 'HTTPS' | 'TCP' | 'IPC' | 'WebSocket',
    path: r.path,
    targetUrl: r.targetUrl,
    status: (r.status || 'healthy') as 'healthy' | 'degraded' | 'down' | 'probing',
    uptime: r.uptime,
    lastPingMs: Number(r.lastPingMs),
    lastHeartbeat: r.lastHeartbeat,
    memoryMb: Number(r.memoryMb),
    cpuPercent: Number(r.cpuPercent),
    pid: Number(r.pid),
    isCritical: Boolean(r.isCritical),
    isLaunchdManaged: Boolean(r.isLaunchdManaged),
    launchdLabel: r.launchdLabel,
    incidentNote: r.incidentNote,
    errorDetails: r.errorDetails,
    restartCmd: r.restartCmd,
  };
}

export function deleteService(id: string): void {
  db.prepare(`DELETE FROM services WHERE id = ?`).run(id);
}

// =========================================================================
// 2. EMAIL NOTIFICATIONS (邮件通知与闭环批复)
// =========================================================================
const upsertEmailStmt = db.prepare(`
  INSERT INTO email_notifications (
    id, notificationType, date, subject, content, archiveStatus,
    ledgerStatus, nextStepSuggestion, sender, recipient, suggestedAgent,
    priority, rawSource, replies_json, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    notificationType = excluded.notificationType,
    date = excluded.date,
    subject = excluded.subject,
    content = excluded.content,
    archiveStatus = excluded.archiveStatus,
    ledgerStatus = excluded.ledgerStatus,
    nextStepSuggestion = excluded.nextStepSuggestion,
    sender = excluded.sender,
    recipient = excluded.recipient,
    suggestedAgent = excluded.suggestedAgent,
    priority = excluded.priority,
    rawSource = excluded.rawSource,
    replies_json = excluded.replies_json,
    updated_at = excluded.updated_at
`);

export function upsertEmailNotification(e: EmailNotification): void {
  const nowStr = new Date().toISOString();
  upsertEmailStmt.run(
    e.id,
    e.notificationType || '新商机邮件通知',
    e.date || '',
    e.subject || '',
    e.content || '',
    e.archiveStatus || '暂未归档',
    e.ledgerStatus || '待处理',
    e.nextStepSuggestion || '',
    e.sender || '',
    e.recipient || '',
    e.suggestedAgent || '',
    e.priority || 'normal',
    e.rawSource || '',
    JSON.stringify(e.replies || []),
    nowStr,
    nowStr
  );
}

export function getAllEmailNotifications(): EmailNotification[] {
  const rows = db.prepare(`SELECT * FROM email_notifications ORDER BY updated_at DESC`).all() as any[];
  return rows.map((r) => {
    let replies: EmailReplyRecord[] = [];
    try {
      replies = r.replies_json ? JSON.parse(r.replies_json) : [];
    } catch {
      replies = [];
    }
    return {
      id: r.id,
      notificationType: r.notificationType,
      date: r.date,
      subject: r.subject,
      content: r.content,
      archiveStatus: r.archiveStatus,
      ledgerStatus: r.ledgerStatus as '待处理' | '已处理' | '已闭环' | '暂缓',
      nextStepSuggestion: r.nextStepSuggestion,
      sender: r.sender,
      recipient: r.recipient,
      suggestedAgent: r.suggestedAgent,
      priority: (r.priority || 'normal') as 'critical' | 'high' | 'normal',
      rawSource: r.rawSource,
      replies,
    };
  });
}

export function getEmailNotificationById(id: string): EmailNotification | null {
  const r = db.prepare(`SELECT * FROM email_notifications WHERE id = ?`).get(id) as any;
  if (!r) return null;
  let replies: EmailReplyRecord[] = [];
  try {
    replies = r.replies_json ? JSON.parse(r.replies_json) : [];
  } catch {
    replies = [];
  }
  return {
    id: r.id,
    notificationType: r.notificationType,
    date: r.date,
    subject: r.subject,
    content: r.content,
    archiveStatus: r.archiveStatus,
    ledgerStatus: r.ledgerStatus as '待处理' | '已处理' | '已闭环' | '暂缓',
    nextStepSuggestion: r.nextStepSuggestion,
    sender: r.sender,
    recipient: r.recipient,
    suggestedAgent: r.suggestedAgent,
    priority: (r.priority || 'normal') as 'critical' | 'high' | 'normal',
    rawSource: r.rawSource,
    replies,
  };
}

export function addEmailReply(
  emailId: string,
  reply: EmailReplyRecord,
  newLedgerStatus: '待处理' | '已处理' | '已闭环' | '暂缓' = '已闭环',
  newArchiveStatus?: string
): EmailNotification | null {
  const email = getEmailNotificationById(emailId);
  if (!email) return null;

  email.replies.push(reply);
  email.ledgerStatus = newLedgerStatus;
  if (newArchiveStatus) {
    email.archiveStatus = newArchiveStatus;
  } else if (email.archiveStatus.includes('暂未归档')) {
    email.archiveStatus = `已建档派单 (责任 Agent: ${reply.assignedAgent})`;
  }

  upsertEmailNotification(email);
  return email;
}

export function deleteEmailNotification(id: string): void {
  db.prepare(`DELETE FROM email_notifications WHERE id = ?`).run(id);
}

// =========================================================================
// 3. WORKFLOWS (业务台账与协作契约)
// =========================================================================
const upsertWorkflowStmt = db.prepare(`
  INSERT INTO workflows (
    id, code, title, version, category, description, status,
    leadResponsibleAgent, outputPath, steps_json, rules_json, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    code = excluded.code,
    title = excluded.title,
    version = excluded.version,
    category = excluded.category,
    description = excluded.description,
    status = excluded.status,
    leadResponsibleAgent = excluded.leadResponsibleAgent,
    outputPath = excluded.outputPath,
    steps_json = excluded.steps_json,
    rules_json = excluded.rules_json,
    updated_at = excluded.updated_at
`);

export function upsertWorkflow(wf: WorkflowRegistryItem): void {
  upsertWorkflowStmt.run(
    wf.id,
    wf.code,
    wf.title,
    wf.version || 'v1.0.0',
    wf.category || 'business',
    wf.description || '',
    wf.status || 'ACTIVE',
    wf.leadResponsibleAgent || '',
    wf.outputPath || '',
    JSON.stringify(wf.steps || []),
    JSON.stringify(wf.collaborationContractRules || []),
    new Date().toISOString()
  );
}

export function getAllWorkflows(): WorkflowRegistryItem[] {
  const rows = db.prepare(`SELECT * FROM workflows ORDER BY code ASC`).all() as any[];
  return rows.map((r) => {
    let steps = [];
    let rules = [];
    try {
      steps = r.steps_json ? JSON.parse(r.steps_json) : [];
    } catch {
      steps = [];
    }
    try {
      rules = r.rules_json ? JSON.parse(r.rules_json) : [];
    } catch {
      rules = [];
    }
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      version: r.version,
      category: r.category || 'business',
      description: r.description,
      status: (r.status || 'ACTIVE') as 'ACTIVE' | 'PAUSED' | 'MAINTENANCE',
      leadResponsibleAgent: r.leadResponsibleAgent,
      outputPath: r.outputPath,
      steps,
      collaborationContractRules: rules,
      updatedAt: r.updated_at,
    };
  });
}

export function getWorkflowById(idOrCode: string): WorkflowRegistryItem | null {
  const r = db.prepare(`SELECT * FROM workflows WHERE id = ? OR code = ?`).get(idOrCode, idOrCode) as any;
  if (!r) return null;
  let steps = [];
  let rules = [];
  try {
    steps = r.steps_json ? JSON.parse(r.steps_json) : [];
  } catch {
    steps = [];
  }
  try {
    rules = r.rules_json ? JSON.parse(r.rules_json) : [];
  } catch {
    rules = [];
  }
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    version: r.version,
    category: r.category || 'business',
    description: r.description,
    status: (r.status || 'ACTIVE') as 'ACTIVE' | 'PAUSED' | 'MAINTENANCE',
    leadResponsibleAgent: r.leadResponsibleAgent,
    outputPath: r.outputPath,
    steps,
    collaborationContractRules: rules,
    updatedAt: r.updated_at,
  };
}

export function updateWorkflowStepAgent(workflowId: string, stepId: string, newAgentId: string): WorkflowRegistryItem | null {
  const wf = getWorkflowById(workflowId);
  if (!wf) return null;
  wf.steps = wf.steps.map((st) => {
    if (st.id === stepId) {
      return { ...st, assignedAgentId: newAgentId };
    }
    return st;
  });
  upsertWorkflow(wf);
  return wf;
}

export function addWorkflowRule(workflowId: string, newRule: string): WorkflowRegistryItem | null {
  const wf = getWorkflowById(workflowId);
  if (!wf) return null;
  wf.collaborationContractRules = [...wf.collaborationContractRules, newRule];
  upsertWorkflow(wf);
  return wf;
}

export function toggleWorkflowStatus(workflowId: string): WorkflowRegistryItem | null {
  const wf = getWorkflowById(workflowId);
  if (!wf) return null;
  wf.status = wf.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  upsertWorkflow(wf);
  return wf;
}

// =========================================================================
// 4. AUDIT LOGS (审计日志留痕)
// =========================================================================
const insertAuditStmt = db.prepare(`
  INSERT INTO audit_logs (
    id, timestamp, editor, action, targetWorkflowId, summary,
    diffBefore, diffAfter, reason, created_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?
  )
  ON CONFLICT(id) DO NOTHING
`);

export function insertAuditLog(log: WorkflowAuditLog): void {
  insertAuditStmt.run(
    log.id,
    log.timestamp || new Date().toLocaleString(),
    log.editor || '系统管理员',
    log.action || 'STEP_UPDATE',
    log.targetWorkflowId || 'wf-01',
    log.summary || '',
    log.diffBefore || '',
    log.diffAfter || '',
    log.reason || '',
    new Date().toISOString()
  );
}

export function getAllAuditLogs(limit = 100): WorkflowAuditLog[] {
  const rows = db.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`).all(limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    editor: r.editor,
    action: (r.action || 'STEP_UPDATE') as 'CREATE' | 'STEP_UPDATE' | 'OWNER_CHANGE' | 'RULE_REVISED' | 'EMERGENCY_OVERRIDE',
    targetWorkflowId: r.targetWorkflowId,
    summary: r.summary,
    diffBefore: r.diffBefore,
    diffAfter: r.diffAfter,
    reason: r.reason,
  }));
}

// =========================================================================
// 5. HEALTH LOGS (轻量级探活日志)
// =========================================================================
const insertHealthLogStmt = db.prepare(`
  INSERT INTO health_logs (
    id, timestamp, serviceId, serviceName, level,
    message, latencyMs, lossRisk, created_at
  ) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?
  )
  ON CONFLICT(id) DO NOTHING
`);

export function insertHealthLog(log: HealthLogEntry): void {
  insertHealthLogStmt.run(
    log.id,
    log.timestamp || new Date().toLocaleTimeString(),
    log.serviceId,
    log.serviceName,
    log.level,
    log.message,
    Number(log.latencyMs) || 0,
    log.lossRisk ? 1 : 0,
    new Date().toISOString()
  );
}

export function getAllHealthLogs(limit = 100): HealthLogEntry[] {
  const rows = db.prepare(`SELECT * FROM health_logs ORDER BY created_at DESC LIMIT ?`).all(limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    serviceId: r.serviceId,
    serviceName: r.serviceName,
    level: r.level as 'info' | 'warn' | 'error' | 'fatal',
    message: r.message,
    latencyMs: Number(r.latencyMs),
    lossRisk: Boolean(r.lossRisk),
  }));
}

// =========================================================================
// 6. AGENT SESSION OUTBOX (发往 Agent 会话的闭环报文)
// =========================================================================
const insertOutboxStmt = db.prepare(`
  INSERT INTO agent_session_outbox (
    id, emailId, emailSubject, targetAgent, targetSessionId,
    sentAt, author, directive, formattedCitation, status, created_at
  ) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?
  )
  ON CONFLICT(id) DO NOTHING
`);

export function insertOutboxMessage(msg: AgentSessionOutboundMessage): void {
  insertOutboxStmt.run(
    msg.id,
    msg.emailId || '',
    msg.emailSubject || '',
    msg.targetAgent,
    msg.targetSessionId,
    msg.sentAt,
    msg.author,
    msg.directive,
    msg.formattedCitation || '',
    msg.status || 'delivered',
    new Date().toISOString()
  );
}

export function getAllOutboxMessages(): AgentSessionOutboundMessage[] {
  const rows = db.prepare(`SELECT * FROM agent_session_outbox ORDER BY created_at DESC`).all() as any[];
  return rows.map((r) => ({
    id: r.id,
    emailId: r.emailId,
    emailSubject: r.emailSubject,
    targetAgent: r.targetAgent,
    targetSessionId: r.targetSessionId,
    sentAt: r.sentAt,
    author: r.author,
    directive: r.directive,
    formattedCitation: r.formattedCitation,
    status: r.status as 'delivered' | 'read' | 'pending',
  }));
}

// =========================================================================
// 7. DB STATS (状态检测与元数据)
// =========================================================================
export function getDbStats() {
  let fileSize = 0;
  try {
    const stat = fs.statSync(DB_PATH);
    fileSize = stat.size;
  } catch {}

  const serviceCount = (db.prepare(`SELECT COUNT(*) as c FROM services`).get() as any)?.c || 0;
  const emailCount = (db.prepare(`SELECT COUNT(*) as c FROM email_notifications`).get() as any)?.c || 0;
  const workflowCount = (db.prepare(`SELECT COUNT(*) as c FROM workflows`).get() as any)?.c || 0;
  const auditCount = (db.prepare(`SELECT COUNT(*) as c FROM audit_logs`).get() as any)?.c || 0;
  const healthCount = (db.prepare(`SELECT COUNT(*) as c FROM health_logs`).get() as any)?.c || 0;
  const outboxCount = (db.prepare(`SELECT COUNT(*) as c FROM agent_session_outbox`).get() as any)?.c || 0;

  return {
    engine: 'SQLite3 (node:sqlite)',
    dbPath: DB_PATH,
    sizeBytes: fileSize,
    sizeKb: Math.round(fileSize / 1024),
    journalMode: 'WAL',
    tableCounts: {
      services: Number(serviceCount),
      emailNotifications: Number(emailCount),
      workflows: Number(workflowCount),
      auditLogs: Number(auditCount),
      healthLogs: Number(healthCount),
      agentSessionOutbox: Number(outboxCount),
    },
  };
}

// =========================================================================
// 8. DATABASE WIPE / RESET TO PURE CLEAN BASELINE (零数据重置)
// =========================================================================
export function clearAllData(): void {
  db.prepare(`DELETE FROM services`).run();
  db.prepare(`DELETE FROM email_notifications`).run();
  db.prepare(`DELETE FROM workflows`).run();
  db.prepare(`DELETE FROM audit_logs`).run();
  db.prepare(`DELETE FROM health_logs`).run();
  db.prepare(`DELETE FROM agent_session_outbox`).run();
  db.prepare(`VACUUM`).run();
  console.log('[OpenClaw Hub SQLite] 已彻底清空所有表数据，系统重置为零模拟纯净基准。');
}
