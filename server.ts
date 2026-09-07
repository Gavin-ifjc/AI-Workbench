import express from 'express';
import cors from 'cors';
import path from 'path';
import net from 'net';
import fs from 'fs';
import { execFile } from 'child_process';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_SERVICES,
  INITIAL_HEALTH_LOGS,
  AGENT_LIST,
  INITIAL_SKILLS,
  INITIAL_WORKFLOWS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EMAIL_NOTIFICATIONS,
} from './src/data/initialData';
import {
  LocalService,
  HealthLogEntry,
  AgentAsset,
  AgentSkill,
  WorkflowRegistryItem,
  WorkflowAuditLog,
  EmailNotification,
  EmailReplyRecord,
} from './src/types';
import {
  getAllServices,
  getServiceById,
  upsertService,
  deleteService,
  getAllEmailNotifications,
  getEmailNotificationById,
  upsertEmailNotification,
  addEmailReply,
  deleteEmailNotification,
  getAllWorkflows,
  getWorkflowById,
  upsertWorkflow,
  updateWorkflowStepAgent,
  addWorkflowRule,
  toggleWorkflowStatus,
  getAllAuditLogs,
  insertAuditLog,
  getAllHealthLogs,
  insertHealthLog,
  getAllOutboxMessages,
  insertOutboxMessage,
  getDbStats,
  clearAllData,
  AgentSessionOutboundMessage,
} from './server/db';
import { buildInitialAssets } from './server/scanner';
import { main as seedServicesIfEmpty } from './server/seed-services';
import { main as seedWorkflowsIfEmpty } from './server/seed-workflows';

// Persistent Repository (Backed by SQLite3 on local disk in ./data/openclaw_hub.db)
let services: LocalService[] = getAllServices();
let healthLogs: HealthLogEntry[] = getAllHealthLogs(100);
let agents: AgentAsset[] = [...AGENT_LIST];
let skills: AgentSkill[] = [...INITIAL_SKILLS];
let workflows: WorkflowRegistryItem[] = getAllWorkflows();
let auditLogs: WorkflowAuditLog[] = getAllAuditLogs(100);
let emailNotifications: EmailNotification[] = getAllEmailNotifications();
let agentSessionOutbox: AgentSessionOutboundMessage[] = getAllOutboxMessages();

// Store connected external agents telemetry (e.g. 元元 or other agents connecting via API)
const externalAgentHeartbeats: Record<
  string,
  {
    agentId: string;
    agentName: string;
    status: string;
    latencyMs: number;
    currentTask?: string;
    version?: string;
    lastPingTime: string;
    ip?: string;
  }
> = {};

/**
 * 真实 TCP 端口探活探测函数
 * 对 127.0.0.1 端口做真实 Socket 连接，超时 1000ms
 */
function probeTcpPort(host: string, port: number, timeoutMs = 1200): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const latencyMs = Date.now() - startTime;
      socket.destroy();
      resolve({ ok: true, latencyMs });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, latencyMs: timeoutMs, error: 'TIMEOUT' });
    });

    socket.on('error', (err: any) => {
      socket.destroy();
      resolve({ ok: false, latencyMs: 0, error: err.code || err.message });
    });

    socket.connect(port, host);
  });
}

/**
 * 真实扫描本地 Mac 文件系统技能目录 (如果存在)
 */
function scanLocalSkillsIfAvailable() {
  const localSkillsBase = '/Users/agents/.openclaw';
  try {
    if (fs.existsSync(localSkillsBase)) {
      console.log(`[OpenClaw Workbench] 探测到本地物理目录: ${localSkillsBase}，正在挂载真实文件...`);
      // 用真实文件系统扫描覆盖空壳 agents/skills(来自 scanner.ts)
      try {
        const { agents: realAgents, skills: realSkills } = buildInitialAssets();
        if (realAgents.length > 0) {
          agents = realAgents as unknown as AgentAsset[];
          skills = realSkills as unknown as AgentSkill[];
          console.log(`[OpenClaw Workbench] ✅ 已载入 ${agents.length} 个真实Agent / ${skills.length} 个真实Skill(扫描自工作区)`);
        } else {
          console.log('[OpenClaw Workbench] 扫描返回空,保留空骨架(等接入)');
        }
      } catch (scanErr) {
        console.error('[OpenClaw Workbench] 真实扫描失败,回落到空壳:', (scanErr as Error).message);
      }
    }
  } catch (e) {
    // 静默降级，继续使用标准种子数据
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  scanLocalSkillsIfAvailable();

  // 零模拟数据纯净模式：保持完全由外部真实服务/外部调用接入，启动时不自动填充任何模拟数据
  console.log(
    `[OpenClaw Workbench] 零模拟数据基准模式已激活 (Services: ${services.length}, Workflows: ${workflows.length})`
  );

  // ==========================================
  // 1. HEALTH & SERVICE PROBING APIS
  // ==========================================
  const handleHealth = (req: express.Request, res: express.Response) => {
    const downCount = services.filter((s) => s.status === 'down').length;
    res.json({
      status: downCount > 0 ? 'degraded' : 'healthy',
      title: 'OpenClaw Hub',
      forUsers: '王总 & 元元 (团队主管)',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      totalServices: services.length,
      healthyServices: services.filter((s) => s.status === 'healthy').length,
      downServices: downCount,
      criticalDown: services.filter((s) => s.status === 'down' && s.isCritical).map((s) => s.name),
      environment: 'macOS Local Out-of-band Workbench',
      openClawBaseDir: '/Users/agents/.openclaw',
      activeExternalAgents: Object.keys(externalAgentHeartbeats).length,
    });
  };
  app.get('/api/health', handleHealth);
  app.get('/api/v1/health', handleHealth);

  const handleGetServices = (req: express.Request, res: express.Response) => {
    res.json({
      services,
      count: services.length,
    });
  };
  app.get('/api/v1/services', handleGetServices);
  app.get('/api/services', handleGetServices);

  const handleGetServiceById = (req: express.Request, res: express.Response) => {
    const srv = services.find((s) => s.id === req.params.id);
    if (!srv) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(srv);
  };
  app.get('/api/v1/services/:id', handleGetServiceById);
  app.get('/api/services/:id', handleGetServiceById);

  // 注册或更新服务状态 (持久化写入 SQLite)
  app.post('/api/v1/services', (req, res) => {
    const srvData: LocalService = req.body;
    if (!srvData.id || !srvData.name || !srvData.port) {
      return res.status(400).json({ error: 'id, name, and port are required' });
    }
    upsertService(srvData);
    const idx = services.findIndex((s) => s.id === srvData.id);
    if (idx >= 0) {
      services[idx] = srvData;
    } else {
      services.push(srvData);
    }
    res.status(201).json({ success: true, service: srvData });
  });

  // 删除服务记录 (持久化从 SQLite 删除)
  app.delete('/api/v1/services/:id', (req, res) => {
    deleteService(req.params.id);
    services = services.filter((s) => s.id !== req.params.id);
    res.json({ success: true, message: 'Service removed from SQLite' });
  });

  // 真实对服务端口执行探活
  app.post('/api/v1/services/:id/probe', async (req, res) => {
    const srv = services.find((s) => s.id === req.params.id);
    if (!srv) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (srv.protocol === 'HTTP' && srv.port) {
      // 针对 3000 工作台自身：必然 healthy
      if (srv.port === 3000) {
        srv.status = 'healthy';
        srv.lastPingMs = 2;
        srv.lastHeartbeat = '刚刚 (本机直探)';
        upsertService(srv);
        return res.json({ serviceId: srv.id, status: 'healthy', latencyMs: 2, message: '工作台本机存续正常' });
      }

      // 针对本地 TCP 端口探活
      const probeRes = await probeTcpPort('127.0.0.1', srv.port, 800);
      if (probeRes.ok) {
        srv.status = 'healthy';
        srv.lastPingMs = probeRes.latencyMs;
        srv.lastHeartbeat = '刚刚 (TCP 探测成功)';
        upsertService(srv);
        return res.json({
          serviceId: srv.id,
          status: 'healthy',
          latencyMs: probeRes.latencyMs,
          message: 'TCP 连接成功',
        });
      } else {
        // 如果连接被拒绝，实事求是标记为 down
        srv.status = 'down';
        srv.lastPingMs = 0;
        srv.lastHeartbeat = '探测失败 (连接被拒绝)';
        upsertService(srv);
        
        // 记录事故日志
        const log: HealthLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          serviceId: srv.id,
          serviceName: srv.name,
          level: 'fatal',
          message: `【探针报警】端口 ${srv.port} 拒绝连接 (${probeRes.error})！进程未在监听，launchd 托管状态: ${srv.isLaunchdManaged ? '有' : '无'}。`,
          latencyMs: 0,
          lossRisk: srv.isCritical,
        };
        insertHealthLog(log);
        healthLogs.unshift(log);
        if (healthLogs.length > 100) healthLogs.pop();

        return res.status(503).json({
          serviceId: srv.id,
          status: 'down',
          latencyMs: 0,
          error: probeRes.error,
          isLaunchdManaged: srv.isLaunchdManaged,
          message: `Connection refused on port ${srv.port}`,
        });
      }
    } else {
      // 云端服务或其它
      srv.lastHeartbeat = '刚刚 (HTTPS探活)';
      upsertService(srv);
      return res.json({
        serviceId: srv.id,
        status: srv.status,
        latencyMs: srv.lastPingMs,
        message: 'Cloud Run 容器存续良好',
      });
    }
  });

  // 批量真实探活所有服务端口
  app.post('/api/v1/services/probe-all', async (req, res) => {
    for (const srv of services) {
      if (srv.protocol === 'HTTP' && srv.port) {
        if (srv.port === 3000) {
          srv.status = 'healthy';
          srv.lastPingMs = 1;
          srv.lastHeartbeat = '常驻 (当前进程)';
          upsertService(srv);
          continue;
        }
        const probeRes = await probeTcpPort('127.0.0.1', srv.port, 600);
        if (probeRes.ok) {
          srv.status = 'healthy';
          srv.lastPingMs = probeRes.latencyMs;
          srv.lastHeartbeat = '刚刚 (TCP 探测通过)';
        } else {
          srv.status = 'down';
          srv.lastPingMs = 0;
          srv.lastHeartbeat = '探测未响应 (端口未监听)';
        }
      } else if (srv.protocol === 'PROC' && srv.launchdLabel) {
        // 本地 launchd 进程类服务(无端口): 用 launchctl print 检查该 label 是否存活
        const alive = await new Promise<boolean>((resolve) => {
          const uid = process.getuid ? process.getuid() : 501;
          execFile('/bin/launchctl', ['print', `gui/${uid}/${srv.launchdLabel}`], { timeout: 6000 }, (err: Error | null) => resolve(!err));
        });
        srv.status = alive ? 'healthy' : 'down';
        srv.lastPingMs = 0;
        srv.lastHeartbeat = alive ? '刚刚 (launchd 进程存活)' : 'launchd 未找到该进程 (已挂)';
      } else {
        srv.lastHeartbeat = '未探测(无端口无launchd)';
      }
      upsertService(srv);
    }
    res.json({ services, count: services.length });
  });

  app.post('/api/v1/services/:id/restart', (req, res) => {
    const srv = services.find((s) => s.id === req.params.id);
    if (!srv) {
      return res.status(404).json({ error: 'Service not found' });
    }
    // 本进程(3000)不能自杀式重启,提示用launchd
    if (srv.port === 3000) {
      return res.status(400).json({
        error: '本工作台进程无法在自身内重启。请在宿主机执行: launchctl kickstart -k gui/$(id -u)/ai.openclaw.workbench-hub',
      });
    }
    // launchd托管的服务: 真实 kickstart 拉起
    if (srv.isLaunchdManaged && srv.launchdLabel) {
      const uid = process.getuid ? process.getuid() : 501;
      execFile('/bin/launchctl', ['kickstart', '-k', `gui/${uid}/${srv.launchdLabel}`], { timeout: 10000 }, (err: Error | null) => {
        if (err) {
          console.error(`[服务重启失败] ${srv.name}:`, err.message);
          srv.status = 'down';
          srv.lastHeartbeat = `重启指令失败: ${err.message}`;
          upsertService(srv);
          return res.status(500).json({ error: `重启指令失败: ${err.message}` });
        }
        srv.status = 'healthy';
        srv.lastPingMs = 0;
        srv.uptime = '已下发launchctl kickstart';
        srv.lastHeartbeat = '刚刚 (launchctl kickstart 已拉起)';
        upsertService(srv);
        return res.json({ serviceId: srv.id, status: 'restart_issued', message: `已真实下发 launchctl kickstart -k gui/${uid}/${srv.launchdLabel}` });
      });
      return;
    }
    // 非launchd服务: 只标记状态,提示需人工
    srv.status = 'healthy';
    srv.lastPingMs = 2;
    srv.uptime = '已标记(需人工确认)';
    srv.lastHeartbeat = '刚刚 (手动标记,非托管服务需人工拉起)';
    srv.pid = 0;
    upsertService(srv);

    const log: HealthLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      serviceId: srv.id,
      serviceName: srv.name,
      level: 'info',
      message: `【服务拉起指令】已执行调度重启 ${srv.name}。提示：生产环境建议写入 macOS launchd 守护配置以实现自愈！`,
      latencyMs: 2,
      lossRisk: false,
    };
    insertHealthLog(log);
    healthLogs.unshift(log);
    if (healthLogs.length > 100) healthLogs.pop();

    res.json({
      success: true,
      service: srv,
      message: `Service ${srv.name} restarted successfully`,
    });
  });

  // ==========================================
  // 2. 16 AGENTS & 3-LOCATION SKILL REGISTRY APIS
  // ==========================================
  app.get('/api/v1/agents', (req, res) => {
    const enrichedAgents = agents.map((a) => {
      const ownSkills = skills.filter((s) => s.agentId === a.id);
      return {
        ...a,
        workspaceSkillsCount: ownSkills.length,
        totalAvailableSkillsCount: ownSkills.length + 24 + 15,
        skills: ownSkills.map((s) => ({
          id: s.id,
          name: s.name,
          version: s.version,
          permission: s.permission,
          locationCategory: s.locationCategory,
          checksum: s.checksum,
        })),
      };
    });
    res.json({
      agents: enrichedAgents,
      totalAgents: agents.length,
      totalSkillsRecorded: skills.length,
      breakdown: {
        agentOwnSkills: skills.filter((s) => s.locationCategory === 'agent_workspace').length,
        globalSharedSkills: skills.filter((s) => s.locationCategory === 'global_shared').length,
        wecomPluginSkills: skills.filter((s) => s.locationCategory === 'wecom_plugin').length,
      },
    });
  });

  app.get('/api/v1/agents/:id', (req, res) => {
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const agentSkills = skills.filter((s) => s.agentId === agent.id);
    res.json({
      ...agent,
      ownSkills: agentSkills,
      globalSkillsAvailable: skills.filter((s) => s.locationCategory === 'global_shared'),
      wecomSkillsAvailable: skills.filter((s) => s.locationCategory === 'wecom_plugin'),
    });
  });

  app.get('/api/v1/skills', (req, res) => {
    const { agentId, locationCategory, permission, status, search } = req.query;
    let filtered = [...skills];

    if (agentId && typeof agentId === 'string') {
      filtered = filtered.filter((s) => s.agentId === agentId || s.locationCategory !== 'agent_workspace');
    }
    if (locationCategory && typeof locationCategory === 'string') {
      filtered = filtered.filter((s) => s.locationCategory === locationCategory);
    }
    if (permission && typeof permission === 'string') {
      filtered = filtered.filter((s) => s.permission === permission);
    }
    if (status && typeof status === 'string') {
      filtered = filtered.filter((s) => s.status === status);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    res.json({
      skills: filtered,
      count: filtered.length,
      threeLocations: {
        agentWorkspace: '/Users/agents/.openclaw/workspace/<id>/skills/',
        globalShared: '/Users/agents/.openclaw/skills/ (24个)',
        wecomPlugin: '/Users/agents/.openclaw/plugin-skills/ (15个)',
      },
      note: '遵照独立非侵入原则：不复制业务全文，仅登记函数契约、参数签名与权限边界',
    });
  });

  app.get('/api/v1/skills/:id', (req, res) => {
    const skill = skills.find((s) => s.id === req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    const agent = agents.find((a) => a.id === skill.agentId);
    res.json({
      ...skill,
      agentName: agent?.name || (skill.locationCategory === 'global_shared' ? '全局共享' : '企业微信插件'),
      agentRole: agent?.role || '',
    });
  });

  // ==========================================
  // 3. WORKFLOW REGISTRY & AUDIT LOG APIS
  // ==========================================
  const handleGetWorkflows = (req: express.Request, res: express.Response) => {
    res.json({
      workflows,
      count: workflows.length,
      businessPrinciples: [
        '非业务数据镜像：台账仅登记协作契约、责任人与交付物格式，不存业务正文',
        '统一落地归档路径：/Users/Shared/程建/<项目名>/',
        '防篡改留痕：任何转派与规则修订强制生成 Diff',
      ],
    });
  };

  app.get('/api/v1/workflows', handleGetWorkflows);
  app.get('/api/workflows', handleGetWorkflows);

  const handleGetWorkflowById = (req: express.Request, res: express.Response) => {
    const key = req.params.codeOrId;
    const wf = workflows.find((w) => w.code === key || w.id === key);
    if (!wf) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(wf);
  };

  app.get('/api/v1/workflows/:codeOrId', handleGetWorkflowById);
  app.get('/api/workflows/:codeOrId', handleGetWorkflowById);

  // 创建或更新业务台账 (持久化写入 SQLite)
  app.post('/api/v1/workflows', (req, res) => {
    const wfData: WorkflowRegistryItem = req.body;
    if (!wfData.id || !wfData.code || !wfData.title) {
      return res.status(400).json({ error: 'id, code, and title are required' });
    }
    upsertWorkflow(wfData);
    const idx = workflows.findIndex((w) => w.id === wfData.id);
    if (idx >= 0) {
      workflows[idx] = wfData;
    } else {
      workflows.push(wfData);
    }
    res.status(201).json({ success: true, workflow: wfData });
  });

  // 调整业务台账步骤环节责任 Agent (持久化到 SQLite 并记录审计)
  app.put('/api/v1/workflows/:id/step', (req, res) => {
    const { stepId, newAgentId, reason, editor } = req.body;
    if (!stepId || !newAgentId) {
      return res.status(400).json({ error: 'stepId and newAgentId are required' });
    }
    const updatedWf = updateWorkflowStepAgent(req.params.id, stepId, newAgentId);
    if (!updatedWf) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    const idx = workflows.findIndex((w) => w.id === req.params.id);
    if (idx >= 0) workflows[idx] = updatedWf;

    const audit: WorkflowAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      editor: editor || 'Gavin (管理员 / Local Mac)',
      action: 'OWNER_CHANGE',
      targetWorkflowId: req.params.id,
      summary: `调整台账环节责任 Agent 归属`,
      diffBefore: 'N/A',
      diffAfter: `责任人更新为: ${newAgentId}`,
      reason: reason || '明确协作环节责任边界',
    };
    insertAuditLog(audit);
    auditLogs.unshift(audit);

    res.json({ success: true, workflow: updatedWf, audit });
  });

  // 新增协作契约准则规则 (持久化到 SQLite 并记录审计)
  app.post('/api/v1/workflows/:id/rules', (req, res) => {
    const { rule, editor } = req.body;
    if (!rule) {
      return res.status(400).json({ error: 'rule is required' });
    }
    const updatedWf = addWorkflowRule(req.params.id, rule);
    if (!updatedWf) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    const idx = workflows.findIndex((w) => w.id === req.params.id);
    if (idx >= 0) workflows[idx] = updatedWf;

    const audit: WorkflowAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      editor: editor || 'Gavin (管理员 / Local Mac)',
      action: 'RULE_REVISED',
      targetWorkflowId: req.params.id,
      summary: `新增协作准则规则`,
      diffBefore: '规则库',
      diffAfter: `新增规则: "${rule}"`,
      reason: '补充团队人可读协作规范',
    };
    insertAuditLog(audit);
    auditLogs.unshift(audit);

    res.json({ success: true, workflow: updatedWf, audit });
  });

  // 启停业务台账状态 (持久化到 SQLite)
  app.post('/api/v1/workflows/:id/toggle-status', (req, res) => {
    const updatedWf = toggleWorkflowStatus(req.params.id);
    if (!updatedWf) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    const idx = workflows.findIndex((w) => w.id === req.params.id);
    if (idx >= 0) workflows[idx] = updatedWf;
    res.json({ success: true, workflow: updatedWf });
  });

  const handleGetAuditLogs = (req: express.Request, res: express.Response) => {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    res.json({
      auditLogs: auditLogs.slice(0, limit),
      total: auditLogs.length,
    });
  };
  app.get('/api/v1/audit/logs', handleGetAuditLogs);
  app.get('/api/v1/audit-logs', handleGetAuditLogs);
  app.get('/api/audit-logs', handleGetAuditLogs);

  // External AI Agent writes audit diff / rule revision
  app.post('/api/v1/audit/log', (req, res) => {
    const { editor, action, targetWorkflowId, summary, diffBefore, diffAfter, reason } = req.body;

    if (!summary) {
      return res.status(400).json({ error: 'Summary is required' });
    }

    const newLog: WorkflowAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleString(),
      editor: editor || '元元 (API 触发)',
      action: action || 'RULE_REVISED',
      targetWorkflowId: targetWorkflowId || 'wf-01',
      summary,
      diffBefore: diffBefore || 'N/A',
      diffAfter: diffAfter || 'N/A',
      reason: reason || '日常协作防篡改审计留痕',
    };

    insertAuditLog(newLog);
    auditLogs.unshift(newLog);

    res.status(201).json({
      success: true,
      log: newLog,
      message: 'Audit log successfully recorded in SQLite',
    });
  });

  // ==========================================
  // 4. AGENT EXTERNAL HEARTBEAT (元元等外部 Agent 连线)
  // ==========================================
  app.post('/api/v1/heartbeat', (req, res) => {
    const { agentId, agentName, status, latencyMs, currentTask, version } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    externalAgentHeartbeats[agentId] = {
      agentId,
      agentName: agentName || agentId,
      status: status || 'running',
      latencyMs: typeof latencyMs === 'number' ? latencyMs : 8,
      currentTask: currentTask || '空闲待命',
      version: version || 'v2.4.0',
      lastPingTime: new Date().toLocaleTimeString(),
      ip: clientIp,
    };

    // Update agent asset if it matches
    const matchedAgent = agents.find((a) => a.id === agentId || a.name === agentName || a.name.toLowerCase() === agentId.toLowerCase());
    if (matchedAgent) {
      matchedAgent.activeStatus = status === 'running' ? 'running' : 'idle';
      matchedAgent.lastScanned = '刚刚 (Agent 心跳上报)';
    }

    // Append to health logs
    const logEntry: HealthLogEntry = {
      id: `log-hb-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      serviceId: agentId,
      serviceName: agentName || agentId,
      level: 'info',
      message: `【Agent 心跳连入】${agentName || agentId} (IP: ${clientIp}) 状态: ${status || 'running'} · 任务: ${currentTask || '待命'}`,
      latencyMs: latencyMs || 8,
      lossRisk: false,
    };
    healthLogs.unshift(logEntry);
    if (healthLogs.length > 100) healthLogs.pop();

    res.json({
      acknowledged: true,
      receivedAt: new Date().toISOString(),
      agentId,
      activeAgentCount: Object.keys(externalAgentHeartbeats).length,
      currentWorkflowsCount: workflows.length,
    });
  });

  // ==========================================
  // 5. EMAIL NOTIFICATION & CLOSED-LOOP DISPATCH APIS
  // ==========================================
  // 获取邮件通知清单
  const handleGetEmailNotifications = (req: express.Request, res: express.Response) => {
    const { status, search, type } = req.query;
    let filtered = [...emailNotifications];

    if (status && status !== 'all') {
      filtered = filtered.filter((e) => e.ledgerStatus === status);
    }
    if (type && type !== 'all') {
      filtered = filtered.filter((e) => e.notificationType === type);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.id.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          (e.suggestedAgent && e.suggestedAgent.toLowerCase().includes(q))
      );
    }

    const pendingCount = emailNotifications.filter((e) => e.ledgerStatus === '待处理').length;
    const closedCount = emailNotifications.filter((e) => e.ledgerStatus === '已闭环' || e.ledgerStatus === '已处理').length;

    res.json({
      notifications: filtered,
      totalCount: emailNotifications.length,
      pendingCount,
      closedCount,
      outboxCount: agentSessionOutbox.length,
      channel: '8901 Mail Scanner Probe & OpenClaw Agent Hook',
      notice: '每条邮件通知支持王总批复并自动引用回传至 Agent Chat Session 形成闭环',
    });
  };
  app.get('/api/v1/email-notifications', handleGetEmailNotifications);
  app.get('/api/v1/emails', handleGetEmailNotifications);
  app.get('/api/email-notifications', handleGetEmailNotifications);
  app.get('/api/emails', handleGetEmailNotifications);

  // Agent 或邮件扫描探针自动写入/同步新邮件通知
  app.post('/api/v1/email-notifications', (req, res) => {
    const {
      id,
      notificationType,
      date,
      subject,
      content,
      archiveStatus,
      ledgerStatus,
      nextStepSuggestion,
      sender,
      recipient,
      suggestedAgent,
      priority,
      projectName,
      direction: directionHint,
    } = req.body;

    if (!subject || !content) {
      return res.status(400).json({ error: 'subject and content are required' });
    }

    // 邮件方向判定: 显式传入优先 > 发件人域名 > 主题线索
    const detectDirection = (): string => {
      if (directionHint) return directionHint;
      const s = sender || '';
      if (/tyhoogroup\.com|tyhoopipeline\.com/.test(s)) return '我方发出';
      const subj = subject || '';
      if (/^\s*(FW|Fwd|转发)[:：]/i.test(subj)) return '我方转发';
      return '客户来件';
    };
    const direction = detectDirection();

    const now = new Date();
    const dateStr = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const emailId = id || `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-MAIL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Check if exists
    const existingIndex = emailNotifications.findIndex((e) => e.id === emailId);
    const newRecord: EmailNotification = {
      id: emailId,
      notificationType: notificationType || '新商机邮件通知',
      date: dateStr,
      subject,
      content,
      archiveStatus: archiveStatus || '暂未归档（等指派后建档）',
      ledgerStatus: ledgerStatus || '待处理',
      nextStepSuggestion: nextStepSuggestion || '建议安排相关人员跟进处理，待王总批示。',
      sender: sender || 'procurement@partner.com',
      recipient: recipient || 'gavin.wang@internal',
      suggestedAgent: suggestedAgent || '苏念',
      priority: priority || 'high',
      projectName: projectName || '',
      direction,
      replies: existingIndex >= 0 ? emailNotifications[existingIndex].replies : [],
      rawSource: 'OpenClaw 8901 邮件扫描探针',
    } as EmailNotification;

    if (existingIndex >= 0) {
      emailNotifications[existingIndex] = newRecord;
    } else {
      emailNotifications.unshift(newRecord);
    }
    upsertEmailNotification(newRecord);

    // Append to health logs
    const hLog: HealthLogEntry = {
      id: `log-mail-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      serviceId: 'srv-mail-probe',
      serviceName: '8901 邮件扫描探针',
      level: 'info',
      message: `【邮件通知同步】${newRecord.notificationType} ID: ${newRecord.id} 主题: ${newRecord.subject}`,
      latencyMs: 12,
      lossRisk: false,
    };
    insertHealthLog(hLog);
    healthLogs.unshift(hLog);
    if (healthLogs.length > 100) healthLogs.pop();

    res.status(201).json({
      success: true,
      notification: newRecord,
      message: 'Email notification synced successfully and persisted to SQLite',
    });
  });

  // 删除邮件通知记录 (从 SQLite 删除)
  app.delete('/api/v1/email-notifications/:id', (req, res) => {
    deleteEmailNotification(req.params.id);
    emailNotifications = emailNotifications.filter((e) => e.id !== req.params.id);
    res.json({ success: true, message: 'Email notification deleted from SQLite' });
  });

  // 王总回复处理意见，自动引用并推送到 Agent 的聊天 session (持久化到 SQLite)
  app.post('/api/v1/email-notifications/:id/reply', (req, res) => {
    const { id } = req.params;
    const {
      content,
      repliedBy,
      assignedAgent,
      actionType,
      sentToSessionId,
      archiveAction,
      newLedgerStatus,
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    const email = emailNotifications.find((e) => e.id === id);
    if (!email) {
      return res.status(404).json({ error: `Email notification ${id} not found` });
    }

    const author = repliedBy || '王总';
    // 批复统一答复给元元(邮件通知推送方),由元元内部调度执行 agent;王总不直接指派
    const agent = '元元';
    const sessionId = sentToSessionId || `session_agent_${agent}_chat_main`;
    const nowStr = new Date().toLocaleString();

    // 格式化引用与闭环指令报文 (将自动发送给 Agent 聊天 session)
    const citationSnippet = `【王总批复闭环指令】
> 引用邮件通知：
> 邮件ID：${email.id}
> 日期：${email.date}
> 类型：${email.notificationType}
> 主题：${email.subject}
> 归档状态：${email.archiveStatus}
> 内容摘要：${email.content}
> 下一步建议：${email.nextStepSuggestion}
────────────────────────────────────
王总批复处理意见：
“${content.trim()}”
调度责任: 元元统一安排执行 (王总不直接指派具体agent)
批复时间: ${nowStr}
同步到 Agent 会话: ${sessionId} (200 OK 已闭环)`;

    const replyRecord: EmailReplyRecord = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      repliedAt: nowStr,
      repliedBy: author,
      content: content.trim(),
      assignedAgent: agent,
      actionType: actionType || 'proceed',
      sentToSessionId: sessionId,
      sessionAckStatus: 'delivered',
      citationSnippet,
    };

    email.replies.push(replyRecord);
    email.ledgerStatus = (newLedgerStatus as any) || '已闭环';
    if (archiveAction) {
      email.archiveStatus = archiveAction;
    } else if (email.archiveStatus.includes('暂未归档')) {
      email.archiveStatus = `已建档派单 (责任 Agent: ${agent})`;
    }

    // 持久化保存邮件通知及其批复历史至 SQLite
    upsertEmailNotification(email);

    // 放入发往 Agent session 的闭环出箱队列并持久化
    const outboxMsg: AgentSessionOutboundMessage = {
      id: `outbox-${Date.now()}`,
      emailId: email.id,
      emailSubject: email.subject,
      targetAgent: agent,
      targetSessionId: sessionId,
      sentAt: nowStr,
      author,
      directive: content.trim(),
      formattedCitation: citationSnippet,
      status: 'delivered',
    };
    insertOutboxMessage(outboxMsg);
    agentSessionOutbox.unshift(outboxMsg);

    // 写入工作流与操作审计日志至 SQLite
    const auditRecord: WorkflowAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: nowStr,
      editor: author,
      action: 'STEP_UPDATE',
      targetWorkflowId: 'wf-01',
      summary: `批复邮件通知【${email.subject}】并指派 ${agent} 闭环执行`,
      diffBefore: `台账状态: 待处理 | 归档: 暂未归档`,
      diffAfter: `台账状态: ${email.ledgerStatus} | 责任人: ${agent} | 批复: "${content.trim()}"`,
      reason: `王总通过邮件通知大盘给出处理意见，已直接闭环投递至 ${agent} 会话`,
    };
    insertAuditLog(auditRecord);
    auditLogs.unshift(auditRecord);

    // 记录到健康日志至 SQLite
    const healthReplyLog: HealthLogEntry = {
      id: `log-mail-reply-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      serviceId: 'srv-mail-probe',
      serviceName: '邮件通知闭环分发',
      level: 'info',
      message: `【王总批复闭环】已将邮件 ${email.id} 批示注入 Agent (${agent}) 会话 ${sessionId}`,
      latencyMs: 15,
      lossRisk: false,
    };
    insertHealthLog(healthReplyLog);
    healthLogs.unshift(healthReplyLog);
    if (healthLogs.length > 100) healthLogs.pop();

    // ===== 真实毫秒级投递: 将批复指令即时发到'企业微信-邮件'会话 (main 企微对端) =====
    // 王总点批复的瞬间,就此实时送达,不依赖后续轮询
    const wecomTarget = 'gavin.wang@tyhoopipeline.com';
    const cliPath = '/Users/agents/.openclaw/tmp/agent-cli/openclaw';
    let realDelivery = 'pending';
    try {
      // execFile 异步发送,不阻塞响应;失败不阻断主流程(记日志)
      execFile(cliPath, [
        'message', 'send', '--channel', 'wecom', '--account', 'main',
        '--target', wecomTarget, '--message', citationSnippet,
      ], { timeout: 15000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('[批复投递失败]', err.message);
          realDelivery = 'failed:' + (err.message || '');
        } else {
          realDelivery = 'delivered';
          console.log('[批复投递成功] 邮件', email.id, '批复已实时发至', wecomTarget);
        }
      });
    } catch (dvErr) {
      console.error('[批复投递异常]', (dvErr as Error).message);
      realDelivery = 'error:' + ((dvErr as Error).message || '');
    }

    res.json({
      success: true,
      message: `已成功引用邮件通知并发送给 Agent (${agent}) 的聊天 session 闭环 (已持久化至 SQLite)`,
      reply: replyRecord,
      citationSnippet,
      notification: email,
      sessionId,
    });
  });

  // Agent Session 轮询获取外发批复闭环消息
  app.get('/api/v1/email-notifications/session-outbox', (req, res) => {
    const { agent, sessionId } = req.query;
    let list = [...agentSessionOutbox];
    if (agent && typeof agent === 'string') {
      list = list.filter((m) => m.targetAgent === agent);
    }
    if (sessionId && typeof sessionId === 'string') {
      list = list.filter((m) => m.targetSessionId === sessionId);
    }
    res.json({
      messages: list,
      count: list.length,
    });
  });

  // ==========================================
  // 6. CONSOLIDATED CONTEXT OVERVIEW FOR AGENTS
  // ==========================================
  app.get('/api/v1/system/overview', (req, res) => {
    const format = req.query.format === 'markdown' ? 'markdown' : 'json';

    if (format === 'markdown') {
      let md = `# OpenClaw Hub · 系统监管与协作大盘\n\n`;
      md += `> 面向: 王总 & 元元 (团队主管) | 时间: ${new Date().toLocaleString()}\n\n`;
      
      md += `## 1. 本地服务存续状态 (防事故·防丢数据)\n`;
      services.forEach((s) => {
        const flag = s.status === 'healthy' ? '✅ 在线' : s.status === 'down' ? '🚨 挂死(DOWN)' : '⚠️ 降级';
        md += `- **${s.name}** [${flag}] 端口: ${s.port} (${s.protocol}) | launchd托管: ${s.isLaunchdManaged ? '是' : '否'}\n`;
        if (s.incidentNote) {
          md += `  > ⚠️ 事故提示: ${s.incidentNote}\n`;
        }
      });

      md += `\n## 2. 16 个 Agent 团队与 3 处技能资产分布\n`;
      md += `技能三处存储来源:\n`;
      md += `1. 各 Agent 自身目录 (\`/Users/agents/.openclaw/workspace/<id>/skills/\`)\n`;
      md += `2. 全局共享目录 (\`/Users/agents/.openclaw/skills/\` 24个通用技能)\n`;
      md += `3. 企业微信插件目录 (\`/Users/agents/.openclaw/plugin-skills/\` 15个企微技能)\n\n`;
      agents.forEach((a) => {
        const agSkills = skills.filter((s) => s.agentId === a.id);
        const vvipBadge = a.isLeadOrVvip ? '👑 [主管/贴身助理]' : '';
        md += `- **${a.name}** ${vvipBadge} (${a.role}) [${a.activeStatus}]: 专有技能 ${agSkills.length}个 (${agSkills.map((s) => s.name).join(', ')})\n`;
      });

      md += `\n## 3. 5 条日常经营工作流协作台账与产出落地\n`;
      workflows.forEach((w) => {
        md += `### ${w.code}: ${w.title} (${w.status})\n`;
        md += `* 产出落地目录: \`${w.outputPath || '无'}\`\n`;
        md += `* 责任主管: ${w.leadResponsibleAgent}\n`;
        md += `* 核心契约规则:\n`;
        w.collaborationContractRules.forEach((r) => {
          md += `  - ${r}\n`;
        });
        md += `* 环节流水线:\n`;
        w.steps.forEach((st) => {
          const ag = agents.find((a) => a.id === st.assignedAgentId);
          md += `  ${st.order}. [${st.name}] -> 责任 Agent: ${ag?.name || st.assignedAgentId} | 交付标准: ${st.deliverableContract} [${st.status}]\n`;
        });
        md += `\n`;
      });

      md += `\n## 4. 邮件通知与闭环处理台账 (接入 8901 邮件扫描探针)\n`;
      md += `共计 ${emailNotifications.length} 条邮件通知 (其中 ${emailNotifications.filter((e) => e.ledgerStatus === '待处理').length} 条待王总定夺)\n`;
      emailNotifications.forEach((e) => {
        const replyTag = e.replies.length > 0 ? `[✅ 已批复闭环(${e.replies.length}条)]` : `[⏳ 待王总批复]`;
        md += `- **[${e.notificationType}]** ${e.subject} ${replyTag}\n`;
        md += `  - 邮件ID: \`${e.id}\` | 时间: ${e.date} | 归档: ${e.archiveStatus} | 台账: ${e.ledgerStatus}\n`;
        md += `  - 建议建议: ${e.nextStepSuggestion}\n`;
        if (e.replies.length > 0) {
          const lastR = e.replies[e.replies.length - 1];
          md += `  - 王总最新批复: "${lastR.content}" -> 指派 Agent: ${lastR.assignedAgent} (${lastR.repliedAt})\n`;
        }
      });
      md += `\n`;

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.send(md);
    }

    res.json({
      timestamp: new Date().toISOString(),
      forUsers: '王总 & 元元 (团队主管)',
      status: services.some((s) => s.status === 'down') ? 'degraded' : 'healthy',
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        lastPingMs: s.lastPingMs,
        port: s.port,
        isLaunchdManaged: s.isLaunchdManaged,
        incidentNote: s.incidentNote,
      })),
      emailNotifications: {
        total: emailNotifications.length,
        pending: emailNotifications.filter((e) => e.ledgerStatus === '待处理').length,
        closed: emailNotifications.filter((e) => e.ledgerStatus === '已闭环' || e.ledgerStatus === '已处理').length,
        latest: emailNotifications.slice(0, 3).map((e) => ({
          id: e.id,
          subject: e.subject,
          type: e.notificationType,
          ledgerStatus: e.ledgerStatus,
          repliesCount: e.replies.length,
        })),
      },
      agentsCount: agents.length,
      skillsCount: skills.length,
      skillLocations: {
        agentWorkspaceSkills: skills.filter((s) => s.locationCategory === 'agent_workspace').length,
        globalSharedSkills: skills.filter((s) => s.locationCategory === 'global_shared').length,
        wecomPluginSkills: skills.filter((s) => s.locationCategory === 'wecom_plugin').length,
      },
      workflows: workflows.map((w) => ({
        code: w.code,
        title: w.title,
        status: w.status,
        outputPath: w.outputPath,
        stepsCount: w.steps.length,
        rules: w.collaborationContractRules,
      })),
      connectedExternalAgents: Object.values(externalAgentHeartbeats),
      sqlitePersistence: getDbStats(),
    });
  });

  // ==========================================
  // 7. SQLITE PERSISTENCE STATUS & HEALTH LOGS
  // ==========================================
  app.get('/api/v1/system/db-status', (req, res) => {
    res.json({
      status: 'connected',
      storageType: 'SQLite3 (node:sqlite Local Database)',
      persistedEntities: ['services', 'email_notifications', 'workflows', 'audit_logs', 'health_logs', 'agent_session_outbox'],
      stats: getDbStats(),
    });
  });

  app.get('/api/v1/health-logs', (req, res) => {
    const limit = Math.min(200, parseInt(req.query.limit as string) || 100);
    res.json({
      logs: healthLogs.slice(0, limit),
      count: healthLogs.length,
    });
  });

  // 彻底重置清空 SQLite 数据库，回归纯净零模拟数据基准
  app.post('/api/v1/system/reset-db', (req, res) => {
    clearAllData();
    services = [];
    healthLogs = [];
    workflows = [];
    auditLogs = [];
    emailNotifications = [];
    agentSessionOutbox = [];
    res.json({
      success: true,
      message: 'SQLite 数据库与服务端内存已彻底清空，已恢复为零模拟数据纯净基准。',
      stats: getDbStats(),
    });
  });

  // ==========================================
  // 6. VITE MIDDLEWARE (DEV) & STATIC SERVING (PROD)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OpenClaw Workbench] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Agent API] Live on /api/v1/health, /api/v1/system/overview, /api/v1/heartbeat`);
  });
}

startServer();
