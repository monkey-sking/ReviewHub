const fs = require('fs');
const path = require('path');

const DEFAULT_APPROVAL_PATH =
  process.env.APPROVAL_REGISTRY_PATH ||
  '/Volumes/SSD/Projects/Operations/Ops/state/approval_registry.json';
const DEFAULT_QUEUE_PATH =
  process.env.DAILY_CHANNEL_QUEUE_PATH ||
  '/Volumes/SSD/Projects/Operations/Ops/state/daily_channel_queue.json';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function cleanValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).trim();
  return normalized === '-' ? '' : normalized;
}

function mergeNotes(...parts) {
  return [...new Set(parts.map(cleanValue).filter(Boolean))].join(' • ');
}

function normalizePlatform(value) {
  return cleanValue(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeText(value) {
  return cleanValue(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function findApprovalMatch(queueItem, pendingApprovals) {
  const exactSourceMatches = pendingApprovals.filter((entry) => {
    return (
      cleanValue(entry.source).toLowerCase() === cleanValue(queueItem.source).toLowerCase()
    );
  });

  if (exactSourceMatches.length === 1) {
    return exactSourceMatches[0];
  }

  if (exactSourceMatches.length > 1) {
    const platformMatch = exactSourceMatches.find((entry) => {
      return normalizePlatform(entry.platform) === normalizePlatform(queueItem.platform);
    });

    return platformMatch || exactSourceMatches[0];
  }

  const queueTitle = normalizeText(queueItem.title);

  return (
    pendingApprovals.find((entry) => {
      return (
        normalizePlatform(entry.platform) === normalizePlatform(queueItem.platform) &&
        [entry.notes, entry.post_id, entry.item_id].some((candidate) => {
          const normalizedCandidate = normalizeText(candidate);
          return normalizedCandidate && queueTitle.includes(normalizedCandidate);
        })
      );
    }) || null
  );
}

function getPlatformCount(queueData, items) {
  const configuredPlatforms = Object.keys(queueData.platform_counts || {});

  if (configuredPlatforms.length > 0) {
    return configuredPlatforms.length;
  }

  return new Set(items.map((item) => item.platform).filter(Boolean)).size;
}

function buildItems(queueData, approvalData) {
  const pendingApprovals = (approvalData.entries || []).filter((entry) => entry.status === 'pending');

  return (queueData.items || [])
    .filter((item) => item.status === 'approval_pending' || item.status === 'queued')
    .map((queueItem, index) => {
      const approval = findApprovalMatch(queueItem, pendingApprovals);
      const queueNotes = cleanValue(queueItem.notes);
      const approvalNotes = cleanValue(approval && approval.notes);

      return {
        id: cleanValue(queueItem.item_id) || `queue-item-${index + 1}`,
        record_type: 'queue_item',
        title: cleanValue(queueItem.title) || cleanValue(approval && approval.notes) || 'Untitled',
        platform: cleanValue(queueItem.platform) || cleanValue(approval && approval.platform) || 'Unknown',
        status: cleanValue(queueItem.status) || cleanValue(approval && approval.status) || 'unknown',
        risk: cleanValue(queueItem.risk) || 'unknown',
        category: cleanValue(queueItem.category),
        owner: cleanValue(queueItem.owner) || cleanValue(approval && approval.requested_by),
        notes: mergeNotes(queueNotes, approvalNotes),
        reason: cleanValue(approval && approval.reason),
        source: cleanValue(queueItem.source) || cleanValue(approval && approval.source),
        requested_at: cleanValue(approval && approval.requested_at_utc),
        requested_by: cleanValue(approval && approval.requested_by),
        approval_ticket: cleanValue(approval && approval.approval_ticket),
        approval_entry_id: cleanValue(approval && approval.entry_id),
        approval_match: Boolean(approval),
        raw: {
          queue: queueItem,
          approval: approval || null
        }
      };
    });
}

function buildFilterValues(items) {
  const unique = (field) => {
    return [...new Set(items.map((item) => item[field]).filter(Boolean))].sort((left, right) => {
      return left.localeCompare(right, 'en', { sensitivity: 'base' });
    });
  };

  return {
    statuses: unique('status'),
    platforms: unique('platform'),
    risks: unique('risk')
  };
}

function loadDashboardData() {
  const approvalData = readJson(DEFAULT_APPROVAL_PATH);
  const queueData = readJson(DEFAULT_QUEUE_PATH);
  const items = buildItems(queueData, approvalData);
  const pendingApprovals = (approvalData.entries || []).filter((entry) => entry.status === 'pending');

  return {
    generated_at: new Date().toISOString(),
    source_files: {
      approval_registry: path.resolve(DEFAULT_APPROVAL_PATH),
      daily_channel_queue: path.resolve(DEFAULT_QUEUE_PATH)
    },
    summary: {
      pending_approvals: pendingApprovals.length,
      approval_pending_items: Number(queueData.status_counts && queueData.status_counts.approval_pending) || items.filter((item) => item.status === 'approval_pending').length,
      queued_items: Number(queueData.status_counts && queueData.status_counts.queued) || items.filter((item) => item.status === 'queued').length,
      platform_count: getPlatformCount(queueData, items),
      total_items: items.length
    },
    metadata: {
      approval_schema: cleanValue(approvalData.schema_version),
      approval_updated_at: cleanValue(approvalData.updated_at_utc),
      queue_schema: cleanValue(queueData.schema_version),
      queue_run_date: cleanValue(queueData.run_date)
    },
    filters: buildFilterValues(items),
    items
  };
}

module.exports = {
  loadDashboardData
};
