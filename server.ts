import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_SERVICES,
  INITIAL_HEALTH_LOGS,
  AGENT_LIST,
  INITIAL_SKILLS,
  INITIAL_WORKFLOWS,
  INITIAL_AUDIT_LOGS,
  INITIAL_COMPUTE_METRICS,
} from './src/data/initialData';
import {
  LocalService,
  HealthLogEntry,
  AgentAsset,
  AgentSkill,
  WorkflowRegistryItem,
  WorkflowAuditLog,
  ComputeMetrics,
  QueuedTask,
} from './src/types';

// In-Memory Repository (Synchronized across API requests & Web UI)
let services: LocalService[] = [...INITIAL_SERVICES];
let healthLogs: HealthLogEntry[] = [...INITIAL_HEALTH_LOGS];
let agents: AgentAsset[] = [...AGENT_LIST];
let skills: AgentSkill[] = [...INITIAL_SKILLS];
let workflows: WorkflowRegistryItem[] = [...INITIAL_WORKFLOWS];
let auditLogs: WorkflowAuditLog[] = [...INITIAL_AUDIT_LOGS];
let computeMetrics: ComputeMetrics = { ...INITIAL_COMPUTE_METRICS };

// Store connected external agents telemetry
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // ==========================================
  // 1. HEALTH & SERVICE PROBING APIS
  // ==========================================
  app.get('/api/v1/health', (req, res) => {
    const downCount = services.filter((s) => s.status === 'down').length;
    res.json({
      status: downCount > 0 ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      totalServices: services.length,
      healthyServices: services.filter((s) => s.status === 'healthy').length,
      downServices: downCount,
      environment: 'macOS Local Out-of-band Workbench',
      openClawBaseDir: '~/.openclaw',
      activeExternalAgents: Object.keys(externalAgentHeartbeats).length,
    });
  });

  app.get('/api/v1/services', (req, res) => {
    res.json({
      services,
      count: services.length,
    });
  });

  app.get('/api/v1/services/:id', (req, res) => {
    const srv = services.find((s) => s.id === req.params.id);
    if (!srv) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(srv);
  });

  app.post('/api/v1/services/:id/probe', (req, res) => {
    const srv = services.find((s) => s.id === req.params.id);
    if (!srv) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (srv.status === 'down') {
      return res.status(503).json({
        serviceId: srv.id,
        status: 'down',
        message: `Connection refused on port ${srv.port}`,
      });
    }
    const ping = Math.floor(Math.random() * 8) + 4;
    srv.lastPingMs = ping;
    srv.lastHeartbeat = '刚刚 (API 探活)';
    res.json({
      serviceId: srv.id,
      status: srv.status,
      latencyMs: ping,
      message: 'Probe successful',
    });
  });

  app.post('/api/v1/services/:id/restart', (req, res) => {
    const srv = services.find((s) => s.id === req.params.id);
    if (!srv) {
      return res.status(404).json({ error: 'Service not found' });
    }
    srv.status = 'healthy';
    srv.lastPingMs = Math.floor(Math.random() * 10) + 4;
    srv.uptime = '刚刚拉起 (0m)';
    srv.lastHeartbeat = '刚刚 (API 触发拉起)';
    srv.pid = Math.floor(Math.random() * 10000) + 50000;

    // Log the action
    const log: HealthLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      serviceId: srv.id,
      serviceName: srv.name,
      level: 'info',
      message: `【API 自愈触发】已成功向 Supervisor 发送启动指令，分配 PID ${srv.pid}。`,
      latencyMs: 12,
      lossRisk: false,
    };
    healthLogs.unshift(log);

    res.json({
      success: true,
      service: srv,
      message: `Service ${srv.name} restarted successfully`,
    });
  });

  // ==========================================
  // 2. 11 AGENTS & SKILL REGISTRY APIS
  // ==========================================
  app.get('/api/v1/agents', (req, res) => {
    const enrichedAgents = agents.map((a) => {
      const agentSkills = skills.filter((s) => s.agentId === a.id);
      return {
        ...a,
        skillCount: agentSkills.length,
        skills: agentSkills.map((s) => ({
          id: s.id,
          name: s.name,
          version: s.version,
          permission: s.permission,
          checksum: s.checksum,
        })),
      };
    });
    res.json({
      agents: enrichedAgents,
      totalAgents: agents.length,
      totalSkills: skills.length,
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
      skills: agentSkills,
    });
  });

  app.get('/api/v1/skills', (req, res) => {
    const { agentId, permission, status, search } = req.query;
    let filtered = [...skills];

    if (agentId && typeof agentId === 'string') {
      filtered = filtered.filter((s) => s.agentId === agentId);
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
      agentName: agent?.name,
      agentRole: agent?.role,
    });
  });

  // ==========================================
  // 3. WORKFLOW REGISTRY & AUDIT LOG APIS
  // ==========================================
  app.get('/api/v1/workflows', (req, res) => {
    res.json({
      workflows,
      count: workflows.length,
    });
  });

  app.get('/api/v1/workflows/:codeOrId', (req, res) => {
    const key = req.params.codeOrId;
    const wf = workflows.find((w) => w.code === key || w.id === key);
    if (!wf) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(wf);
  });

  app.get('/api/v1/audit/logs', (req, res) => {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    res.json({
      auditLogs: auditLogs.slice(0, limit),
      total: auditLogs.length,
    });
  });

  // External AI Agent writes audit diff / rule revision
  app.post('/api/v1/audit/log', (req, res) => {
    const { editor, action, targetWorkflowId, summary, diffBefore, diffAfter, reason } = req.body;

    if (!summary) {
      return res.status(400).json({ error: 'Summary is required' });
    }

    const newLog: WorkflowAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleString(),
      editor: editor || 'External AI Agent (API)',
      action: action || 'RULE_REVISED',
      targetWorkflowId: targetWorkflowId || 'wf-101',
      summary,
      diffBefore: diffBefore || 'N/A',
      diffAfter: diffAfter || 'N/A',
      reason: reason || 'Agent 自主操作审计留痕',
    };

    auditLogs.unshift(newLog);

    res.status(201).json({
      success: true,
      log: newLog,
      message: 'Audit log successfully recorded',
    });
  });

  // ==========================================
  // 4. AGENT EXTERNAL HEARTBEAT & TELEMETRY
  // ==========================================
  app.post('/api/v1/heartbeat', (req, res) => {
    const { agentId, agentName, status, latencyMs, currentTask, version } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    externalAgentHeartbeats[agentId] = {
      agentId,
      agentName: agentName || agentId,
      status: status || 'running',
      latencyMs: typeof latencyMs === 'number' ? latencyMs : 24,
      currentTask: currentTask || 'Idle / Listening',
      version: version || 'v1.0.0',
      lastPingTime: new Date().toLocaleTimeString(),
      ip: clientIp,
    };

    // Update agent asset if it matches
    const matchedAgent = agents.find((a) => a.id === agentId || a.name.toLowerCase() === agentId.toLowerCase());
    if (matchedAgent) {
      matchedAgent.activeStatus = status === 'running' ? 'running' : 'idle';
      matchedAgent.lastScanned = '刚刚 (Agent API 上报)';
    }

    // Append to health logs
    const logEntry: HealthLogEntry = {
      id: `log-hb-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      serviceId: agentId,
      serviceName: agentName || agentId,
      level: 'info',
      message: `【Agent 心跳连入】${agentName || agentId} (IP: ${clientIp}) 状态: ${status || 'running'} · 延迟: ${latencyMs || 24}ms`,
      latencyMs: latencyMs || 24,
      lossRisk: false,
    };
    healthLogs.unshift(logEntry);
    if (healthLogs.length > 80) healthLogs.pop();

    res.json({
      acknowledged: true,
      receivedAt: new Date().toISOString(),
      agentId,
      activeAgentCount: Object.keys(externalAgentHeartbeats).length,
      currentWorkflowsCount: workflows.length,
    });
  });

  app.get('/api/v1/telemetry', (req, res) => {
    res.json({
      metrics: computeMetrics,
      externalAgents: externalAgentHeartbeats,
      activeSlots: computeMetrics.activeSlots,
      queuedTasks: computeMetrics.taskQueue.length,
      latencyP99Ms: computeMetrics.latencyP99Ms,
      metalMpsUtilization: computeMetrics.metalMpsUtilization,
      thermalState: computeMetrics.thermalState,
    });
  });

  app.post('/api/v1/tasks/enqueue', (req, res) => {
    const { title, agentId, priority, predictedWaitMs, modelTarget } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const newTask: QueuedTask = {
      id: `task-api-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title,
      agentId: agentId || 'agent-02',
      priority: priority || 'P1',
      queuedDurationSec: 0,
      predictedWaitMs: predictedWaitMs || 1200,
      modelTarget: modelTarget || 'Local Qwen-2.5-Coder-32B (MPS)',
      status: 'waiting',
    };

    computeMetrics.taskQueue.unshift(newTask);
    computeMetrics.queuedTasks = computeMetrics.taskQueue.length;

    res.status(201).json({
      success: true,
      task: newTask,
      queueDepth: computeMetrics.taskQueue.length,
    });
  });

  // ==========================================
  // 5. CONSOLIDATED CONTEXT OVERVIEW FOR AGENTS
  // ==========================================
  app.get('/api/v1/system/overview', (req, res) => {
    const format = req.query.format === 'markdown' ? 'markdown' : 'json';

    if (format === 'markdown') {
      let md = `# OpenClaw 协作系统总览 (System Context for AI Agent)\n\n`;
      md += `> 时间: ${new Date().toISOString()} | 模式: Out-of-band 独立工作台\n\n`;
      md += `## 1. 核心服务存活状态\n`;
      services.forEach((s) => {
        md += `- **${s.name}** [${s.status.toUpperCase()}] 延迟: ${s.lastPingMs}ms | 端口: ${s.port} (${s.protocol})\n`;
      });
      md += `\n## 2. 协作工作流 (Workflows & Collaboration Contracts)\n`;
      workflows.forEach((w) => {
        md += `### ${w.code}: ${w.title} (${w.status})\n`;
        md += `规则契约:\n`;
        w.collaborationContractRules.forEach((r) => {
          md += `  * ${r}\n`;
        });
        md += `步骤:\n`;
        w.steps.forEach((st) => {
          const ag = agents.find((a) => a.id === st.assignedAgentId);
          md += `  ${st.order}. [${st.name}] -> 负责 Agent: ${ag?.name || st.assignedAgentId} | 交付标准: ${st.deliverableContract}\n`;
        });
        md += `\n`;
      });
      md += `## 3. 11 个 Agent 资产与能力分布\n`;
      agents.forEach((a) => {
        const agSkills = skills.filter((s) => s.agentId === a.id);
        md += `- **${a.name}** (${a.role}) [${a.activeStatus}]: ${agSkills.map((s) => s.name).join(', ')}\n`;
      });

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.send(md);
    }

    res.json({
      timestamp: new Date().toISOString(),
      status: services.some((s) => s.status === 'down') ? 'degraded' : 'healthy',
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        lastPingMs: s.lastPingMs,
        port: s.port,
      })),
      agentsCount: agents.length,
      skillsCount: skills.length,
      workflows: workflows.map((w) => ({
        code: w.code,
        title: w.title,
        status: w.status,
        stepsCount: w.steps.length,
        rules: w.collaborationContractRules,
      })),
      computeMetrics: {
        latencyP99Ms: computeMetrics.latencyP99Ms,
        activeSlots: computeMetrics.activeSlots,
        queuedTasks: computeMetrics.taskQueue.length,
      },
      connectedExternalAgents: Object.values(externalAgentHeartbeats),
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
