// server/seed-workflows.ts
// 业务台账真实工作流登记：把 TYHOO/OpenClaw 真实 5 条业务工作流灌进 HUB SQLite workflows 表
// 数据来源: mail-processing SKILL v1.4 + 实际分工 + 王总定稿流程
// 幂等: 按 code upsert
// 用法: npx tsx server/seed-workflows.ts
import { upsertWorkflow, getAllWorkflows } from './db';
import { WorkflowRegistryItem } from '../src/types';

// 角色性质标注: plan=🎯计划 review=🔍审核 deliver=📦交付 support=🔧支持
const S = (
  id: string, order: number, name: string, assignedAgentId: string,
  deliverableContract: string, role: string, timeoutSec = 86400,
  status: 'IDLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'BLOCKED' = 'IDLE'
) => ({ id, order, name, assignedAgentId, deliverableContract, role, estimatedTimeoutSec: timeoutSec, status, lastRunAt: undefined, errorNote: undefined });

const WORKFLOWS: WorkflowRegistryItem[] = [
  {
    id: 'wf-01',
    code: 'WF-01',
    title: '邮件收件 → 商机线索 → 建档派单',
    category: 'business',
    description: '客户邮件进件后的完整链路: 判级→归档→建档→派单分析。邮件处理主流程, 元元+程建双闭环。',
    outputPath: '/Users/Shared/程建/<项目名>/',
    leadResponsibleAgent: 'main',
    steps: [
      S('wf01-s1', 1, '邮件初筛与身份确认', 'main', '邮件台账记录+身份(客户/我方/代理)判定', 'plan', 1800),
      S('wf01-s2', 2, '三级定级(🔴拍板/🟡同事/⚪归档)', 'main', '定级标记+台账状态', 'plan', 1800),
      S('wf01-s3', 3, '备料(附件+EML暂存)', 'main', '_邮件附件暂存/{日期+商机名}/ 备齐附件与EML', 'deliver', 3600),
      S('wf01-s4', 4, '建 lead + 项目档案', 'project-director', '业务系统 lead 建档+程建文件夹项目档案.md', 'deliver', 14400),
      S('wf01-s5', 5, '派单分析(苏念/技术)', 'project-director', 'AI交付/ 客户分析或技术分析文档', 'deliver', 86400),
      S('wf01-s6', 6, 'emailRecords 挂接', 'project-director', '业务系统 lead.emailRecords 同步(王总9/6纠正项)', 'review', 14400),
      S('wf01-s7', 7, '闭环回执', 'main', '通知王总+台账更新为已闭环', 'review', 3600),
    ],
    collaborationContractRules: [
      '【原则一】非业务数据镜像：工作台仅登记协作契约与负责人，不存业务正文',
      '【原则二】元元三级定级制：🔴必呈王总拍板 / 🟡程建直接建案推进 / ⚪自动归档',
      '【原则三】程建派单必须填写报价截止日(DDL)，严禁无截止日空派工单',
      '【原则四】项目档案统一落地 /Users/Shared/程建/<项目名>/，命名符合TYHOO规范',
      '【铁律】邮件ID(Message ID)是唯一合法凭证，禁主题/发件人模糊匹配',
    ],
    version: 'v1.4.0',
    updatedAt: new Date().toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 'wf-02',
    code: 'WF-02',
    title: '报价单编制与审批',
    category: 'business',
    description: '从报价需求到报出给客户的审批链。钱的事, 成本/利润/拍板三道关。',
    outputPath: '/Users/Shared/程建/<项目名>/报价/',
    leadResponsibleAgent: 'finance-director',
    steps: [
      S('wf02-s1', 1, '报价需求确认(范围/规格/交期)', 'bd-assistant', '报价需求要素清单(客户RFQ解析)', 'plan', 14400),
      S('wf02-s2', 2, '成本测算', 'finance-director', '成本底稿(材料/人工/物流/管理费)', 'plan', 43200),
      S('wf02-s3', 3, '利润率与商务条款核定', 'finance-director', '报价建议单(含底线价)', 'review', 28800),
      S('wf02-s4', 4, '王总拍板', 'main', '王总批复(报价金额/有效期)', 'review', 28800),
      S('wf02-s5', 5, '报价单正式编制(排版)', 'document-formatter', '正式报价单PDF(按TYHOO英文排版规范)', 'deliver', 28800),
      S('wf02-s6', 6, '发出客户+归档', 'project-director', '报价单存报价/{日期}报价/子文件夹+lead状态更新', 'deliver', 14400),
    ],
    collaborationContractRules: [
      '【铁律】报价总金额必须从报价单原件(Excel/PDF)提取，禁用邮件单价凑数',
      '【铁律】利润率底线由林栀核定，低于底线必须王总特批',
      '【流程】苏念分析→林栀成本→王总拍板→李晓排版→程建发出',
      '【归档】每个报价版本独立子文件夹 {日期} 报价',
    ],
    version: 'v1.2.0',
    updatedAt: new Date().toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 'wf-03',
    code: 'WF-03',
    title: '代理协议/合同审查',
    category: 'legal',
    description: '中东代理协议/商务合同的条款审查链。合规法务主流程。',
    outputPath: '/Users/Shared/程建/<项目名>/',
    leadResponsibleAgent: 'contract-specialist',
    steps: [
      S('wf03-s1', 1, '合同文本归档+背景梳理', 'main', '合同原文归档+交易背景摘要', 'plan', 3600),
      S('wf03-s2', 2, '条款逐条审查(风险/义务/排他)', 'contract-specialist', '条款审查意见书(逐条标注风险等级)', 'plan', 86400),
      S('wf03-s3', 3, '修订建议稿', 'contract-specialist', '红头修订版+修改说明', 'deliver', 86400),
      S('wf03-s4', 4, '王总定夺', 'main', '王总批复(接受/谈判点)', 'review', 86400),
      S('wf03-s5', 5, '对外发送/回签跟进', 'main', '发送记录+回签状态台账', 'deliver', 172800),
    ],
    collaborationContractRules: [
      '【铁律】涉及排他性/最低采购量/长期绑定条款必须王总亲自拍板',
      '【流程】元元归档→沈清韵审查→王总定夺→元元对外',
      '【留痕】每版合同按 {日期+版本} 归档，审查意见书存AI交付/',
    ],
    version: 'v1.1.0',
    updatedAt: new Date().toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 'wf-04',
    code: 'WF-04',
    title: '投标文件编制',
    category: 'bidding',
    description: '招标响应到标书递交。承诺类事务, 截止日硬约束。',
    outputPath: '/Users/Shared/程建/<项目名>/',
    leadResponsibleAgent: 'tender-specialist',
    steps: [
      S('wf04-s1', 1, '招标文件解析(资质/技术/商务要求)', 'tender-specialist', '招标要求拆解清单+应标可行性判断', 'plan', 43200),
      S('wf04-s2', 2, '技术标编制', 'coating-specialist', '技术应标文件(按招标技术条款逐条响应)', 'deliver', 172800),
      S('wf04-s3', 3, '商务标编制', 'tender-specialist', '商务应标文件+资质文件包', 'deliver', 172800),
      S('wf04-s4', 4, '多agent会签', 'project-director', '会签意见汇总(技术/财务/法务签认)', 'review', 86400),
      S('wf04-s5', 5, '王总批准递交', 'main', '王总批复(递交授权)', 'review', 43200),
      S('wf04-s6', 6, '标书定稿+按截止日递交', 'tender-specialist', '递交回执/投标凭证', 'deliver', 43200),
    ],
    collaborationContractRules: [
      '【铁律】投标截止日为硬约束，倒排工期，延误必须升级王总',
      '【承诺】投标=commitment级事项，必须王总批准后才递交',
      '【会签】技术(何超/郑铭/陈睿按范围)+财务(林栀)+法务(沈清韵)按需参与',
    ],
    version: 'v1.1.0',
    updatedAt: new Date().toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 'wf-05',
    code: 'WF-05',
    title: '施工项目跟进',
    category: 'operations',
    description: '在建项目进度/质量/问题处理。读IFJC只读数据+现场问题闭环。',
    outputPath: '/Users/Shared/程建/<项目名>/',
    leadResponsibleAgent: 'project-director',
    steps: [
      S('wf05-s1', 1, '施工数据读取(IFJC只读)', 'ifjc-engineer', '施工进度/设备/遥测数据摘要', 'plan', 86400),
      S('wf05-s2', 2, '进度与风险研判', 'project-director', '项目周报(进度/风险/下一步)', 'plan', 86400),
      S('wf05-s3', 3, '技术问题处理(涂层/HDPE/补口)', 'coating-specialist', '技术处理方案(按问题域分派何超/郑铭/陈睿)', 'deliver', 172800),
      S('wf05-s4', 4, '重大事项呈报', 'main', '呈报王总(里程碑/重大风险/需拍板项)', 'review', 43200),
      S('wf05-s5', 5, '整改闭环验证', 'project-director', '整改验证记录+台账更新', 'deliver', 172800),
    ],
    collaborationContractRules: [
      '【数据源】IFJC 施工系统只读 API(不写不激活休眠)',
      '【分派】技术问题按域分派: 涂层=何超 / HDPE=郑铭 / 内补口=陈睿',
      '【呈报】里程碑与重大风险必须及时呈王总，不积压',
    ],
    version: 'v1.0.0',
    updatedAt: new Date().toISOString(),
    status: 'ACTIVE',
  },
];

export function main(): number {
  for (const wf of WORKFLOWS) {
    upsertWorkflow(wf);
  }
  const all = getAllWorkflows();
  console.log(`✅ 真实工作流已登记: ${WORKFLOWS.length} 条`);
  all.forEach((w) => console.log(`  [${w.code}] ${w.title} | ${w.steps.length}步 | 主管:${w.leadResponsibleAgent}`));
  return WORKFLOWS.length;
}

if (process.argv[1] && process.argv[1].endsWith('seed-workflows.ts')) {
  main();
}
