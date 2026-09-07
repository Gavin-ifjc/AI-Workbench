// server/seed-emails.ts
// 邮件通知打通：把历史真实邮件通知(mail-notifications.json)灌进工作台 SQLite email_notifications
// 幂等：按 messageId 作为 id upsert，重复执行不产生重复
// 用法: npx tsx server/seed-emails.ts
import fs from 'fs';
import { upsertEmailNotification, getAllEmailNotifications } from './db';

const SRC = '/Users/Shared/元元/工作台/mail-notifications.json';

// 类型宽化，便于导入（结构来自旧工作台存储）
interface RawMail {
  messageId: string;
  date?: string;
  time?: string;
  projectId?: string;
  projectName?: string;
  subject?: string;
  sender?: string;
  content?: string;
  archive?: string;
  ledger?: string;
  next?: string;
}

function guessType(subject = '', content = ''): string {
  const s = subject + content;
  if (/RFQ|quoting|报价|询价|Request for Quotation|询盘/i.test(s)) return '新商机邮件通知';
  if (/PO|Purchase Order|订单/i.test(s)) return '订单确认邮件';
  if (/催办|urgent|跟进|审阅|review/i.test(s)) return '邮件通知';
  if (/clarif|澄清|确认|答复|RE:/i.test(s)) return '邮件通知';
  return '邮件通知';
}

export function main(): number {
  if (!fs.existsSync(SRC)) { console.log('邮件源文件不存在:', SRC); return 0; }
  const raws: RawMail[] = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  let added = 0, skipped = 0;
  for (const r of raws) {
    if (!r.messageId) { skipped++; continue; }
    const subject = `${r.projectId ? r.projectId + ' ' : ''}${r.projectName || ''}${r.subject ? ' ' + r.subject : ''}`.trim() || '(无主题)';
    const dateStr = r.date || new Date().toISOString().slice(0, 10);
    const time = r.time || '';
    upsertEmailNotification({
      id: r.messageId,
      notificationType: guessType(r.subject, r.content),
      date: `${dateStr}${time ? ' ' + time : ''}`,
      subject,
      content: r.content || '',
      archiveStatus: r.archive || '暂未归档',
      ledgerStatus: (r.ledger && r.ledger.length > 0 && !/待办/.test(r.ledger)) ? '已闭环' : '待处理',
      nextStepSuggestion: r.next || '',
      sender: r.sender || '',
      recipient: '',
      suggestedAgent: '',
      priority: /拍板|催办|urgent|REVIEW|审阅/i.test((r.next || '') + (r.subject || '')) ? 'high' : 'normal',
      rawSource: 'mail-notifications.json(8901旧工作台历史)',
      replies: [],
    } as never);
    added++;
  }
  const all = getAllEmailNotifications();
  console.log(`完成: 处理 ${raws.length} 条原始, 新增/更新 ${added}, 跳过 ${skipped}`);
  console.log(`当前工作台 email_notifications 总数: ${all.length}`);
  return added;
}

// 直接执行时跑
if (process.argv[1] && process.argv[1].endsWith('seed-emails.ts')) {
  main();
}
