// scanner.ts - OpenClaw Workbench 真实数据扫描器
// 职责:读取本机真实OpenClaw资产,填充工作台(替代纯内存空壳+硬编码假设)
// 1. agent清单 -> 扫 workspace/*
// 2. agent中文名/角色 -> ROLE_MAP 权威映射(源自各SOUL.md首行)
// 3. agent专有技能 -> 扫 workspace/<agent>/skills/*/SKILL.md
// 4. 全局共享技能 -> 扫 ~/.openclaw/skills/*
// 5. 企微插件技能 -> 扫 ~/.openclaw/plugin-skills/*
// 6. 服务端口存活 -> 真实 net 探测
// 只读,不写业务数据;只扫真实文件系统。

import fs from 'fs';
import path from 'path';
import net from 'net';

const OC_BASE = '/Users/agents/.openclaw';
const WS = path.join(OC_BASE, 'workspace');
const GLOBAL_SKILLS = path.join(OC_BASE, 'skills');
const PLUGIN_SKILLS = path.join(OC_BASE, 'plugin-skills');

// 目录id => {name,role} 权威映射 (来源:各 SOUL.md 首行人工锚定)
const ROLE_MAP: Record<string, { name: string; role: string; category: string }> = {
  'main': { name: '元元', role: 'VVIP贴身助理 + 团队主管', category: 'executive_lead' },
  'project-director': { name: '程建', role: '项目经理:任务调度/商机/进度总控', category: 'operations' },
  'contract-specialist': { name: '沈清韵', role: '合同专员:条款审查/中东代理协议', category: 'legal' },
  'tender-specialist': { name: '陆远', role: '标书专员:招标响应/标书编制', category: 'bidding' },
  'bd-assistant': { name: '苏念', role: '商务助理:客户/市场/商务分析', category: 'business_dev' },
  'document-formatter': { name: '李晓', role: '文档排版:多语种Word/PDF', category: 'support' },
  'coating-specialist': { name: '何超', role: '涂层专家:FBE/外涂防腐', category: 'technical' },
  'hdpe-specialist': { name: '郑铭', role: 'HDPE内衬专家', category: 'technical' },
  'ifjc-engineer': { name: '陈睿', role: 'IFJC工程师:内补口机器人', category: 'technical' },
  'tech-observer': { name: '顾诚', role: '技术观察员:AI/行业趋势', category: 'intel' },
  'tech-lead': { name: '李维', role: '技术主管:OpenClaw运维/模型', category: 'platform' },
  'finance-director': { name: '林栀', role: '财务总监:成本/报价/回款', category: 'finance' },
  'linwan': { name: '林婉', role: '生活与行政助理', category: 'life' },
  'yuanyuan-private': { name: '元元私人', role: '私人事务管家', category: 'life' },
  'career-advisor': { name: '顾思远', role: '职业与规划顾问', category: 'support' },
  'media-designer': { name: '林艺', role: '媒体与视觉设计', category: 'creative' },
};

interface AgentOut {
  id: string; name: string; role: string; category: string;
  workspaceSkillCount: number; globalShared: number; wecomPlugin: number;
}
interface SkillOut {
  id: string; agentId: string; name: string; version: string;
  locationCategory: string; permission: string;
}

function listSkillDirs(parent: string): string[] {
  if (!fs.existsSync(parent)) return [];
  try {
    return fs.readdirSync(parent).filter((d) => {
      try { return fs.statSync(path.join(parent, d)).isDirectory() && fs.existsSync(path.join(parent, d, 'SKILL.md')); }
      catch { return false; }
    });
  } catch { return []; }
}

export function scanAll(): { agents: AgentOut[]; skills: SkillOut[]; counts: { global: number; plugin: number } } {
  const skills: SkillOut[] = [];
  const agents: AgentOut[] = [];
  const blocked = new Set(['Knowledge', 'memory', 'models', 'openclaw-workspace-state.json.migrated.574f31d35452b0ab6559e279a61213f1e6c458f43a142cea21803b66e77a2c2b.340a0125-ecae-4d1b-b10a-3c88189c25fb', 'tts-strip']);

  // ---- 全局 shared 技能 ----
  const globalSkillNames = listSkillDirs(GLOBAL_SKILLS);
  const pluginSkillNames = listSkillDirs(PLUGIN_SKILLS);

  globalSkillNames.forEach((n, i) => {
    skills.push({ id: `glo-${i}`, agentId: '*global*', name: n, version: '', locationCategory: 'global_shared', permission: 'FOLLOW_POLICY' });
  });
  pluginSkillNames.forEach((n, i) => {
    skills.push({ id: `plg-${i}`, agentId: '*wecom*', name: n, version: '', locationCategory: 'wecom_plugin', permission: 'FOLLOW_POLICY' });
  });

  // ---- 各 agent 目录 ----
  if (fs.existsSync(WS)) {
    fs.readdirSync(WS).forEach((id) => {
      const full = path.join(WS, id);
      try { if (!fs.statSync(full).isDirectory()) return; } catch { return; }
      if (blocked.has(id)) return;
      const meta = ROLE_MAP[id];
      if (!meta) return; // 非登记 agent 跳过
      const own = listSkillDirs(path.join(full, 'skills'));
      agents.push({
        id, name: meta.name, role: meta.role, category: meta.category,
        workspaceSkillCount: own.length, globalShared: globalSkillNames.length, wecomPlugin: pluginSkillNames.length,
      });
      own.forEach((n, i) => {
        skills.push({ id: `own-${id}-${i}`, agentId: id, name: n, version: '', locationCategory: 'agent_workspace', permission: 'FOLLOW_POLICY' });
      });
    });
  }
  return { agents, skills, counts: { global: globalSkillNames.length, plugin: pluginSkillNames.length } };
}

// ---- 供 server.ts 直接灌入内存的资产构建函数 ----
// 返回符合前端 types (AgentAsset/AgentSkill) 的完整数据,含可展示默认字段

export interface AgentAssetLite {
  id: string;
  name: string;
  role: string;
  category: string;
  isLeadOrVvip: boolean;
  skillCount: number;
  workspaceSkillsCount: number;
  skillsDir: string;
  activeStatus: string;
  lastScanned: string;
  description: string;
  responsibilities: string[];
}

export interface AgentSkillLite {
  id: string;
  agentId: string;
  name: string;
  version: string;
  filePath: string;
  locationCategory: 'agent_workspace' | 'global_shared' | 'wecom_plugin';
  locationPath: string;
  description: string;
  permission: string;
  lastModified: string;
  tags: string[];
  status: string;
}

const ROLE_DESC: Record<string, string> = {
  main: '王总的VVIP贴身助理与OpenClaw团队主管,负责要事判级、工作流调度与系统运维总控',
  'project-director': '项目经理:主导商机线索建档、任务派发与交期进度总控',
  'contract-specialist': '合同专员:主导中东代理协议与商务合同条款审查',
  'tender-specialist': '标书专员:主导投标文件编制与投标响应',
  'bd-assistant': '商务助理:负责客户接洽、市场情报与商务分析',
  'document-formatter': '文档排版:负责多语种Word/PDF规范排版',
  'coating-specialist': '涂层专家:主导FBE/外涂防腐技术与沙特阿美标准审查',
  'hdpe-specialist': 'HDPE内衬专家:管道穿插内衬结构设计与工艺验算',
  'ifjc-engineer': 'IFJC工程师:管道内补口机器人硬件与遥测技术',
  'tech-observer': '技术观察员:追踪前沿AI模型与石油工程数字化趋势',
  'tech-lead': '技术主管:OpenClaw基础设施运维、模型与端口调度',
  'finance-director': '财务总监:成本核算、报价成本与利润率底线、回款风控',
  linwan: '生活与行政助理:差旅报销与日常行政',
  'yuanyuan-private': '私人事务管家:私密日程与私人备忘',
  'career-advisor': '职业与规划顾问:人才画像与技能成长',
  'media-designer': '媒体与视觉设计:品牌宣发与方案物料配图',
};

/** 构建 server 可直接用做 agents/skills 初始值的真实资产快照(含展示默认字段) */
export function buildInitialAssets(): { agents: AgentAssetLite[]; skills: AgentSkillLite[] } {
  const { agents, skills, counts } = scanAll();
  const now = new Date().toISOString();

  const assetOut: AgentAssetLite[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    category: a.category as string,
    isLeadOrVvip: a.id === 'main',
    skillCount: a.workspaceSkillCount,
    workspaceSkillsCount: a.workspaceSkillCount,
    skillsDir: `${WS}/${a.id}/skills/`,
    activeStatus: 'idle',
    lastScanned: now + ' (真实扫描)',
    description: ROLE_DESC[a.id] || a.role,
    responsibilities: [],
  }));

  const skillOut: AgentSkillLite[] = skills.map((s) => {
    const fp = s.locationCategory === 'global_shared'
      ? `${GLOBAL_SKILLS}/${s.name}/SKILL.md`
      : s.locationCategory === 'wecom_plugin'
        ? `${PLUGIN_SKILLS}/${s.name}/SKILL.md`
        : `${WS}/${s.agentId}/skills/${s.name}/SKILL.md`;
    const lp = s.locationCategory === 'global_shared' ? GLOBAL_SKILLS : s.locationCategory === 'wecom_plugin' ? PLUGIN_SKILLS : `${WS}/${s.agentId}/skills/`;
    const desc = readSkillDescription(fp);
    return {
      id: s.id, agentId: s.agentId, name: s.name, version: '', filePath: fp,
      locationCategory: s.locationCategory as 'agent_workspace' | 'global_shared' | 'wecom_plugin', locationPath: lp, description: desc,
      inputSignature: [], outputType: '', permission: 'FOLLOW_POLICY',
      lastModified: readSkillMtime(fp), isModifiedRecently: false, tags: [], checksum: '', status: 'active',
    };
  });

  return { agents: assetOut, skills: skillOut };
}

/**
 * 读取 SKILL.md 的 frontmatter description 字段(支持单行/多行引用块)
 * 及正文首个标题作为补充,返回精简后的技能说明。读不到返回''。
 */
function readSkillDescription(skillPath: string): string {
  if (!fs.existsSync(skillPath)) return '';
  try {
    const raw = fs.readFileSync(skillPath, 'utf8');
    // 取 frontmatter (--- 与 --- 之间)
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) return '';
    const body = fm[1];
    // description: 单行 | 多行引用(> ...) | 引号包裹
    // description 三种形态：
    //  A) 单行: description: "..." 或 description: ...
    //  B) YAML 折叠块: description: > 后跟缩进多行 (以“碰顶行/---”结束)
    //  C) 普通多行引用: > xxx (较少)
    // 逐行可靠解析 frontmatter 里的 description 键
    // 支持: A 单行值 / B "双引号(含\"转义)" / C '单引号' / D 折叠块(> 后缩进多行) / E 字面块(|)
    let val = '';
    const lines = body.split(/\r?\n/);
    const idx = lines.findIndex((l) => /^description\s*:/.test(l));
    if (idx >= 0) {
      // 取键后现有部分
      const rest = lines[idx].replace(/^description\s*:\s*/, '');
      if (rest === '>' || rest === '|') {
        // 折叠/字面块：收集后续缩进行直到非缩进行/---/
        const collect: string[] = [];
        for (let i = idx + 1; i < lines.length; i++) {
          const l = lines[i];
          if (/^\s*-{3,}\s*$/.test(l)) break;
          if (l === '' || /^\s+/.test(l)) { collect.push(l.replace(/^\s+/, '')); continue; }
          break; // 碰顶行结束
        }
        val = collect.filter(Boolean).join(' ').trim();
      } else if (/^['"]/.test(rest)) {
        // 引号包裹：取首尾引号间内容(保留内部转义符变换)
        const q = rest[0];
        const inner = rest.slice(1).replace(new RegExp(q + '$'), '');
        val = inner.replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
      } else {
        val = rest.trim();
      }
    }
    val = val.replace(/^["']|["']$/g, '').trim();
    return val.slice(0, 500); // 控制长度
  } catch { return ''; }
}

/** 读文件最后修改时间(ISO),不存在返回'' */
function readSkillMtime(skillPath: string): string {
  try { if (fs.existsSync(skillPath)) return fs.statSync(skillPath).mtime.toISOString(); } catch { /* ignore */ }
  return '';
}
