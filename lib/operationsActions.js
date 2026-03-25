const fs = require('fs');
const path = require('path');
const { loadDashboardData, getOperationsRoot } = require('./dashboard');
const { buildOperationsRecordCatalog, cleanValue } = require('./operationsRecords');

const OPS_ACTION_LOG_FILENAME = 'reviewhub_ops_action_log.ndjson';
const ALLOWED_OPS_ACTIONS = {
  mark_review: 'review',
  mark_execute: 'execute',
  mark_defer: 'defer',
  mark_done: 'done',
  restore_auto: ''
};

class OpsActionError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'OpsActionError';
    this.statusCode = options.statusCode || 400;
    this.details = options.details || null;
  }
}

function getDefaultActor() {
  return cleanValue(process.env.REVIEWHUB_DEFAULT_ACTOR) || '@reviewhub';
}

function resolveActor(actor) {
  return cleanValue(actor) || getDefaultActor();
}

function getOpsActionLogPath() {
  return process.env.REVIEWHUB_OPS_ACTION_LOG_PATH
    || path.join(path.resolve(getOperationsRoot()), 'Ops', 'state', OPS_ACTION_LOG_FILENAME);
}

function normalizeDeferUntil(value) {
  const raw = cleanValue(value);

  if (!raw) {
    return '';
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw new OpsActionError('暂缓时间格式无效。', {
      details: '请传 ISO 时间或浏览器 datetime-local 对应的可解析时间。'
    });
  }

  return parsed.toISOString();
}

function appendOpsAuditEntry(entry) {
  const logPath = path.resolve(getOpsActionLogPath());
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
  return logPath;
}

function getOperationsRecordByActionId(actionId, dashboardData) {
  const catalog = buildOperationsRecordCatalog(dashboardData && dashboardData.operations_review);
  return catalog.find((record) => cleanValue(record.action_id) === actionId) || null;
}

function applyOpsAction({ actionId, action, actor = '', note = '', deferUntilUtc = '' }) {
  const normalizedActionId = cleanValue(actionId);
  const normalizedAction = cleanValue(action);
  const manualState = Object.prototype.hasOwnProperty.call(ALLOWED_OPS_ACTIONS, normalizedAction)
    ? ALLOWED_OPS_ACTIONS[normalizedAction]
    : null;
  const resolvedActor = resolveActor(actor);
  const nowIso = new Date().toISOString();
  const normalizedDeferUntil = normalizeDeferUntil(deferUntilUtc);

  if (!normalizedActionId) {
    throw new OpsActionError('缺少 record_key。');
  }

  if (!normalizedAction) {
    throw new OpsActionError('缺少 action。');
  }

  if (manualState === null) {
    throw new OpsActionError(`不支持的问题记录动作：${normalizedAction}`);
  }

  const beforeDashboard = loadDashboardData();
  const existingRecord = getOperationsRecordByActionId(normalizedActionId, beforeDashboard);

  if (!existingRecord) {
    throw new OpsActionError('找不到对应的问题记录。', { statusCode: 404 });
  }

  if (normalizedAction === 'mark_defer' && !normalizedDeferUntil) {
    throw new OpsActionError('暂缓动作需要提供 defer_until_utc。');
  }

  const logPath = appendOpsAuditEntry({
    timestamp_utc: nowIso,
    actor: resolvedActor,
    action_id: normalizedActionId,
    ui_id: cleanValue(existingRecord.ui_id),
    record_kind: cleanValue(existingRecord.kind),
    record_title: cleanValue(existingRecord.title),
    action: normalizedAction,
    note: cleanValue(note),
    manual_state: manualState,
    defer_until_utc: normalizedDeferUntil,
    source_path: cleanValue(existingRecord.source_path),
    target_url: cleanValue(existingRecord.target_url)
  });

  const afterDashboard = loadDashboardData();
  const updatedRecord = Array.isArray(afterDashboard.operations_record_catalog)
    ? afterDashboard.operations_record_catalog.find((record) => cleanValue(record.action_id) === normalizedActionId) || null
    : null;

  return {
    ok: true,
    action: normalizedAction,
    action_id: normalizedActionId,
    updated_at_utc: nowIso,
    record: updatedRecord,
    ops_action_log_path: logPath,
    summary: afterDashboard.operations_review && afterDashboard.operations_review.summary
      ? afterDashboard.operations_review.summary
      : null
  };
}

module.exports = {
  OpsActionError,
  applyOpsAction,
  getOpsActionLogPath
};
