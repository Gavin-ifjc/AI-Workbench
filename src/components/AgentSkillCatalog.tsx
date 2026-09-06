import React, { useState, useMemo } from 'react';
import {
  Boxes,
  CheckCircle2,
  FolderGit2,
  RefreshCw,
  Search,
  Shield,
  Tag,
  Code,
  FileCode,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
} from 'lucide-react';
import { AgentAsset, AgentSkill } from '../types';

interface AgentSkillCatalogProps {
  agents: AgentAsset[];
  skills: AgentSkill[];
  onRescanSkills: () => void;
  isScanning: boolean;
  onOpenAgentDrawer: (agent: AgentAsset) => void;
  onOpenSkillModal: (skill: AgentSkill) => void;
}

export const AgentSkillCatalog: React.FC<AgentSkillCatalogProps> = ({
  agents,
  skills,
  onRescanSkills,
  isScanning,
  onOpenAgentDrawer,
  onOpenSkillModal,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [selectedPermission, setSelectedPermission] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Identify duplicate skill names across different agents (Conflict Checker)
  const duplicateSkillNames = useMemo(() => {
    const nameCount: Record<string, string[]> = {};
    skills.forEach((sk) => {
      if (!nameCount[sk.name]) {
        nameCount[sk.name] = [];
      }
      if (!nameCount[sk.name].includes(sk.agentId)) {
        nameCount[sk.name].push(sk.agentId);
      }
    });
    const duplicates: string[] = [];
    Object.entries(nameCount).forEach(([name, agentIds]) => {
      if (agentIds.length > 1) {
        duplicates.push(name);
      }
    });
    return duplicates;
  }, [skills]);

  // Filter skills
  const filteredSkills = useMemo(() => {
    return skills.filter((sk) => {
      if (selectedAgentId !== 'all' && sk.agentId !== selectedAgentId) return false;
      if (selectedPermission !== 'all' && sk.permission !== selectedPermission) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = sk.name.toLowerCase().includes(q);
        const matchDesc = sk.description.toLowerCase().includes(q);
        const matchTags = sk.tags.some((t) => t.toLowerCase().includes(q));
        const matchAgent = agents.find((a) => a.id === sk.agentId)?.name.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchTags && !matchAgent) return false;
      }
      return true;
    });
  }, [skills, selectedAgentId, selectedPermission, searchQuery, agents]);

  const recentModifiedCount = skills.filter((s) => s.isModifiedRecently).length;

  return (
    <div className="space-y-4">
      {/* Top Banner with Re-scan button */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Agent·Skill 资产目录表 (Skill Registry & Capability Matrix)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold">
              11 个全量 Agent 在册
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            实时物理扫描 11 个 Agent 的 local skills 目录。严格贯彻{' '}
            <span className="text-slate-800 font-semibold underline decoration-indigo-400">
              原则：不复制业务全文
            </span>
            ，仅提取并维护函数入参出参签名、权限边界、版本号与代码哈希，Agent 修改刷新即现最新全景。
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onRescanSkills}
            disabled={isScanning}
            className="h-7.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? '正在扫描目录...' : '重新扫描 11 个 Agent 目录'}</span>
          </button>
        </div>
      </div>

      {/* Conflict / Modified Alerts */}
      {(duplicateSkillNames.length > 0 || recentModifiedCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {duplicateSkillNames.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-800">
                  发现 {duplicateSkillNames.length} 个跨 Agent 同名 Skill 冲突：
                </span>
                <span className="font-mono text-amber-900 ml-1 font-semibold">
                  {duplicateSkillNames.join(', ')}
                </span>
                <p className="text-amber-700 text-[11px] mt-0.5">
                  提示：CodeSmith 与 DevOps 均注册了同名 git 操作，可能导致工作流调用时职责混淆。
                </p>
              </div>
            </div>
          )}

          {recentModifiedCount > 0 && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-blue-800">
                  实时探测到 {recentModifiedCount} 个 Skill 刚刚被修改
                </span>
                <p className="text-blue-700 text-[11px] mt-0.5 font-mono">
                  AST 重构规范与调度引擎已自动抓取校验和，免人工介入维护。
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 11 Agents Horizontal Cards Strip */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
            11 位负责 Agent 全景概览 (点击可切换筛选或在抽屉中查看详情)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            基准目录: ~/.openclaw/agents/
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {/* All */}
          <button
            onClick={() => setSelectedAgentId('all')}
            className={`p-2 rounded-lg text-left border text-xs transition-all ${
              selectedAgentId === 'all'
                ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-xs'
                : 'bg-slate-50/70 border-slate-200/80 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>全部 Agent</span>
              <span className="font-mono text-[10px] bg-white px-1.5 py-0.2 rounded border border-slate-200">
                11
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">35 个 Skill 资产</div>
          </button>

          {/* 11 Agents */}
          {agents.map((agent) => {
            const isSelected = selectedAgentId === agent.id;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`p-2 rounded-lg text-left border text-xs transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold truncate text-slate-800 group-hover:text-blue-600">
                    {agent.name}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAgentDrawer(agent);
                    }}
                    className="text-[9px] text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-white"
                    title="在右侧抽屉中打开 Agent 详情"
                  >
                    <Eye className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{agent.role}</div>
                <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-slate-500">
                  <span>{agent.skillCount} 个 Skill</span>
                  <span className="text-slate-400">{agent.lastScanned}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar (Section 1.2: 32px ~ 36px height) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] p-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="按 Skill 名称、参数标签、描述或 Agent 快速筛选..."
            className="w-full h-7 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
            <Filter className="w-3 h-3" />
            权限等级:
          </span>
          <select
            value={selectedPermission}
            onChange={(e) => setSelectedPermission(e.target.value)}
            className="h-7 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs text-slate-700 focus:outline-none font-mono"
          >
            <option value="all">全部权限策略</option>
            <option value="READ_ONLY">READ_ONLY (只读)</option>
            <option value="FILE_WRITE">FILE_WRITE (写文件)</option>
            <option value="NETWORK">NETWORK (外网请求)</option>
            <option value="SYSTEM_EXEC">SYSTEM_EXEC (系统调用)</option>
          </select>

          <span className="text-slate-500 text-xs font-mono ml-2">
            共 <span className="text-blue-600 font-bold">{filteredSkills.length}</span> 条资产
          </span>
        </div>
      </div>

      {/* Skills Matrix Table (Section 4.3: py-[7px], px-3, hover:bg-[#ebf3ff]) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap border-separate border-spacing-0">
            <thead className="text-[11px] text-slate-500 font-medium tracking-wider sticky top-0 z-[60]">
              <tr className="bg-slate-50/95 backdrop-blur-sm">
                <th className="px-3 py-[7px] border-b border-slate-200 text-center sticky left-0 z-[70] bg-slate-50/95 w-[48px]">
                  #
                </th>
                <th className="px-3 py-[7px] border-b border-slate-200 sticky left-[48px] z-[70] bg-slate-50/95 min-w-[200px]">
                  Skill 标识与版本
                </th>
                <th className="px-3 py-[7px] border-b border-slate-200">归属 Agent</th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-center">权限等级</th>
                <th className="px-3 py-[7px] border-b border-slate-200 min-w-[260px]">
                  能力摘要 (严格不复制全文)
                </th>
                <th className="px-3 py-[7px] border-b border-slate-200">入参出参规范</th>
                <th className="px-3 py-[7px] border-b border-slate-200 font-mono text-right">
                  最后修改 / Checksum
                </th>
                <th className="px-3 py-[7px] border-b border-slate-200 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    未检索到符合条件的 Skill 资产记录
                  </td>
                </tr>
              ) : (
                filteredSkills.map((sk, idx) => {
                  const agent = agents.find((a) => a.id === sk.agentId);
                  const isConflict = duplicateSkillNames.includes(sk.name);

                  return (
                    <tr
                      key={sk.id}
                      onClick={() => onOpenSkillModal(sk)}
                      className="group hover:bg-[#ebf3ff] cursor-pointer transition-colors"
                    >
                      {/* Index */}
                      <td className="px-3 py-[7px] text-center font-mono text-slate-400 sticky left-0 z-20 bg-white group-hover:bg-[#ebf3ff]">
                        {idx + 1}
                      </td>

                      {/* Skill Name */}
                      <td className="px-3 py-[7px] sticky left-[48px] z-20 bg-white group-hover:bg-[#ebf3ff]">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600">
                            {sk.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                            v{sk.version}
                          </span>
                          {sk.isModifiedRecently && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-50 text-blue-600 border border-blue-200 font-bold">
                              NEW
                            </span>
                          )}
                          {isConflict && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                              同名冲突
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs mt-0.5">
                          {sk.filePath}
                        </div>
                      </td>

                      {/* Agent */}
                      <td className="px-3 py-[7px]">
                        <span className="font-semibold text-slate-800">{agent?.name}</span>
                        <span className="block text-[10px] text-slate-400">{agent?.role}</span>
                      </td>

                      {/* Permission */}
                      <td className="px-3 py-[7px] text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            sk.permission === 'SYSTEM_EXEC'
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : sk.permission === 'FILE_WRITE'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : sk.permission === 'NETWORK'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {sk.permission}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-3 py-[7px] max-w-md">
                        <p className="text-slate-600 text-xs truncate">{sk.description}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {sk.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Signature */}
                      <td className="px-3 py-[7px] font-mono text-[11px]">
                        <div className="text-slate-700 truncate max-w-[220px]">
                          in: {sk.inputSignature.map((p) => p.name).join(', ') || 'none'}
                        </div>
                        <div className="text-slate-400 truncate max-w-[220px]">
                          out: {sk.outputType}
                        </div>
                      </td>

                      {/* Last Modified & Checksum */}
                      <td className="px-3 py-[7px] text-right font-mono text-[11px]">
                        <span className="text-slate-700 block">{sk.lastModified}</span>
                        <span className="text-[10px] text-slate-400">md5:{sk.checksum}</span>
                      </td>

                      {/* Action */}
                      <td className="px-3 py-[7px] text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenSkillModal(sk)}
                          className="h-6.5 px-2 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium transition-colors"
                        >
                          查看契约
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
