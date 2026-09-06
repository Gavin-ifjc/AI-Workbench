import React, { useState } from 'react';
import {
  Bot,
  Copy,
  Check,
  Terminal,
  Send,
  Sparkles,
  ExternalLink,
  Code2,
  Layers,
  Activity,
  FileSpreadsheet,
  X,
  Play,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface AgentConnectHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHeartbeatSent?: (agentName: string) => void;
}

export const AgentConnectHubModal: React.FC<AgentConnectHubModalProps> = ({
  isOpen,
  onClose,
  onHeartbeatSent,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'endpoints' | 'curl' | 'python' | 'tester'>('endpoints');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Test State
  const [testAgentName, setTestAgentName] = useState('ArchitectAgent-01');
  const [testLatency, setTestLatency] = useState(18);
  const [testTask, setTestTask] = useState('正在分解模块依赖并准备交付规范');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-...';

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/system/overview',
      desc: '获取系统完整上下文（支持 ?format=markdown，可直接喂给 Agent Prompt）',
      params: '?format=markdown',
    },
    {
      method: 'GET',
      path: '/api/v1/workflows',
      desc: '获取全部工作流协作台账、环节责任分配与准则契约',
      params: '',
    },
    {
      method: 'GET',
      path: '/api/v1/skills',
      desc: '查询 11 个 Agent 的 Skill 契约规范（支持 ?agentId=agent-02&permission=FILE_WRITE）',
      params: '?permission=FILE_WRITE',
    },
    {
      method: 'POST',
      path: '/api/v1/heartbeat',
      desc: '外部 Agent 定期上报自身存活、当前任务与处理延迟',
      params: '{ agentId, status, latencyMs }',
    },
    {
      method: 'POST',
      path: '/api/v1/audit/log',
      desc: 'Agent 自主操作完成或调整步骤时，写入防篡改审计留痕',
      params: '{ editor, summary, diffAfter }',
    },
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const curlExample = `# 1. 测试连通性与健康状态
curl -s "${origin}/api/v1/health" | jq

# 2. 获取给 AI Agent 注入的系统全景 Markdown 上下文
curl -s "${origin}/api/v1/system/overview?format=markdown"

# 3. Agent 上报实时心跳与状态
curl -X POST "${origin}/api/v1/heartbeat" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "agent-01",
    "agentName": "ArchitectAgent",
    "status": "running",
    "latencyMs": 16,
    "currentTask": "解析流水线拓扑中",
    "version": "v1.2.0"
  }'

# 4. Agent 上报操作变更审计留痕
curl -X POST "${origin}/api/v1/audit/log" \\
  -H "Content-Type: application/json" \\
  -d '{
    "editor": "ArchitectAgent / Mac Agent Daemon",
    "action": "STEP_UPDATE",
    "targetWorkflowId": "wf-101",
    "summary": "阶段 01 架构解析交付完毕",
    "diffBefore": "待交付",
    "diffAfter": "已验证通过 SHA-256 签名",
    "reason": "自主完成初审流水线"
  }'`;

  const pythonExample = `import requests
import time

BASE_URL = "${origin}"

def query_system_context():
    """Agent 获取当前全局协作规则与 11 Agent 目录"""
    resp = requests.get(f"{BASE_URL}/api/v1/system/overview?format=markdown")
    if resp.status_code == 200:
        print("[Agent] 成功加载系统协作准则:")
        print(resp.text[:300] + "...")
        return resp.text
    return None

def send_heartbeat(agent_id="agent-01", name="ArchitectAgent"):
    """Agent 定期上报心跳到独立工作台"""
    payload = {
        "agentId": agent_id,
        "agentName": name,
        "status": "running",
        "latencyMs": 14,
        "currentTask": "监听本地 IPC 任务队列",
        "version": "v2.0"
    }
    resp = requests.post(f"{BASE_URL}/api/v1/heartbeat", json=payload)
    print(f"[Agent] 心跳上报结果: {resp.status_code}, {resp.json()}")

def log_audit_trail(summary, reason="Agent 自动归档"):
    """Agent 记录变更审计留痕"""
    payload = {
        "editor": "ArchitectAgent (Local Mac)",
        "action": "RULE_REVISED",
        "targetWorkflowId": "wf-101",
        "summary": summary,
        "diffBefore": "旧协作规范",
        "diffAfter": "新协作规范已校验",
        "reason": reason
    }
    resp = requests.post(f"{BASE_URL}/api/v1/audit/log", json=payload)
    print(f"[Agent] 审计留痕结果: {resp.status_code}")

if __name__ == "__main__":
    context = query_system_context()
    send_heartbeat()
    log_audit_trail("Agent 已确认接入当前工作台规则台账")
`;

  const runLiveHeartbeatTest = async () => {
    setIsSending(true);
    setTestResponse(null);
    try {
      const res = await fetch(`${origin}/api/v1/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: testAgentName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          agentName: testAgentName,
          status: 'running',
          latencyMs: Number(testLatency) || 15,
          currentTask: testTask,
          version: 'v2.1-live',
        }),
      });
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
      if (onHeartbeatSent) onHeartbeatSent(testAgentName);
    } catch (err: unknown) {
      setTestResponse(JSON.stringify({ error: (err as Error).message }, null, 2));
    } finally {
      setIsSending(false);
    }
  };

  const runLiveAuditTest = async () => {
    setIsSending(true);
    setTestResponse(null);
    try {
      const res = await fetch(`${origin}/api/v1/audit/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editor: `${testAgentName} (在线联调)`,
          action: 'RULE_REVISED',
          targetWorkflowId: 'wf-101',
          summary: `【在线连通性验证】${testAgentName} 成功完成系统联调握手`,
          diffBefore: '待连通',
          diffAfter: '已于开发环境完成 API 握手',
          reason: '开发者验证外部 Agent API 访问通路',
        }),
      });
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setTestResponse(JSON.stringify({ error: (err as Error).message }, null, 2));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-13 px-5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Agent 独立接入与开放 API 中心 (Agent Connect Hub)
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  DEV 环境已免密直连
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                支持您的本地 Mac AI Agent 或远程服务通过标准 HTTP REST 随时读取规则与上报心跳
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub Navigation Bar */}
        <div className="h-10 px-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveSubTab('endpoints')}
              className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeSubTab === 'endpoints'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>开放端点清单 (Endpoints)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('curl')}
              className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeSubTab === 'curl'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>cURL 命令行</span>
            </button>
            <button
              onClick={() => setActiveSubTab('python')}
              className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeSubTab === 'python'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Python 脚本集成</span>
            </button>
            <button
              onClick={() => setActiveSubTab('tester')}
              className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeSubTab === 'tester'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-emerald-600" />
              <span>在线联调测试器</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            基准 Host: <span className="text-slate-700 font-semibold">{origin}</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 text-xs">
          {/* Tab 1: Endpoints */}
          {activeSubTab === 'endpoints' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-blue-900/80 text-[11px] flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">无需 Publish 即可直接调用：</span>
                  此开发环境后端已集成跨域 CORS 与 Express API 路由。您的 Agent 发起任何 HTTP 请求均可立即穿透并实时反映到工作台数据中。
                </div>
              </div>

              <div className="space-y-2">
                {endpoints.map((ep, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors flex flex-col space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            ep.method === 'GET'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {ep.method}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {origin}
                          {ep.path}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(`${origin}${ep.path}`, `ep-${idx}`)}
                        className="h-6 px-2 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-mono flex items-center space-x-1"
                      >
                        {copiedKey === `ep-${idx}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{copiedKey === `ep-${idx}` ? '已复制' : '复制完整URL'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">{ep.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: cURL */}
          {activeSubTab === 'curl' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium text-[11px]">
                  直接在您的 Mac 终端复制运行以下命令，即可完成向工作台的数据读取与心跳上报：
                </span>
                <button
                  onClick={() => handleCopy(curlExample, 'curl')}
                  className="h-7 px-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-mono flex items-center space-x-1.5"
                >
                  {copiedKey === 'curl' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'curl' ? '已复制全部' : '一键复制全部命令'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                {curlExample}
              </pre>
            </div>
          )}

          {/* Tab 3: Python */}
          {activeSubTab === 'python' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium text-[11px]">
                  可直接嵌入您的 OpenClaw Daemon 或本地 Python Agent 循环主程序中：
                </span>
                <button
                  onClick={() => handleCopy(pythonExample, 'python')}
                  className="h-7 px-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-mono flex items-center space-x-1.5"
                >
                  {copiedKey === 'python' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'python' ? '已复制 Python 代码' : '复制代码'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                {pythonExample}
              </pre>
            </div>
          )}

          {/* Tab 4: Live Tester */}
          {activeSubTab === 'tester' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Play className="w-3.5 h-3.5 text-blue-600" />
                  <span>实时模拟外部 Agent 请求发送</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      模拟 Agent 名称 (agentName):
                    </label>
                    <input
                      type="text"
                      value={testAgentName}
                      onChange={(e) => setTestAgentName(e.target.value)}
                      className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2.5 font-mono text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      模拟处理延迟 (latencyMs):
                    </label>
                    <input
                      type="number"
                      value={testLatency}
                      onChange={(e) => setTestLatency(Number(e.target.value))}
                      className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2.5 font-mono text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      当前执行的任务摘要 (currentTask):
                    </label>
                    <input
                      type="text"
                      value={testTask}
                      onChange={(e) => setTestTask(e.target.value)}
                      className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2.5 font-mono text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    disabled={isSending}
                    onClick={runLiveHeartbeatTest}
                    className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-xs"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{isSending ? '正在发送...' : '以 Agent 身份发送心跳 (POST /heartbeat)'}</span>
                  </button>

                  <button
                    disabled={isSending}
                    onClick={runLiveAuditTest}
                    className="h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>上报规则审计留痕 (POST /audit/log)</span>
                  </button>
                </div>
              </div>

              {/* Response window */}
              {testResponse && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 font-mono">
                    后端实时响应 (HTTP Response):
                  </span>
                  <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
                    {testResponse}
                  </pre>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>测试成功！已实时写入工作台心跳与健康日志中。</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 px-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>开发环境 API 网关端口: 3000 (对外开放中)</span>
          </div>

          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
};
