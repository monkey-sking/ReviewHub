const fs = require('fs');
const path = require('path');
const { getThreadActionLogPath, loadDashboardData } = require('./dashboard');

const ALLOWED_THREAD_ACTIONS = {
  mark_ready: 'ready',
  mark_follow_up: 'follow_up',
  mark_blocked: 'blocked',
  mark_done: 'done',
  restore_auto: ''
};

class ThreadActionError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ThreadActionError';
    this.statusCode = options.statusCode || 400;
    this.details = options.details || null;
  }
}

function cleanValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).trim();
  return normalized === '-' ? '' : normalized;
}

function getDefaultActor() {
  return cleanValue(process.env.REVIEWHUB_DEFAULT_ACTOR) || '@reviewhub';
}

function resolveActor(actor) {
  return cleanValue(actor) || getDefaultActor();
}

function appendThreadAuditEntry(entry) {
  const logPath = path.resolve(getThreadActionLogPath());
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
  return logPath;
}

function getThreadById(replyId, dashboardData) {
  const records = dashboardData
    && dashboardData.ops_snapshot
    && dashboardData.ops_snapshot.modules
    && dashboardData.ops_snapshot.modules.threads
    && Array.isArray(dashboardData.ops_snapshot.modules.threads.records)
    ? dashboardData.ops_snapshot.modules.threads.records
    : [];

  return records.find((record) => cleanValue(record.reply_id) === replyId) || null;
}

function applyThreadAction({ replyId, action, note = '', actor = '' }) {
  const normalizedReplyId = cleanValue(replyId);
  const normalizedAction = cleanValue(action);
  const manualState = Object.prototype.hasOwnProperty.call(ALLOWED_THREAD_ACTIONS, normalizedAction)
    ? ALLOWED_THREAD_ACTIONS[normalizedAction]
    : null;
  const resolvedActor = resolveActor(actor);
  const nowIso = new Date().toISOString();

  if (!normalizedReplyId) {
    throw new ThreadActionError('缺少 reply_id。');
  }

  if (!normalizedAction) {
    throw new ThreadActionError('缺少 action。');
  }

  if (manualState === null) {
    throw new ThreadActionError(`不支持的线程动作：${normalizedAction}`);
  }

  const beforeDashboard = loadDashboardData();
  const existingThread = getThreadById(normalizedReplyId, beforeDashboard);

  if (!existingThread) {
    throw new ThreadActionError('找不到对应的回复任务。', { statusCode: 404 });
  }

  const logPath = appendThreadAuditEntry({
    timestamp_utc: nowIso,
    actor: resolvedActor,
    reply_id: normalizedReplyId,
    action: normalizedAction,
    note: cleanValue(note),
    manual_state: manualState,
    approval_ticket: cleanValue(existingThread.approval_ticket)
  });

  const afterDashboard = loadDashboardData();
  const updatedThread = getThreadById(normalizedReplyId, afterDashboard);

  return {
    ok: true,
    action: normalizedAction,
    reply_id: normalizedReplyId,
    updated_at_utc: nowIso,
    thread: updatedThread,
    thread_action_log_path: logPath,
    summary: afterDashboard.ops_snapshot && afterDashboard.ops_snapshot.modules
      ? afterDashboard.ops_snapshot.modules.threads || null
      : null
  };
}

module.exports = {
  ThreadActionError,
  applyThreadAction
};
