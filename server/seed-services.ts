// server/seed-services.ts
// 服务监管真实清单：只含本地服务(王总拍板:云端BMS/IFJC不监控,避免Cloud Run休眠被激活产生费用)
// 幂等:按 id upsert,重复执行不重复
// 用法: npx tsx server/seed-services.ts
import { upsertService, getAllServices } from './db';

const LOCAL_SERVICES = [
  {
    id: 'srv-gateway',
    name: 'OpenClaw Gateway',
    port: 18789,
    protocol: 'HTTP',
    path: '127.0.0.1:18789',
    targetUrl: 'http://127.0.0.1:18789',
    status: 'healthy',
    uptime: '',
    lastPingMs: 0,
    lastHeartbeat: '待首次探测',
    memoryMb: 0,
    cpuPercent: 0,
    pid: 0,
    isCritical: true,
    isLaunchdManaged: true,
    launchdLabel: 'ai.openclaw.gateway',
    incidentNote: '',
    errorDetails: '核心网关:承载WebChat/企业微信/全部通道连接。挂了=元元联系不上王总。',
    restartCmd: 'launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway',
  },
  {
    id: 'srv-workbench',
    name: 'AI-Workbench 统一工作台(本尊)',
    port: 3000,
    protocol: 'HTTP',
    path: '127.0.0.1:3000',
    targetUrl: 'http://127.0.0.1:3000',
    status: 'healthy',
    uptime: '',
    lastPingMs: 0,
    lastHeartbeat: '常驻(当前进程)',
    memoryMb: 0,
    cpuPercent: 0,
    pid: process.pid,
    isCritical: true,
    isLaunchdManaged: true,
    launchdLabel: 'ai.openclaw.workbench-hub',
    incidentNote: '',
    errorDetails: '本工作台服务(HUB)。挂了=邮件选项卡/监管打不开。',
    restartCmd: 'launchctl kickstart -k gui/$(id -u)/ai.openclaw.workbench-hub',
  },
  {
    id: 'srv-gitsync',
    name: 'AI-Workbench Git同步守护',
    port: 0,
    protocol: 'PROC',
    path: 'launchd: ai.openclaw.workbench-gitsync',
    targetUrl: '',
    status: 'healthy',
    uptime: '',
    lastPingMs: 0,
    lastHeartbeat: '待首次探测',
    memoryMb: 0,
    cpuPercent: 0,
    pid: 0,
    isCritical: false,
    isLaunchdManaged: true,
    launchdLabel: 'ai.openclaw.workbench-gitsync',
    incidentNote: '',
    errorDetails: '云端GitHub→本地自动同步守护(每30s git pull)。挂了=AI Studio推的代码不自动到本地。',
    restartCmd: 'launchctl kickstart -k gui/$(id -u)/ai.openclaw.workbench-gitsync',
  },
];

export function main(): number {
  for (const s of LOCAL_SERVICES) {
    upsertService(s as never);
  }
  const all = getAllServices();
  console.log(`服务清单已seed: ${LOCAL_SERVICES.length} 个本地服务(云端BMS/IFJC按王总要求不监控)`);
  all.forEach((s) => console.log(`  [${s.id}] ${s.name} :${(s as never as { port: number }).port}`));
  return LOCAL_SERVICES.length;
}

if (process.argv[1] && process.argv[1].endsWith('seed-services.ts')) {
  main();
}
