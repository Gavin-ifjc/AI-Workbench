import React, { useState, useMemo } from 'react';
import {
  Mail,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MessageSquareQuote,
  LayoutGrid,
  ListFilter,
  Plus,
} from 'lucide-react';
import { EmailNotification, AgentAsset } from '../types';

interface EmailNotificationBoardProps {
  notifications: EmailNotification[];
  agents: AgentAsset[];
  onReplyEmail: (
    emailId: string,
    replyText: string,
    assignedAgent: string,
    actionType: 'proceed' | 'reject' | 'delegate' | 'custom'
  ) => void;
  onSyncNewNotification?: (newEmail: Partial<EmailNotification>) => void;
}

export const EmailNotificationBoard: React.FC<EmailNotificationBoardProps> = ({
  notifications,
  agents,
  onReplyEmail,
  onSyncNewNotification,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [expandedContentIds, setExpandedContentIds] = useState<Record<string, boolean>>({});
  const [showReplyForClosed, setShowReplyForClosed] = useState<Record<string, boolean>>({});

  // Per-card reply inputs state
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [assignedAgents, setAssignedAgents] = useState<Record<string, string>>({});
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSendReply = (email: EmailNotification) => {
    const text = replyInputs[email.id]?.trim();
    if (!text) return;

    // 批复统一答复给元元,由元元内部调度执行 agent(王总不做指派)
    const agent = '元元';
    setSubmittingId(email.id);

    setTimeout(() => {
      onReplyEmail(email.id, text, agent, 'proceed');
      setSubmittingId(null);
      // Clear input
      setReplyInputs((prev) => ({ ...prev, [email.id]: '' }));
    }, 250);
  };

  const handleQuickPreset = (emailId: string, presetText: string, agentName?: string) => {
    setReplyInputs((prev) => ({ ...prev, [emailId]: presetText }));
    if (agentName) {
      setAssignedAgents((prev) => ({ ...prev, [emailId]: agentName }));
    }
  };

  const toggleContentExpand = (id: string) => {
    setExpandedContentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filterStatus === 'pending' && item.ledgerStatus !== '待处理') return false;
      if (filterStatus === 'closed' && item.ledgerStatus !== '已闭环' && item.ledgerStatus !== '已处理') return false;
      if (filterStatus === 'opportunity' && !item.notificationType.includes('商机')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.id.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.nextStepSuggestion.toLowerCase().includes(q) ||
          (item.suggestedAgent && item.suggestedAgent.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [notifications, filterStatus, searchQuery]);

  const pendingCount = notifications.filter((n) => n.ledgerStatus === '待处理').length;
  const closedCount = notifications.filter((n) => n.ledgerStatus === '已闭环' || n.ledgerStatus === '已处理').length;

  return (
    <div className="space-y-3">
      {/* Top Banner: Compact Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.015)] p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-800">
                邮件通知
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-mono font-bold">
                {pendingCount} 待批
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                {closedCount} 闭环
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="紧凑三列卡片视图"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>紧凑卡片 (3列)</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="超紧凑清单列表视图"
            >
              <ListFilter className="w-3 h-3" />
              <span>超紧凑清单</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Tight Padding) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.015)] p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部 ({notifications.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>待王总定夺 ({pendingCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('closed')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
              filterStatus === 'closed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>已闭环 ({closedCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('opportunity')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'opportunity'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            商机通知
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索邮件ID、主题、商机或 Agent..."
            className="w-full pl-8 pr-2.5 py-1 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* View 1: 3-Column Compact Grid (每行三个，纵向紧凑设计) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredNotifications.map((item) => {
            const isPending = item.ledgerStatus === '待处理';
            const isClosed = item.ledgerStatus === '已闭环' || item.ledgerStatus === '已处理';
            const replyText = replyInputs[item.id] || '';
            const currentAssignedAgent = assignedAgents[item.id] || item.suggestedAgent || '苏念';
            const isExpandedCitation = expandedCitationId === item.id;
            const isExpandedContent = !!expandedContentIds[item.id];
            const isSubmitting = submittingId === item.id;
            const isClosedReplyOpen = !!showReplyForClosed[item.id];

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border transition-all duration-150 flex flex-col justify-between overflow-hidden ${
                  isPending
                    ? 'border-amber-300 shadow-[0_2px_12px_rgba(245,158,11,0.06)] ring-1 ring-amber-400/20'
                    : 'border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
                }`}
              >
                {/* Card Main Body: Compact Spacing */}
                <div className="p-3 space-y-2">
                  {/* Row 1: Direction Badge + Type Tag + Date */}
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      {/* 方向徽章: 客户来件/我方发出/我方转发 */}
                      {(() => {
                        const dir = (item as any).direction || '';
                        if (!dir) return null;
                        const style = dir === '客户来件'
                          ? 'bg-sky-100 text-sky-800 border-sky-300'
                          : dir === '我方发出'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-violet-100 text-violet-800 border-violet-300';
                        return (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${style}`}>
                            {dir === '客户来件' ? '⬇ 客户来件' : dir === '我方发出' ? '⬆ 我方发出' : '⇄ 我方转发'}
                          </span>
                        );
                      })()}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                          item.notificationType.includes('商机')
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : item.notificationType.includes('澄清')
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : item.notificationType.includes('风险')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Mail className="w-2.5 h-2.5" />
                        {item.notificationType}
                      </span>

                      {item.priority === 'critical' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold shrink-0 animate-pulse">
                          特急
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-0.5 shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{item.date.replace('2026-', '')}</span>
                    </div>
                  </div>

                  {/* Row 2: Subject & Status Badge */}
                  <div className="flex items-start justify-between gap-1.5">
                    <h3
                      className="text-xs font-bold text-slate-900 leading-snug line-clamp-1 hover:line-clamp-2 transition-all cursor-pointer"
                      title={(item as any).projectName || item.subject}
                      onClick={() => toggleContentExpand(item.id)}
                    >
                      {(item as any).projectName || item.subject}
                    </h3>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0 flex items-center gap-1 ${
                        isPending
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isPending ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          待处理
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          已闭环
                        </>
                      )}
                    </span>
                  </div>

                  {/* Row 3: Content Snippet (Compact 2-line clamp with click to expand) */}
                  <div
                    onClick={() => toggleContentExpand(item.id)}
                    className="bg-slate-50/80 hover:bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] text-slate-700 leading-relaxed cursor-pointer transition-colors"
                  >
                    <p className={isExpandedContent ? 'whitespace-pre-wrap' : 'line-clamp-2'}>
                      <span className="text-slate-400 font-semibold mr-1">内容:</span>
                      {item.content}
                    </p>
                  </div>

                  {/* Row 4: Next Step Suggestion (Compact 1-2 line strip) */}
                  <div className="bg-amber-50/60 border border-amber-200/70 rounded-lg px-2 py-1.5 text-[11px] text-amber-900 flex items-start gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                    <p className="line-clamp-2 leading-tight">
                      <strong className="text-amber-800">建议:</strong> {item.nextStepSuggestion}
                    </p>
                  </div>

                  {/* Row 5: Inline Metadata (仅归档;责任Agent不展示——执行调度由元元内部安排) */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-0.5">
                    <span className="truncate max-w-[100%]">
                      归档: <span className="text-slate-600">{item.archiveStatus}</span>
                    </span>
                  </div>

                  {/* Row 6: Closed-Loop Reply Record (If any) */}
                  {item.replies && item.replies.length > 0 && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2 text-[11px] text-emerald-950 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-emerald-800">
                        <span className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          已闭环批复 ({item.replies[item.replies.length - 1].assignedAgent})
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <span>{item.replies[item.replies.length - 1].repliedAt.split(' ')[1] || item.replies[item.replies.length - 1].repliedAt}</span>
                          <button
                            onClick={() =>
                              setExpandedCitationId(isExpandedCitation ? null : item.id)
                            }
                            className="text-blue-600 hover:text-blue-700 underline text-[10px]"
                          >
                            {isExpandedCitation ? '收起报文' : '查看报文'}
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] font-semibold text-emerald-900 line-clamp-2">
                        “{item.replies[item.replies.length - 1].content}”
                      </p>

                      {isExpandedCitation && (
                        <div className="mt-1 pt-1 border-t border-emerald-200/80 font-mono text-[9.5px] text-slate-600 bg-white/90 p-1.5 rounded border border-emerald-100 overflow-x-auto whitespace-pre-wrap leading-tight">
                          <div className="text-slate-400 font-bold mb-0.5 flex items-center gap-1">
                            <MessageSquareQuote className="w-2.5 h-2.5 text-emerald-600" />
                            推入 Agent Session 报文：
                          </div>
                          {item.replies[item.replies.length - 1].citationSnippet}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer: 王总回复意见紧凑交互区 */}
                <div className="bg-slate-50/90 border-t border-slate-200 px-3 py-2 space-y-1.5">
                  {/* For Closed cards: show compact toggle if not already opened */}
                  {isClosed && !isClosedReplyOpen ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[10.5px] text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        已注入会话闭环
                      </span>
                      <button
                        onClick={() =>
                          setShowReplyForClosed((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="text-[10px] text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>追加批示</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Presets & Assign Row */}
                      <div className="flex items-center justify-between gap-1 text-[10.5px]">
                        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
                          <button
                            onClick={() =>
                              handleQuickPreset(
                                item.id,
                                '同意推进。安排苏念先做客户背景调研、出初步商务分析，再决定是否正式报价。',
                                '苏念'
                              )
                            }
                            className="text-[9.5px] px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 shrink-0 transition-colors"
                            title="一键填入初研建议"
                          >
                            +初研推进
                          </button>
                          <button
                            onClick={() =>
                              handleQuickPreset(
                                item.id,
                                '转元元统筹，协调工程技术组与商务组于24小时内出具方案建档。',
                                '元元'
                              )
                            }
                            className="text-[9.5px] px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 shrink-0 transition-colors"
                            title="转元元统筹建档"
                          >
                            +元元建档
                          </button>
                          <button
                            onClick={() =>
                              handleQuickPreset(
                                item.id,
                                '暂不正式报价，请苏念先要求对方提供完整管径规格、工期与业主资质再定。',
                                '苏念'
                              )
                            }
                            className="text-[9.5px] px-1.5 py-0.5 rounded bg-white hover:bg-amber-50 hover:text-amber-700 text-slate-600 border border-slate-200 shrink-0 transition-colors"
                            title="补充资质"
                          >
                            +补资质
                          </button>
                        </div>

                      </div>

                      {/* Reply Input Bar + Send Button in single row */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) =>
                            setReplyInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                              handleSendReply(item);
                            }
                          }}
                          placeholder="王总批复意见 (自动引用并注入 Session)..."
                          className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        />

                        <button
                          onClick={() => handleSendReply(item)}
                          disabled={!replyText.trim() || isSubmitting}
                          className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 text-white text-[11px] font-semibold shadow-xs flex items-center space-x-1 shrink-0 transition-all"
                        >
                          {isSubmitting ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Send className="w-2.5 h-2.5" />
                          )}
                          <span>闭环派单</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: Ultra-Dense Table/List View (超紧凑清单行视图，应对大体量邮件) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.015)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-semibold">
                  <th className="py-2 px-3 w-28">状态 / 类型</th>
                  <th className="py-2 px-3 w-36">邮件ID</th>
                  <th className="py-2 px-3">邮件主题 / 简报</th>
                  <th className="py-2 px-3 w-32">接收时间</th>
                  <th className="py-2 px-3 w-56 text-right">王总批复闭环操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredNotifications.map((item) => {
                  const isPending = item.ledgerStatus === '待处理';
                  const replyText = replyInputs[item.id] || '';
                  const currentAssignedAgent = assignedAgents[item.id] || item.suggestedAgent || '苏念';
                  const isSubmitting = submittingId === item.id;
                  const hasReplies = item.replies && item.replies.length > 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isPending ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-1 w-fit ${
                              isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isPending ? '待处理' : '已闭环'}
                          </span>
                          <span className="text-[10px] font-bold truncate" style={{
                            color: (item as any).direction === '我方发出' ? '#047857' : (item as any).direction === '我方转发' ? '#6d28d9' : '#0369a1'
                          }}>
                            {(item as any).direction === '我方发出' ? '⬆ 我方发出' : (item as any).direction === '我方转发' ? '⇄ 我方转发' : (item as any).direction === '客户来件' ? '⬇ 客户来件' : ''}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">
                            {item.notificationType}
                          </span>
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <div className="max-w-xl">
                          <div className="font-bold text-slate-900 line-clamp-1">{((item as any).projectName || item.subject)}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.nextStepSuggestion}
                          </div>
                          {hasReplies && (
                            <div className="text-[10px] text-emerald-700 font-medium mt-0.5 line-clamp-1">
                              批复: “{item.replies[item.replies.length - 1].content}” ({item.replies[item.replies.length - 1].assignedAgent})
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3 text-slate-400 font-mono text-[10.5px] whitespace-nowrap">
                        {item.date}
                      </td>

                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) =>
                              setReplyInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            placeholder="批复意见..."
                            className="w-36 px-2 py-0.8 bg-white border border-slate-200 rounded text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => handleSendReply(item)}
                            disabled={!replyText.trim() || isSubmitting}
                            className="h-6 px-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-[10.5px] font-semibold shrink-0"
                          >
                            派单
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-500 shadow-[0_2px_10px_rgba(0,0,0,0.015)]">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">暂无待办邮件通知</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            系统当前无预置模拟数据。当本地邮件扫描探针 (8901) 或 OpenClaw 探活服务接收到新邮件时，将实时呈报于此。
          </p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          <Mail className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
          <p className="text-xs">未检索到符合筛选条件的邮件通知</p>
        </div>
      ) : null}
    </div>
  );
};

