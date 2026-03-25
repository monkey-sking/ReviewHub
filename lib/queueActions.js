const fs = require('fs');
const path = require('path');
const {
  findApprovalMatch,
  getApprovalCandidates,
  getApprovalPath,
  getOperationsRoot,
  getQueuePath,
  loadDashboardData
} = require('./dashboard');

const ACTION_LOG_FILENAME = 'reviewhub_action_log.ndjson';
const MANUAL_ACTION_STATES = new Set(['needs_review', 'ready_to_execute', 'missing_info', 'deferred']);

class QueueActionError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'QueueActionError';
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

function readJsonFile(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new QueueActionError(`${label} 无法读取。`, {
      statusCode: 500,
      details: error.message
    });
  }
}

function writeJsonAtomic(filePath, payload) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2));
  fs.renameSync(tempPath, filePath);
}

function getActionLogPath() {
  return process.env.REVIEWHUB_ACTION_LOG_PATH
    || path.join(path.resolve(getOperationsRoot()), 'Ops', 'state', ACTION_LOG_FILENAME);
}

function getDefaultActor() {
  return cleanValue(process.env.REVIEWHUB_DEFAULT_ACTOR) || '@reviewhub';
}

function ensureQueueShape(queueData) {
  if (!queueData || typeof queueData !== 'object' || !Array.isArray(queueData.items)) {
    throw new QueueActionError('队列文件结构无效。', { statusCode: 500 });
  }
}

function ensureApprovalShape(approvalData) {
  if (!approvalData || typeof approvalData !== 'object' || !Array.isArray(approvalData.entries)) {
    throw new QueueActionError('审批文件结构无效。', { statusCode: 500 });
  }
}

function resolveActor(actor) {
  return cleanValue(actor) || getDefaultActor();
}

function normalizeDeferUntil(value) {
  const raw = cleanValue(value);

  if (!raw) {
    return '';
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw new QueueActionError('暂缓时间格式无效。', {
      details: '请传 ISO 时间或浏览器 datetime-local 对应的可解析时间。'
    });
  }

  return parsed.toISOString();
}

function normalizeMissingInfoReasons(reasons, fallback) {
  const normalized = Array.isArray(reasons)
    ? reasons.map(cleanValue).filter(Boolean)
    : [];

  if (normalized.length > 0) {
    return normalized;
  }

  return fallback ? [fallback] : [];
}

function normalizeReviewhub(queueItem) {
  return queueItem && queueItem.reviewhub && typeof queueItem.reviewhub === 'object'
    ? { ...queueItem.reviewhub }
    : {};
}

function updateReviewhub(queueItem, patch = {}) {
  const next = {
    ...normalizeReviewhub(queueItem),
    ...patch
  };

  if (next.manual_action_state && !MANUAL_ACTION_STATES.has(next.manual_action_state)) {
    delete next.manual_action_state;
  }

  if (Array.isArray(next.missing_info_reasons)) {
    next.missing_info_reasons = next.missing_info_reasons.map(cleanValue).filter(Boolean);
  }

  if (next.manual_action_state !== 'deferred') {
    delete next.defer_until_utc;
  }

  Object.keys(next).forEach((key) => {
    const value = next[key];
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (value === null || value === undefined || value === '' || isEmptyArray) {
      delete next[key];
    }
  });

  if (Object.keys(next).length === 0) {
    delete queueItem.reviewhub;
    return;
  }

  queueItem.reviewhub = next;
}

function findQueueItem(queueData, itemId) {
  return (queueData.items || []).find((item) => cleanValue(item.item_id) === itemId) || null;
}

function findApprovalEntryForQueueItem(queueItem, approvalData) {
  const linkedEntryId = cleanValue(queueItem.reviewhub && queueItem.reviewhub.linked_approval_entry_id);

  if (linkedEntryId) {
    const linkedEntry = (approvalData.entries || []).find((entry) => cleanValue(entry.entry_id) === linkedEntryId);
    if (linkedEntry) {
      return linkedEntry;
    }
  }

  const approvalEntries = approvalData.entries || [];
  return findApprovalMatch(queueItem, getApprovalCandidates(queueItem, approvalEntries));
}

function removePendingApprovalNote(note) {
  const normalized = cleanValue(note);

  if (!normalized) {
    return '';
  }

  const cleaned = normalized
    .split(/\s*[•|]\s*|\s*,\s*/)
    .map((part) => cleanValue(part))
    .filter((part) => part && part !== 'approval_status=pending');

  return cleaned.join(' • ');
}

function recomputeQueueAggregates(queueData) {
  const items = Array.isArray(queueData.items) ? queueData.items : [];
  const statusCounts = {};
  const platformCounts = {};
  const riskCounts = {};

  for (const item of items) {
    const status = cleanValue(item.status);
    const platform = cleanValue(item.platform);
    const risk = cleanValue(item.risk);

    if (status) {
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    if (platform) {
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }

    if (risk) {
      riskCounts[risk] = (riskCounts[risk] || 0) + 1;
    }
  }

  queueData.total_items = items.length;
  queueData.status_counts = statusCounts;
  queueData.platform_counts = platformCounts;
  queueData.risk_counts = riskCounts;
}

function appendAuditEntry(entry) {
  const logPath = getActionLogPath();
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

function ensureApprovalEntryPending(queueItem, approvalEntry) {
  if (cleanValue(queueItem.status) !== 'approval_pending'
    || !approvalEntry
    || cleanValue(approvalEntry.status) !== 'pending') {
    throw new QueueActionError('该动作只能用于审核待定、且审批项仍为 pending 的项目。', { statusCode: 409 });
  }
}

function applyApproveAction(queueItem, approvalEntry, actor, note, nowIso) {
  if (!approvalEntry) {
    throw new QueueActionError('当前项目没有可批准的审批记录。', { statusCode: 409 });
  }

  ensureApprovalEntryPending(queueItem, approvalEntry);

  approvalEntry.status = 'approved';
  approvalEntry.approved = true;
  approvalEntry.approved_by = actor;
  approvalEntry.approved_at_utc = nowIso;
  approvalEntry.revoked_by = '';
  approvalEntry.revoked_at_utc = '';

  if (!cleanValue(approvalEntry.reason)) {
    approvalEntry.reason = 'Approved from ReviewHub queue action.';
  }

  queueItem.status = 'queued';
  queueItem.notes = removePendingApprovalNote(queueItem.notes);
  updateReviewhub(queueItem, {
    linked_approval_entry_id: cleanValue(approvalEntry.entry_id),
    last_action: 'approve',
    action_note: cleanValue(note),
    updated_at_utc: nowIso,
    updated_by: actor,
    manual_action_state: '',
    defer_until_utc: ''
  });
}

function applyRejectAction(queueItem, approvalEntry, actor, note, nowIso) {
  if (!approvalEntry) {
    throw new QueueActionError('当前项目没有可驳回的审批记录。', { statusCode: 409 });
  }

  ensureApprovalEntryPending(queueItem, approvalEntry);

  approvalEntry.status = 'revoked';
  approvalEntry.approved = false;
  approvalEntry.revoked_by = actor;
  approvalEntry.revoked_at_utc = nowIso;
  approvalEntry.approved_by = '';
  approvalEntry.approved_at_utc = '';

  updateReviewhub(queueItem, {
    linked_approval_entry_id: cleanValue(approvalEntry.entry_id),
    last_action: 'reject',
    action_note: cleanValue(note),
    updated_at_utc: nowIso,
    updated_by: actor,
    manual_action_state: 'missing_info',
    missing_info_reasons: normalizeMissingInfoReasons([], 'approval rejected'),
    defer_until_utc: ''
  });
}

function applyMissingInfoAction(queueItem, actor, note, reasons, nowIso) {
  updateReviewhub(queueItem, {
    last_action: 'mark_missing_info',
    action_note: cleanValue(note),
    updated_at_utc: nowIso,
    updated_by: actor,
    manual_action_state: 'missing_info',
    missing_info_reasons: normalizeMissingInfoReasons(reasons, 'manual review'),
    defer_until_utc: ''
  });
}

function applyReadyAction(queueItem, actor, note, nowIso) {
  updateReviewhub(queueItem, {
    last_action: 'mark_ready',
    action_note: cleanValue(note),
    updated_at_utc: nowIso,
    updated_by: actor,
    manual_action_state: 'ready_to_execute',
    missing_info_reasons: [],
    defer_until_utc: ''
  });
}

function applyDeferredAction(queueItem, actor, note, deferUntilUtc, nowIso) {
  if (!deferUntilUtc) {
    throw new QueueActionError('暂缓动作需要提供 defer_until_utc。');
  }

  updateReviewhub(queueItem, {
    last_action: 'mark_deferred',
    action_note: cleanValue(note),
    updated_at_utc: nowIso,
    updated_by: actor,
    manual_action_state: 'deferred',
    missing_info_reasons: [],
    defer_until_utc: deferUntilUtc
  });
}

function applyRestoreAutoAction(queueItem, actor, note, nowIso) {
  updateReviewhub(queueItem, {
    last_action: 'restore_auto',
    action_note: cleanValue(note),
    updated_at_utc: nowIso,
    updated_by: actor,
    manual_action_state: '',
    missing_info_reasons: [],
    defer_until_utc: ''
  });
}

function applyNormalizedAction(queueItem, approvalData, action, actor, note, reasons, nowIso, deferUntilUtc) {
  const approvalEntry = findApprovalEntryForQueueItem(queueItem, approvalData);

  if (action === 'approve') {
    applyApproveAction(queueItem, approvalEntry, actor, note, nowIso);
    return true;
  }

  if (action === 'reject') {
    applyRejectAction(queueItem, approvalEntry, actor, note, nowIso);
    return true;
  }

  if (action === 'mark_missing_info') {
  applyMissingInfoAction(queueItem, actor, note, reasons, nowIso);
    return false;
  }

  if (action === 'mark_ready') {
    applyReadyAction(queueItem, actor, note, nowIso);
    return false;
  }

  if (action === 'mark_deferred') {
    applyDeferredAction(queueItem, actor, note, deferUntilUtc, nowIso);
    return false;
  }

  if (action === 'restore_auto') {
    applyRestoreAutoAction(queueItem, actor, note, nowIso);
    return false;
  }

  throw new QueueActionError(`不支持的动作：${action}`);
}

function appendAuditEntries(itemIds, queueData, action, note, actor, reasons, deferUntilUtc, queuePath, approvalPath, nowIso) {
  itemIds.forEach((itemId) => {
    const queueItem = findQueueItem(queueData, itemId);

    appendAuditEntry({
      timestamp_utc: nowIso,
      actor,
      item_id: itemId,
      action,
      note: cleanValue(note),
      reasons: normalizeMissingInfoReasons(reasons),
      defer_until_utc: cleanValue(deferUntilUtc),
      queue_path: queuePath,
      approval_path: approvalPath,
      linked_approval_entry_id: cleanValue(queueItem && queueItem.reviewhub && queueItem.reviewhub.linked_approval_entry_id)
    });
  });
}

function normalizeItemIds(itemIds) {
  if (!Array.isArray(itemIds)) {
    return [];
  }

  return Array.from(new Set(itemIds.map(cleanValue).filter(Boolean)));
}

function applyQueueActionsBatch({ itemIds, action, note = '', actor = '', reasons = [], deferUntilUtc = '' }) {
  const normalizedItemIds = normalizeItemIds(itemIds);
  const normalizedAction = cleanValue(action);
  const resolvedActor = resolveActor(actor);
  const nowIso = new Date().toISOString();
  const normalizedDeferUntil = normalizeDeferUntil(deferUntilUtc);

  if (normalizedItemIds.length === 0) {
    throw new QueueActionError('缺少 item_ids。');
  }

  if (!normalizedAction) {
    throw new QueueActionError('缺少 action。');
  }

  const queuePath = path.resolve(getQueuePath());
  const approvalPath = path.resolve(getApprovalPath());
  const queueData = readJsonFile(queuePath, '队列文件');
  const approvalData = readJsonFile(approvalPath, '审批文件');

  ensureQueueShape(queueData);
  ensureApprovalShape(approvalData);

  let approvalChanged = false;
  normalizedItemIds.forEach((itemId) => {
    const queueItem = findQueueItem(queueData, itemId);

    if (!queueItem) {
      throw new QueueActionError(`找不到对应的队列项目：${itemId}`, { statusCode: 404 });
    }

    const actionTouchedApproval = applyNormalizedAction(queueItem, approvalData, normalizedAction, resolvedActor, note, reasons, nowIso, normalizedDeferUntil);
    if (actionTouchedApproval) {
      approvalChanged = true;
    }
  });

  recomputeQueueAggregates(queueData);

  writeJsonAtomic(queuePath, queueData);
  if (approvalChanged) {
    approvalData.updated_at_utc = nowIso;
    writeJsonAtomic(approvalPath, approvalData);
  }
  appendAuditEntries(
    normalizedItemIds,
    queueData,
    normalizedAction,
    note,
    resolvedActor,
    reasons,
    normalizedDeferUntil,
    queuePath,
    approvalPath,
    nowIso
  );

  const dashboard = loadDashboardData();
  const updatedItems = normalizedItemIds
    .map((itemId) => (dashboard.items || []).find((item) => item.id === itemId) || null)
    .filter(Boolean);

  return {
    ok: true,
    action: normalizedAction,
    item_id: normalizedItemIds[0],
    item_ids: normalizedItemIds,
    updated_count: updatedItems.length,
    updated_at_utc: nowIso,
    item: updatedItems[0] || null,
    items: updatedItems,
    summary: dashboard.summary
  };
}

function applyQueueAction({ itemId, action, note = '', actor = '', reasons = [], deferUntilUtc = '' }) {
  const normalizedItemId = cleanValue(itemId);

  if (!normalizedItemId) {
    throw new QueueActionError('缺少 item_id。');
  }

  return applyQueueActionsBatch({
    itemIds: [normalizedItemId],
    action,
    note,
    actor,
    reasons,
    deferUntilUtc
  });
}

module.exports = {
  QueueActionError,
  applyQueueAction,
  applyQueueActionsBatch,
  getActionLogPath,
  normalizeItemIds,
  recomputeQueueAggregates
};
