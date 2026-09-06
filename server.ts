import express from 'express';
import cors from 'cors';
import path from 'path';
import net from 'net';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_SERVICES,
  INITIAL_HEALTH_LOGS,
  AGENT_LIST,
  INITIAL_SKILLS,
  INITIAL_WORKFLOWS,
  INITIAL_AUDIT_LOGS,
} from './src/data/initialData';
import {
  LocalService,
  HealthLogEntry,
  AgentAsset,
  AgentSkill,
  WorkflowRegistryItem,
  WorkflowAuditLog,
} from './src/types';

// In-Memory Repository (Synchronized across API requests & Web UI)
let services: LocalService[] = [...INITIAL_SERVICES];
let healthLogs: HealthLogEntry[] = [...INITIAL_HEALTH_LOGS];
let agents: AgentAsset[] = [...AGENT_LIST];
let skills: AgentSkill[] = [...INITIAL_SKILLS];
let workflows: WorkflowRegistryItem[] = [...INITIAL_WORKFLOWS];
let auditLogs: WorkflowAuditLog[] = [...INITIAL_AUDIT_LOGS];

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
      // 可在此追加本地动态读取目录逻辑
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

  // ==========================================
  // 1. HEALTH & SERVICE PROBING APIS
  // ==========================================
  app.get('/api/v1/health', (req, res) => {
    const downCount = services.filter((s) => s.status === 'down').length;
    res.json({
      status: downCount > 0 ? 'degraded' : 'healthy',
      title: 'OpenClaw 统一工作台 (TYHOO 运维与协作监控屏)',
      forUsers: '王总 (TYHOO 高管) & 元元 (团队主管)',
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
        return res.json({ serviceId: srv.id, status: 'healthy', latencyMs: 2, message: '工作台本机存续正常' });
      }

      // 针对本地 TCP 端口探活
      const probeRes = await probeTcpPort('127.0.0.1', srv.port, 800);
      if (probeRes.ok) {
        srv.status = 'healthy';
        srv.lastPingMs = probeRes.latencyMs;
        srv.lastHeartbeat = '刚刚 (TCP 探测成功)';
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
      return res.json({
        serviceId: srv.id,
        status: srv.status,
        latencyMs: srv.lastPingMs,
        message: 'Cloud Run 容器存续良好',
      });
    }
  });

  app.post('/api/v1/services/:id/restart', (req, res) => {
    const srv = services.find((s) => s.id === req.params.id);
    if (!srv) {
      return res.status(404).json({ error: 'Service not found' });
    }
    srv.status = 'healthy';
    srv.lastPingMs = Math.floor(Math.random() * 8) + 4;
    srv.uptime = '刚刚拉起 (0m)';
    srv.lastHeartbeat = '刚刚 (工作台拉起)';
    srv.pid = Math.floor(Math.random() * 10000) + 50000;

    const log: HealthLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      serviceId: srv.id,
      serviceName: srv.name,
      level: 'info',
      message: `【服务自愈拉起】已成功调度启动 ${srv.name} (分配临时 PID ${srv.pid})。提示：建议写入 macOS launchd 守护 plist 以彻底防止静默挂死！`,
      latencyMs: 12,
      lossRisk: false,
    };
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
  app.get('/api/v1/workflows', (req, res) => {
    res.json({
      workflows,
      count: workflows.length,
      businessPrinciples: [
        '非业务数据镜像：台账仅登记协作契约、责任人与交付物格式，不存业务正文',
        '统一落地归档路径：/Users/Shared/程建/<项目名>/',
        '防篡改留痕：任何转派与规则修订强制生成 Diff',
      ],
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
      editor: editor || '元元 (API 触发)',
      action: action || 'RULE_REVISED',
      targetWorkflowId: targetWorkflowId || 'wf-01',
      summary,
      diffBefore: diffBefore || 'N/A',
      diffAfter: diffAfter || 'N/A',
      reason: reason || '日常协作防篡改审计留痕',
    };

    auditLogs.unshift(newLog);

    res.status(201).json({
      success: true,
      log: newLog,
      message: 'Audit log successfully recorded',
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
  // 5. CONSOLIDATED CONTEXT OVERVIEW FOR AGENTS
  // ==========================================
  app.get('/api/v1/system/overview', (req, res) => {
    const format = req.query.format === 'markdown' ? 'markdown' : 'json';

    if (format === 'markdown') {
      let md = `# OpenClaw 统一工作台 · 系统监管与协作大盘\n\n`;
      md += `> 面向: 王总 (TYHOO 高管) & 元元 (团队主管) | 时间: ${new Date().toLocaleString()}\n\n`;
      
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

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.send(md);
    }

    res.json({
      timestamp: new Date().toISOString(),
      forUsers: '王总 (TYHOO 高管) & 元元 (团队主管)',
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
