const ACTOR_STORAGE_KEY = 'reviewhub.actor';

function readStoredActor() {
  try {
    return window.localStorage.getItem(ACTOR_STORAGE_KEY) || '';
  } catch (_error) {
    return '';
  }
}

const state = {
  data: null,
  activeSection: 'overview',
  filters: {
    project: 'all',
    status: 'all',
    platform: 'all',
    risk: 'all',
    search: ''
  },
  detailMode: 'queue',
  selectedId: null,
  selectedThreadId: null,
  selectedOpsRecordId: null,
  actionFeedback: null,
  threadActionFeedback: null,
  batchActionFeedback: null,
  actionPending: false,
  threadPending: false,
  batchPending: false,
  threadInboxFilter: 'needs_reply',
  actor: readStoredActor()
};

const UI_LOCALE = 'zh-CN';

const DISPLAY_VALUE_MAP = {
  all: '全部',
  active: '进行中',
  approve: '批准并入队',
  approval_pending: '等待审核',
  approval_registry: '审核记录表',
  blocked: '阻塞',
  browser_post_queue_summary: '待自动发布数据',
  daily_channel_queue: '待处理内容列表',
  degraded: '降级',
  error: '错误',
  experiment_log: '试验记录文件',
  experiments: '试验记录',
  failed: '失败',
  feedback: '问题反馈',
  feedback_report: '反馈报告',
  fill: '自动填写',
  high: '高',
  green: '正常',
  'handoff ready': '可交接',
  inline_text: '内联文本',
  low: '低',
  manual_review: '需人工复核',
  'manual review': '需人工复核',
  marketing: '市场',
  medium: '中',
  missing_info: '资料不全',
  mark_missing_info: '标记缺信息',
  mark_done: '标记已处理',
  mark_blocked: '标记阻塞',
  mark_follow_up: '标记待跟进',
  mark_ready: '标记可执行',
  'needs info': '资料不全',
  'needs review': '等你决定',
  needs_reply: '待人工判断',
  needs_review: '等你决定',
  needs_target_url: '缺少目标 URL',
  'n/a': '不适用',
  no: '否',
  ok: '正常',
  ops: '运营',
  operations_review: '问题记录',
  post_handoffs: '待自动发布',
  pending: '待处理',
  queued: '已准备好',
  reject: '驳回',
  ready: '就绪',
  ready_to_execute: '可以继续',
  'ready to execute': '可以继续',
  metrics: '指标',
  posts: '发帖',
  replies: '回复',
  review_index: '审核记录文件',
  reviews: '审核记录',
  review: '需复核',
  restore_auto: '恢复自动判断',
  planned: '已计划',
  queue: '待处理内容',
  queue_item: '待处理内容',
  running: '进行中',
  pause: '暂停',
  sensitive: '敏感',
  started: '已启动',
  supervisor: '自动流程',
  threads: '待人工回复',
  unavailable: '不可用',
  unknown: '未知',
  'unknown item': '未知项目',
  'unknown job': '未知步骤',
  'unknown issue': '未知问题',
  'unknown path': '未知路径',
  'unknown reply': '未知回复',
  'unknown source': '未知来源',
  unknown_source: '未知来源',
  'unnamed experiment': '未命名试验',
  'unnamed review': '未命名记录',
  unassigned: '未分配',
  warning: '警告',
  watch: '关注',
  red: '红色',
  follow_up: '待跟进',
  done: '已处理',
  yes: '是'
};

const MISSING_INFO_LABELS = {
  'approval match': '审核记录',
  'approval reason': '审核原因',
  'manual review': '人工补充',
  owner: '负责人'
};

const elements = {
  actionLogList: document.getElementById('actionLogList'),
  actionLogMeta: document.getElementById('actionLogMeta'),
  actionLogPanel: document.getElementById('actionLogPanel'),
  approvalJson: document.getElementById('approvalJson'),
  batchActionActor: document.getElementById('batchActionActor'),
  batchActionBar: document.getElementById('batchActionBar'),
  batchActionNote: document.getElementById('batchActionNote'),
  batchActionPanel: document.getElementById('batchActionPanel'),
  batchActionStatus: document.getElementById('batchActionStatus'),
  batchActionSummary: document.getElementById('batchActionSummary'),
  bossThreadsMeta: document.getElementById('bossThreadsMeta'),
  bossThreadsSummary: document.getElementById('bossThreadsSummary'),
  detailActionBar: document.getElementById('detailActionBar'),
  detailActionActor: document.getElementById('detailActionActor'),
  detailActionNote: document.getElementById('detailActionNote'),
  detailActionPanel: document.getElementById('detailActionPanel'),
  detailActionStatus: document.getElementById('detailActionStatus'),
  detailContextBar: document.getElementById('detailContextBar'),
  detailContextPanel: document.getElementById('detailContextPanel'),
  detailEmpty: document.getElementById('detailEmpty'),
  detailGrid: document.getElementById('detailGrid'),
  detailSubtitle: document.getElementById('detailSubtitle'),
  detailTitle: document.getElementById('detailTitle'),
  detailView: document.getElementById('detailView'),
  executionSnapshotMeta: document.getElementById('executionSnapshotMeta'),
  executionSnapshotSummary: document.getElementById('executionSnapshotSummary'),
  experimentList: document.getElementById('experimentList'),
  experimentMeta: document.getElementById('experimentMeta'),
  feedbackMeta: document.getElementById('feedbackMeta'),
  feedbackSummary: document.getElementById('feedbackSummary'),
  handoffList: document.getElementById('handoffList'),
  handoffMeta: document.getElementById('handoffMeta'),
  itemList: document.getElementById('itemList'),
  listMeta: document.getElementById('listMeta'),
  needsInfoCount: document.getElementById('needsInfoCount'),
  needsInfoList: document.getElementById('needsInfoList'),
  needsReviewCount: document.getElementById('needsReviewCount'),
  needsReviewList: document.getElementById('needsReviewList'),
  queueJson: document.getElementById('queueJson'),
  readyToExecuteCount: document.getElementById('readyToExecuteCount'),
  recentActivityList: document.getElementById('recentActivityList'),
  recentActivityMeta: document.getElementById('recentActivityMeta'),
  readyToExecuteList: document.getElementById('readyToExecuteList'),
  refreshButton: document.getElementById('refreshButton'),
  resultCount: document.getElementById('resultCount'),
  primaryJsonTitle: document.getElementById('primaryJsonTitle'),
  projectFilter: document.getElementById('projectFilter'),
  riskFilter: document.getElementById('riskFilter'),
  reviewLedgerList: document.getElementById('reviewLedgerList'),
  reviewLedgerMeta: document.getElementById('reviewLedgerMeta'),
  runHealthMeta: document.getElementById('runHealthMeta'),
  runHealthSummary: document.getElementById('runHealthSummary'),
  searchInput: document.getElementById('searchInput'),
  secondaryJsonTitle: document.getElementById('secondaryJsonTitle'),
  sourceArtifactList: document.getElementById('sourceArtifactList'),
  sourcePreview: document.getElementById('sourcePreview'),
  sourcePreviewPanel: document.getElementById('sourcePreviewPanel'),
  statusBanner: document.getElementById('statusBanner'),
  statusFilter: document.getElementById('statusFilter'),
  summaryCards: document.getElementById('summaryCards'),
  threadInboxFilter: document.getElementById('threadInboxFilter'),
  platformFilter: document.getElementById('platformFilter'),
  workspaceHighlights: document.getElementById('workspaceHighlights')
};

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(UI_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function translateDisplayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const raw = String(value).trim();
  const normalized = raw.toLowerCase();
  return DISPLAY_VALUE_MAP[normalized] || raw;
}

function translateMissingInfoList(values) {
  return (values || []).map((value) => MISSING_INFO_LABELS[value] || value);
}

function translateValueList(values) {
  return (values || []).map((value) => translateDisplayValue(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cleanClientValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeComparableValue(value) {
  return cleanClientValue(value).toLowerCase();
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(cleanClientValue(value));
}

function toLocalFileHref(filePath) {
  const normalizedPath = cleanClientValue(filePath);

  if (!normalizedPath) {
    return '';
  }

  return `file://${encodeURI(normalizedPath)}`;
}

function renderSourcePreview(sourceDetails) {
  if (!sourceDetails || (!sourceDetails.preview && (!sourceDetails.artifacts || sourceDetails.artifacts.length === 0))) {
    elements.sourcePreviewPanel.hidden = true;
    elements.sourceArtifactList.innerHTML = '';
    elements.sourcePreview.textContent = '';
    return;
  }

  elements.sourcePreviewPanel.hidden = false;
  const artifacts = Array.isArray(sourceDetails.artifacts) ? sourceDetails.artifacts : [];
  elements.sourceArtifactList.innerHTML = artifacts.length === 0
    ? '<div class="empty-state">源文件里还没有识别出明确的图片 / 视频 / 链接资源。</div>'
    : artifacts.map((artifact) => {
      const reference = cleanClientValue(artifact.reference);
      const href = isHttpUrl(reference)
        ? reference
        : cleanClientValue(sourceDetails.absolute_path)
          ? toLocalFileHref(sourceDetails.absolute_path)
          : '';
      const kindLabel = artifact.kind === 'image'
        ? '图片'
        : artifact.kind === 'video'
          ? '视频'
          : '引用';

      return `
        <article class="detail-artifact-item">
          <div class="detail-artifact-meta">
            <strong>${escapeHtml(artifact.label || '未命名资源')}</strong>
            <span class="tag tag-muted">${escapeHtml(kindLabel)}</span>
            ${href ? `<a class="button button-link" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">打开</a>` : ''}
          </div>
          <div class="detail-artifact-ref">${escapeHtml(reference || '—')}</div>
        </article>
      `;
    }).join('');
  elements.sourcePreview.textContent = sourceDetails.preview || '源文件暂时不可读。';
}

function renderRecentActivity() {
  if (!state.data || !state.data.recent_activity) {
    elements.recentActivityMeta.textContent = '';
    elements.recentActivityList.innerHTML = '<div class="empty-state">暂时没有最近动作。</div>';
    return;
  }

  const activity = state.data.recent_activity;
  elements.recentActivityMeta.textContent = `${activity.total_entries || 0} 条`;
  const entries = Array.isArray(activity.entries) ? activity.entries : [];
  elements.recentActivityList.innerHTML = entries.length === 0
    ? '<div class="empty-state">暂时没有最近动作。</div>'
    : entries.map((entry) => {
      const targetLabel = entry.kind === 'thread' ? (entry.target_id || '未知回复') : (entry.target_id || '未知内容');
      const targetButton = entry.kind === 'thread'
        ? `<button class="button button-link" type="button" data-jump-thread-id="${escapeHtml(entry.target_id || '')}">查看回复</button>`
        : `<button class="button button-link" type="button" data-jump-item-id="${escapeHtml(entry.target_id || '')}">查看内容</button>`;
      const noteParts = [entry.note];
      if (entry.kind === 'queue' && entry.reasons && entry.reasons.length > 0) {
        noteParts.push(`原因：${translateMissingInfoList(entry.reasons).join('，')}`);
      }
      if (entry.kind === 'thread' && entry.manual_state) {
        noteParts.push(`状态：${getThreadStateLabel(entry.manual_state)}`);
      }
      return `
        <article class="ops-item">
          <div class="ops-item-top">
            <strong>${escapeHtml(translateDisplayValue(entry.action || 'unknown'))}</strong>
            <div class="tag-group">
              <span class="tag tag-muted">${escapeHtml(entry.kind === 'thread' ? '回复' : '队列')}</span>
              <span class="tag tag-muted">${escapeHtml(entry.actor || '—')}</span>
            </div>
          </div>
          <span class="ops-item-meta">${escapeHtml(formatDate(entry.timestamp_utc))} · ${escapeHtml(targetLabel)}</span>
          <span class="ops-item-note">${escapeHtml(noteParts.filter(Boolean).join(' · ') || '没有备注。')}</span>
          <div class="detail-action-bar">${targetButton}</div>
        </article>
      `;
    }).join('');

  document.querySelectorAll('[data-jump-item-id]').forEach((button) => {
    button.addEventListener('click', () => {
      navigateToQueueItem(button.dataset.jumpItemId, { resetFilters: true });
    });
  });

  document.querySelectorAll('[data-jump-thread-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedThreadId = button.dataset.jumpThreadId;
      state.detailMode = 'thread';
      setActiveSection('pipeline', { syncContext: false });
    });
  });
}

function createOptions(selectElement, values, currentValue) {
  const options = ['all', ...values];
  selectElement.innerHTML = options
    .map((value) => {
      const label = value === 'all' ? '全部' : translateDisplayValue(value);
      const selected = value === currentValue ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function setFilterAvailability(disabled) {
  elements.projectFilter.disabled = disabled;
  elements.statusFilter.disabled = disabled;
  elements.platformFilter.disabled = disabled;
  elements.riskFilter.disabled = disabled;
  elements.searchInput.disabled = disabled;
}

function normalizeLoadError(error, responseStatus) {
  const details = Array.isArray(error && error.details) ? error.details : [];
  const message = error && error.message
    ? error.message
    : `请求失败（HTTP ${responseStatus || 500}）`;

  return {
    message,
    details,
    sourceFiles: error && error.source_files ? error.source_files : null
  };
}

function createLoadErrorMarkup(loadError) {
  const sourceFiles = loadError.sourceFiles
    ? Object.entries(loadError.sourceFiles)
      .map(([source, sourcePath]) => {
        return `
          <article class="load-error-item">
            <strong>${escapeHtml(translateDisplayValue(source))}</strong>
            <code class="load-error-path">${escapeHtml(sourcePath)}</code>
          </article>
        `;
      })
      .join('')
    : '';
  const detailMarkup = loadError.details.length === 0
    ? '<div class="empty-state">没有更多诊断信息。</div>'
    : `
      <div class="load-error-list">
        ${loadError.details
          .map((detail) => {
            return `
              <article class="load-error-item">
                <strong>${escapeHtml(translateDisplayValue(detail.source || 'unknown_source'))}</strong>
                <span>${escapeHtml(detail.issue || '未知问题')}</span>
                <code class="load-error-path">${escapeHtml(detail.path || '未知路径')}</code>
                <span class="load-error-meta">${escapeHtml(detail.hint || '没有可用提示。')}</span>
              </article>
            `;
          })
          .join('')}
      </div>
    `;

  return `
    <section class="load-error-panel">
      <h3>看板数据暂时不可用</h3>
      <p>${escapeHtml(loadError.message)}</p>
      ${sourceFiles ? `<div class="load-error-list">${sourceFiles}</div>` : ''}
      ${detailMarkup}
    </section>
  `;
}

function createOpsIssueMarkup(issues, emptyText) {
  if (!issues || issues.length === 0) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }

  return `
    <div class="load-error-list">
      ${issues
        .map((issue) => {
          return `
            <article class="load-error-item">
              <strong>${escapeHtml(translateDisplayValue(issue.source || 'unknown source'))}</strong>
              <span>${escapeHtml(issue.message || issue.issue || '未知问题')}</span>
              ${issue.path ? `<code class="load-error-path">${escapeHtml(issue.path)}</code>` : ''}
              ${issue.hint ? `<span class="load-error-meta">${escapeHtml(issue.hint)}</span>` : ''}
            </article>
          `;
        })
        .join('')}
    </div>
  `;
}

function formatOpsValue(value, fallback = '—') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return translateDisplayValue(value);
}

function formatOpsPairs(pairs, fallback = '暂无更多信息。') {
  const parts = pairs
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => `${label} ${value}`);

  return parts.length > 0 ? parts.join(' · ') : fallback;
}

function formatOpsCurrency(value, currency) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '暂无营收汇总';
  }

  return new Intl.NumberFormat(UI_LOCALE, {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

function getStatusTagClass(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (['ok', 'ready', 'active', 'started'].includes(normalized)) {
    return 'tag-project';
  }

  if (['warning', 'blocked', 'needs_target_url', 'pending', 'degraded'].includes(normalized)) {
    return 'tag-risk';
  }

  if (['error', 'failed', 'unavailable'].includes(normalized)) {
    return 'tag-status';
  }

  return 'tag-muted';
}

function createOpsMetricsMarkup(entries) {
  return `
    <div class="ops-metrics">
      ${entries
        .map((entry) => {
          return `
            <article class="ops-metric">
              <span>${escapeHtml(entry.label)}</span>
              <strong>${escapeHtml(formatOpsValue(entry.value))}</strong>
            </article>
          `;
        })
        .join('')}
    </div>
  `;
}

function getThreadRecords() {
  return state.data && state.data.ops_snapshot && state.data.ops_snapshot.modules && state.data.ops_snapshot.modules.threads
    ? state.data.ops_snapshot.modules.threads.records || []
    : [];
}

function getSelectedThread() {
  return getThreadRecords().find((record) => record.reply_id === state.selectedThreadId) || null;
}

function getSelectedQueueItem() {
  return state.data && Array.isArray(state.data.items)
    ? state.data.items.find((item) => item.id === state.selectedId) || null
    : null;
}

function getQueueItemById(itemId) {
  if (!state.data || !Array.isArray(state.data.items)) {
    return null;
  }

  return state.data.items.find((item) => item.id === itemId) || null;
}

function findQueueItemByReference(reference = {}) {
  const normalizedId = cleanClientValue(reference.itemId);
  const normalizedSource = normalizeComparableValue(reference.source);
  const normalizedApprovalTicket = cleanClientValue(reference.approvalTicket);

  if (!state.data || !Array.isArray(state.data.items)) {
    return null;
  }

  if (normalizedId) {
    const byId = state.data.items.find((item) => cleanClientValue(item.id) === normalizedId);
    if (byId) {
      return byId;
    }
  }

  if (normalizedSource) {
    const bySource = state.data.items.find((item) => normalizeComparableValue(item.source) === normalizedSource);
    if (bySource) {
      return bySource;
    }
  }

  if (normalizedApprovalTicket) {
    return state.data.items.find((item) => cleanClientValue(item.approval_ticket) === normalizedApprovalTicket) || null;
  }

  return null;
}

function createOperationsRecord(config) {
  return {
    id: config.id,
    kind: config.kind,
    title: config.title,
    subtitle: config.subtitle,
    rows: config.rows || [],
    primaryTitle: config.primaryTitle || '原始问题数据',
    secondaryTitle: config.secondaryTitle || '来源信息',
    primaryPayload: config.primaryPayload || null,
    secondaryPayload: config.secondaryPayload || null
  };
}

function getOperationsRecords() {
  if (!state.data || !state.data.operations_review || state.data.operations_review.available === false) {
    return [];
  }

  const operationsReview = state.data.operations_review;
  const records = [];

  (operationsReview.reviews.entries || []).forEach((entry, index) => {
    records.push(createOperationsRecord({
      id: `review:${index}`,
      kind: 'review',
      title: translateDisplayValue(entry.job || 'Unnamed review'),
      subtitle: [entry.date_yyyy_mm_dd_ || entry.date_yyyy_mm_dd || entry.date || '暂无日期', entry.focus || '暂无重点'].join(' · '),
      rows: [
        ['类别', '审核记录'],
        ['状态', translateDisplayValue(entry.status || 'unknown')],
        ['日期', entry.date_yyyy_mm_dd_ || entry.date_yyyy_mm_dd || entry.date || '—'],
        ['焦点', entry.focus || '—'],
        ['负责人', translateDisplayValue(entry.follow_up_owner || 'unassigned')],
        ['阻塞备注', entry.blocker_notes || '—'],
        ['来源文件', operationsReview.reviews.path || '—']
      ],
      primaryPayload: entry,
      secondaryPayload: {
        source: 'review_index',
        path: operationsReview.reviews.path || '',
        updated_at: operationsReview.reviews.updated_at || '',
        issues: operationsReview.reviews.issues || []
      }
    }));
  });

  (operationsReview.experiments.entries || []).forEach((entry, index) => {
    records.push(createOperationsRecord({
      id: `experiment:${index}`,
      kind: 'experiment',
      title: translateDisplayValue(entry.experiment || 'Unnamed experiment'),
      subtitle: [entry.started || '暂无开始日期', translateDisplayValue(entry.job || 'unknown job')].join(' · '),
      rows: [
        ['类别', '试验记录'],
        ['状态', translateDisplayValue(entry.status || 'unknown')],
        ['开始时间', entry.started || '—'],
        ['关联任务', translateDisplayValue(entry.job || 'unknown job')],
        ['假设', entry.hypothesis || '—'],
        ['下一步', entry.next_step || '—'],
        ['来源文件', operationsReview.experiments.path || '—']
      ],
      primaryPayload: entry,
      secondaryPayload: {
        source: 'experiment_log',
        path: operationsReview.experiments.path || '',
        updated_at: operationsReview.experiments.updated_at || '',
        issues: operationsReview.experiments.issues || []
      }
    }));
  });

  if (operationsReview.feedback.path || (operationsReview.feedback.issues || []).length > 0) {
    records.push(createOperationsRecord({
      id: 'feedback:summary',
      kind: 'feedback',
      title: `反馈报告 ${operationsReview.feedback.run_date || '最新一期'}`,
      subtitle: `${operationsReview.feedback.summary.total_incidents} 起事件 · ${operationsReview.feedback.summary.user_feedback_signals} 个用户信号`,
      rows: [
        ['类别', '问题反馈'],
        ['运行日期', operationsReview.feedback.run_date || '—'],
        ['生成时间', formatDate(operationsReview.feedback.generated_at)],
        ['事件数', String(operationsReview.feedback.summary.total_incidents || 0)],
        ['会话错误', String(operationsReview.feedback.summary.session_errors || 0)],
        ['网关错误', String(operationsReview.feedback.summary.gateway_errors || 0)],
        ['用户信号', String(operationsReview.feedback.summary.user_feedback_signals || 0)],
        ['来源文件', operationsReview.feedback.path || '—']
      ],
      primaryPayload: operationsReview.feedback,
      secondaryPayload: {
        source: 'feedback_report',
        path: operationsReview.feedback.path || '',
        issues: operationsReview.feedback.issues || []
      }
    }));
  }

  (operationsReview.feedback.root_causes || []).forEach((cause, index) => {
    records.push(createOperationsRecord({
      id: `feedback-cause:${index}`,
      kind: 'feedback_cause',
      title: cause.label || `根因 ${index + 1}`,
      subtitle: `${cause.incidents} 起事件 · ${cause.share}`,
      rows: [
        ['类别', '反馈根因'],
        ['根因', cause.label || '—'],
        ['事件数', String(cause.incidents || 0)],
        ['占比', cause.share || '—'],
        ['示例', cause.example || '—'],
        ['来源文件', operationsReview.feedback.path || '—']
      ],
      primaryPayload: cause,
      secondaryPayload: {
        report_run_date: operationsReview.feedback.run_date || '',
        path: operationsReview.feedback.path || '',
        issues: operationsReview.feedback.issues || []
      }
    }));
  });

  (operationsReview.post_handoffs.records || []).forEach((record, index) => {
    records.push(createOperationsRecord({
      id: `handoff:${index}`,
      kind: 'handoff',
      title: record.item_id || `交接记录 ${index + 1}`,
      subtitle: [record.platform || '未知平台', translateDisplayValue(record.status || record.queue_status || 'unknown')].join(' · '),
      rows: [
        ['类别', '待自动发布'],
        ['平台', record.platform || '—'],
        ['队列状态', translateDisplayValue(record.queue_status || 'unknown')],
        ['交接状态', translateDisplayValue(record.status || 'unknown')],
        ['目标 URL', record.target_url || '—'],
        ['阻塞原因', record.blocked_reasons && record.blocked_reasons.length > 0 ? translateValueList(record.blocked_reasons).join('，') : '—'],
        ['来源', record.source || '—'],
        ['来源文件', operationsReview.post_handoffs.path || '—']
      ],
      primaryPayload: record,
      secondaryPayload: {
        source: 'browser_post_queue_summary',
        path: operationsReview.post_handoffs.path || '',
        run_date: operationsReview.post_handoffs.run_date || '',
        issues: operationsReview.post_handoffs.issues || []
      }
    }));
  });

  return records;
}

function getSelectedOperationsRecord() {
  return getOperationsRecords().find((record) => record.id === state.selectedOpsRecordId) || null;
}

function getLinkedHandoffRecordForQueueItem(item) {
  const itemId = cleanClientValue(item && item.id);
  const source = normalizeComparableValue(item && item.source);

  return getOperationsRecords().find((record) => {
    if (record.kind !== 'handoff' || !record.primaryPayload) {
      return false;
    }

    return cleanClientValue(record.primaryPayload.item_id) === itemId
      || normalizeComparableValue(record.primaryPayload.source) === source;
  }) || null;
}

function getLinkedQueueItemForOpsRecord(record) {
  if (!record || record.kind !== 'handoff') {
    return null;
  }

  return findQueueItemByReference({
    itemId: record.primaryPayload && record.primaryPayload.item_id,
    source: record.primaryPayload && record.primaryPayload.source
  });
}

function getLinkedQueueItemForThread(thread) {
  if (!thread) {
    return null;
  }

  return findQueueItemByReference({
    approvalTicket: thread.approval_ticket
  });
}

function getThreadStateLabel(stateKey) {
  const labels = {
    ready: '可直接回复',
    needs_reply: '待人工判断',
    follow_up: '待跟进',
    blocked: '已阻塞',
    done: '已处理'
  };

  return labels[stateKey] || translateDisplayValue(stateKey);
}

function getThreadActionLabel(action) {
  const labels = {
    mark_ready: '标记可直接回复',
    mark_follow_up: '标记待跟进',
    mark_blocked: '标记阻塞',
    mark_done: '标记已处理',
    restore_auto: '恢复系统判断'
  };

  return labels[action] || translateDisplayValue(action);
}

function getThreadStateTagClass(stateKey) {
  if (stateKey === 'ready' || stateKey === 'done') {
    return 'tag-project';
  }

  if (stateKey === 'blocked') {
    return 'tag-status';
  }

  return 'tag-risk';
}

function getFilteredThreadRecords() {
  const records = getThreadRecords();

  if (state.threadInboxFilter === 'all') {
    return records;
  }

  return records.filter((record) => record.review_state === state.threadInboxFilter);
}

function getNextThreadSelection(processedReplyIds, currentReplyId = state.selectedThreadId) {
  const filteredRecords = getFilteredThreadRecords();
  const excluded = new Set((processedReplyIds || []).map((replyId) => cleanClientValue(replyId)));

  if (filteredRecords.length === 0) {
    return null;
  }

  const currentIndex = filteredRecords.findIndex((record) => record.reply_id === currentReplyId);
  const startIndex = currentIndex >= 0 ? currentIndex : -1;

  for (let index = startIndex + 1; index < filteredRecords.length; index += 1) {
    if (!excluded.has(filteredRecords[index].reply_id)) {
      return filteredRecords[index].reply_id;
    }
  }

  for (let index = 0; index <= startIndex; index += 1) {
    if (filteredRecords[index] && !excluded.has(filteredRecords[index].reply_id)) {
      return filteredRecords[index].reply_id;
    }
  }

  return null;
}

function clearActionFeedback() {
  state.actionFeedback = null;
  state.threadActionFeedback = null;
  state.batchActionFeedback = null;
}

function persistActor() {
  try {
    window.localStorage.setItem(ACTOR_STORAGE_KEY, state.actor);
  } catch (_error) {
    // Best effort only.
  }
}

function syncActorInputs() {
  elements.detailActionActor.value = state.actor;
  elements.batchActionActor.value = state.actor;
}

function setActorValue(value) {
  state.actor = value;
  syncActorInputs();
  persistActor();
}

function formatBoolean(value) {
  return value ? '是' : '否';
}

function renderWorkspaceSections() {
  document.querySelectorAll('[data-section-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.sectionPanel !== state.activeSection;
  });

  document.querySelectorAll('[data-section-tab]').forEach((button) => {
    const isActive = button.dataset.sectionTab === state.activeSection;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
}

function syncSectionContext(section) {
  if (!state.data) {
    return;
  }

  if (section === 'operations') {
    const selectedRecord = getSelectedOperationsRecord();
    const firstRecord = getOperationsRecords()[0] || null;
    state.detailMode = 'ops';
    state.selectedOpsRecordId = selectedRecord ? selectedRecord.id : firstRecord ? firstRecord.id : null;
    state.selectedThreadId = null;
    clearActionFeedback();
    return;
  }

  if (section === 'pipeline') {
    const filteredThreads = getFilteredThreadRecords();
    const selectedThread = filteredThreads.find((record) => record.reply_id === state.selectedThreadId) || null;
    const firstThread = filteredThreads[0] || null;
    state.detailMode = 'thread';
    state.selectedThreadId = selectedThread ? selectedThread.reply_id : firstThread ? firstThread.reply_id : null;
    state.selectedOpsRecordId = null;
    clearActionFeedback();
    return;
  }

  state.detailMode = 'queue';
  state.selectedOpsRecordId = null;
  state.selectedThreadId = null;
}

function setActiveSection(section, options = {}) {
  state.activeSection = section;
  if (options.syncContext !== false) {
    syncSectionContext(section);
  }
  renderWorkspaceSections();

  if (!state.data) {
    return;
  }

  renderWorkspaceHighlights();
  renderOperationsReview();
  renderList();
}

function renderWorkspaceHighlights() {
  if (!state.data) {
    elements.workspaceHighlights.innerHTML = '';
    return;
  }

  const summary = state.data.summary || {};
  const operationsReview = state.data.operations_review || {};
  const opsSnapshot = state.data.ops_snapshot || {};
  const threads = opsSnapshot.modules && opsSnapshot.modules.threads ? opsSnapshot.modules.threads : null;

  const cards = [
    {
      section: 'overview',
      title: '今日概况',
      value: `${summary.pending_approvals || 0} 等待审核 / ${summary.queued_items || 0} 已准备好`,
      note: '先看今天有多少内容待处理，再决定先处理哪一类。'
    },
    {
      section: 'queue',
      title: '待处理内容',
      value: `${summary.total_items || 0} 个项目`,
      note: '在这里逐条查看内容并直接做处理决定。'
    },
    {
      section: 'operations',
      title: '问题记录',
      value: operationsReview.available === false
        ? '数据不可用'
        : `${operationsReview.summary ? operationsReview.summary.attention_count : 0} 个待关注`,
      note: '这里看最近的审核记录、试验、反馈和待自动发布内容。'
    },
    {
      section: 'pipeline',
      title: '自动执行',
      value: `${threads ? threads.needs_reply_count : 0} 条待人工判断`,
      note: '这里查看自动流程状态，以及哪些回复需要人工接手。'
    }
  ];

  elements.workspaceHighlights.innerHTML = cards
    .map((card) => {
      return `
        <button class="workspace-highlight" data-section-jump="${escapeHtml(card.section)}" type="button">
          <p>${escapeHtml(card.title)}</p>
          <strong>${escapeHtml(card.value)}</strong>
          <span>${escapeHtml(card.note)}</span>
        </button>
      `;
    })
    .join('');

  document.querySelectorAll('[data-section-jump]').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveSection(button.dataset.sectionJump);
    });
  });
}

function attachWorkspaceNavigation() {
  document.querySelectorAll('[data-section-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveSection(button.dataset.sectionTab);
    });
  });
}

function renderOperationsReview() {
  const operationsReview = state.data.operations_review;
  const selectedOpsRecord = getSelectedOperationsRecord();
  const reviews = operationsReview.reviews.entries || [];
  const experiments = operationsReview.experiments.entries || [];
  const feedback = operationsReview.feedback;
  const postHandoffs = operationsReview.post_handoffs;

  if (operationsReview.available === false) {
    const unavailableMarkup = createOpsIssueMarkup(
      operationsReview.issues,
      '问题记录数据暂时不可用。'
    );

    elements.reviewLedgerMeta.textContent = '不可用';
    elements.experimentMeta.textContent = '不可用';
    elements.feedbackMeta.textContent = '不可用';
    elements.handoffMeta.textContent = '不可用';
    elements.reviewLedgerList.innerHTML = unavailableMarkup;
    elements.experimentList.innerHTML = unavailableMarkup;
    elements.feedbackSummary.innerHTML = unavailableMarkup;
    elements.handoffList.innerHTML = unavailableMarkup;
    return;
  }

  const createOpsButton = (recordId, title, tagValue, tagClass, meta, note) => {
    const selectedClass = selectedOpsRecord && selectedOpsRecord.id === recordId
      ? ' ops-item-selected'
      : '';

    return `
      <button class="ops-item ops-item-button${selectedClass}" data-ops-record-id="${escapeHtml(recordId)}" type="button">
        <div class="ops-item-top">
          <strong>${escapeHtml(title)}</strong>
          <span class="tag ${tagClass}">${escapeHtml(tagValue)}</span>
        </div>
        <span class="ops-item-meta">${escapeHtml(meta)}</span>
        <span class="ops-item-note">${escapeHtml(note)}</span>
      </button>
    `;
  };

  elements.reviewLedgerMeta.textContent = `${operationsReview.summary.attention_count} 个待关注`;
  elements.experimentMeta.textContent = `${operationsReview.summary.active_experiment_count} 个进行中`;
  elements.feedbackMeta.textContent = feedback.run_date || '暂无报告';
  elements.handoffMeta.textContent = `${operationsReview.summary.browser_ready_count} 个就绪`;

  elements.reviewLedgerList.innerHTML = reviews.length === 0
    ? createOpsIssueMarkup(operationsReview.reviews.issues, '暂时没有审核记录。')
    : reviews
      .map((entry, index) => {
        return createOpsButton(
          `review:${index}`,
          translateDisplayValue(entry.job || 'Unnamed review'),
          translateDisplayValue(entry.status || 'unknown'),
          'tag-status',
          `${entry.date_yyyy_mm_dd_ || entry.date_yyyy_mm_dd || entry.date || '暂无日期'} · ${entry.focus || '暂无重点'} · 负责人 ${translateDisplayValue(entry.follow_up_owner || 'unassigned')}`,
          entry.blocker_notes || '点击查看详细信息。'
        );
      })
      .join('');

  elements.experimentList.innerHTML = experiments.length === 0
    ? createOpsIssueMarkup(operationsReview.experiments.issues, '暂时没有试验记录。')
    : experiments
      .map((entry, index) => {
        return createOpsButton(
          `experiment:${index}`,
          translateDisplayValue(entry.experiment || 'Unnamed experiment'),
          translateDisplayValue(entry.status || 'unknown'),
          'tag-project',
          `${entry.started || '暂无开始日期'} · ${translateDisplayValue(entry.job || 'unknown job')}`,
          entry.next_step || entry.hypothesis || '点击查看实验详情。'
        );
      })
      .join('');

  elements.feedbackSummary.innerHTML = feedback.path
    ? `
      <div class="ops-metrics">
        <article class="ops-metric">
          <span>事件数</span>
          <strong>${escapeHtml(feedback.summary.total_incidents)}</strong>
        </article>
        <article class="ops-metric">
          <span>会话错误</span>
          <strong>${escapeHtml(feedback.summary.session_errors)}</strong>
        </article>
        <article class="ops-metric">
          <span>网关错误</span>
          <strong>${escapeHtml(feedback.summary.gateway_errors)}</strong>
        </article>
        <article class="ops-metric">
          <span>用户信号</span>
          <strong>${escapeHtml(feedback.summary.user_feedback_signals)}</strong>
        </article>
      </div>
      <div class="ops-list">
        ${createOpsButton(
          'feedback:summary',
          `反馈报告 ${feedback.run_date || '最新一期'}`,
          `${feedback.summary.total_incidents} 起事件`,
          'tag-status',
          `${feedback.summary.session_errors} 会话错误 · ${feedback.summary.gateway_errors} 网关错误 · ${feedback.summary.user_feedback_signals} 用户信号`,
          '点击查看完整反馈摘要与来源路径。'
        )}
        ${(feedback.root_causes || [])
          .map((cause, index) => {
            return createOpsButton(
              `feedback-cause:${index}`,
              cause.label,
              cause.share,
              'tag-risk',
              `${cause.incidents} 起事件`,
              cause.example || '点击查看详细信息。'
            );
          })
          .join('')}
      </div>
    `
    : createOpsIssueMarkup(feedback.issues, '暂未发现问题反馈。');

  elements.handoffList.innerHTML = postHandoffs.records && postHandoffs.records.length > 0
    ? `
      <div class="ops-metrics">
        <article class="ops-metric">
          <span>总数</span>
          <strong>${escapeHtml(postHandoffs.total_items)}</strong>
        </article>
        <article class="ops-metric">
          <span>就绪</span>
          <strong>${escapeHtml(postHandoffs.ready_count)}</strong>
        </article>
        <article class="ops-metric">
          <span>阻塞</span>
          <strong>${escapeHtml(postHandoffs.blocked_count)}</strong>
        </article>
      </div>
      <div class="ops-list">
        ${postHandoffs.records
          .map((record, index) => {
            const blockedReasons = record.blocked_reasons && record.blocked_reasons.length > 0
              ? translateValueList(record.blocked_reasons).join('，')
              : '点击查看详细信息。';

            return createOpsButton(
              `handoff:${index}`,
              record.item_id || translateDisplayValue('unknown item'),
              translateDisplayValue(record.status || record.queue_status || 'unknown'),
              'tag-status',
              `${record.platform || '未知平台'} · ${record.target_url || '无目标 URL'}`,
              blockedReasons
            );
          })
          .join('')}
      </div>
    `
    : createOpsIssueMarkup(postHandoffs.issues, '暂未发现待自动发布记录。');

  attachOpsRecordSelection();
}

function renderOpsSnapshot() {
  const opsSnapshot = state.data.ops_snapshot || {};
  const modules = opsSnapshot.modules || {};
  const supervisor = modules.supervisor || null;
  const metrics = modules.metrics || null;
  const feedback = modules.feedback || null;
  const posts = modules.posts || null;
  const replies = modules.replies || null;
  const fill = modules.fill || null;
  const threads = modules.threads || null;
  const warnings = Array.isArray(opsSnapshot.warnings) ? opsSnapshot.warnings : [];
  const postBlockers = posts && Array.isArray(posts.blockers) ? posts.blockers.slice(0, 3) : [];
  const threadRecords = threads && Array.isArray(threads.records) ? threads.records : [];
  const filteredThreadRecords = threads ? getFilteredThreadRecords() : [];

  elements.runHealthMeta.textContent = opsSnapshot.latest_run_date
    ? `最近运行 ${opsSnapshot.latest_run_date}`
    : '暂无运行记录';

  elements.executionSnapshotMeta.textContent = [
    posts && posts.run_date ? `发帖 ${posts.run_date}` : '',
    fill && fill.run_date ? `填充 ${fill.run_date}` : '',
    replies && replies.run_date ? `回复 ${replies.run_date}` : ''
  ]
    .filter(Boolean)
    .join(' · ') || opsSnapshot.latest_run_date || '暂无运行记录';
  elements.threadInboxFilter.disabled = !threads || threadRecords.length === 0;
  elements.threadInboxFilter.value = state.threadInboxFilter;
  elements.bossThreadsMeta.textContent = threads && threads.run_date
    ? `回复 ${threads.run_date} · ${filteredThreadRecords.length} / ${threadRecords.length}`
    : '暂无回复包';

  if (!opsSnapshot.available) {
    const fallbackMarkup = warnings.length > 0
      ? createOpsIssueMarkup(warnings, '暂未找到可用的自动执行记录。')
      : '<div class="empty-state">暂未找到可用的自动执行记录。</div>';

    elements.runHealthSummary.innerHTML = fallbackMarkup;
    elements.executionSnapshotSummary.innerHTML = fallbackMarkup;
    elements.bossThreadsSummary.innerHTML = fallbackMarkup;
    return;
  }

  const runHealthItems = [];

  if (supervisor) {
    const failingSteps = supervisor.failing_steps && supervisor.failing_steps.length > 0
      ? supervisor.failing_steps.map((step) => `${step.name}（${translateDisplayValue(step.status)}）`).join('，')
      : '最近一次摘要中没有失败步骤。';

    runHealthItems.push(`
      <article class="ops-item">
        <div class="ops-item-top">
          <strong>自动流程运行</strong>
          <span class="tag ${getStatusTagClass(supervisor.run_status)}">${escapeHtml(formatOpsValue(supervisor.run_status))}</span>
        </div>
        <span class="ops-item-meta">${escapeHtml(formatOpsPairs([
          ['日期', supervisor.run_date],
          ['演练模式', supervisor.dry_run ? 'yes' : 'no']
        ]))}</span>
        <span class="ops-item-note">${escapeHtml(formatOpsPairs(Object.entries(supervisor.step_status_counts || {}).map(([status, count]) => [translateDisplayValue(status), count]), '没有记录步骤统计。'))}</span>
        <span class="ops-item-note">${escapeHtml(failingSteps)}</span>
      </article>
    `);
  }

  if (metrics) {
    runHealthItems.push(`
      <article class="ops-item">
        <div class="ops-item-top">
          <strong>运行指标</strong>
          <span class="tag ${getStatusTagClass(metrics.overall_status)}">${escapeHtml(formatOpsValue(metrics.overall_status))}</span>
        </div>
        <span class="ops-item-meta">${escapeHtml(formatOpsPairs([
          ['日期', metrics.run_date],
          ['KV', metrics.kv_status],
          ['Paddle', metrics.paddle_status],
          ['分析', metrics.analytics_status]
        ]))}</span>
        <span class="ops-item-note">${escapeHtml(formatOpsPairs([
          ['KV 条目', metrics.kv_entries],
          ['用户数', metrics.analytics_users],
          ['页面浏览', metrics.analytics_pageviews]
        ]))}</span>
        <span class="ops-item-note">${escapeHtml(formatOpsCurrency(metrics.paddle_gross_total, metrics.paddle_currency))}</span>
      </article>
    `);
  }

  for (const action of (feedback && feedback.suggested_actions ? feedback.suggested_actions : []).slice(0, 3)) {
    runHealthItems.push(`
      <article class="ops-item">
        <div class="ops-item-top">
          <strong>建议处理</strong>
          <span class="tag tag-muted">反馈</span>
        </div>
        <span class="ops-item-note">${escapeHtml(action)}</span>
      </article>
    `);
  }

  elements.runHealthSummary.innerHTML = [
    createOpsMetricsMarkup([
      { label: '监督器', value: supervisor ? supervisor.run_status : 'n/a' },
      { label: '指标', value: metrics ? metrics.overall_status : 'n/a' },
      { label: '事件数', value: feedback ? feedback.total_incidents : 'n/a' },
      { label: '告警', value: warnings.length }
    ]),
    runHealthItems.length > 0
      ? `<div class="ops-list">${runHealthItems.join('')}</div>`
      : '<div class="empty-state">暂未发现自动化状态详情。</div>',
    warnings.length > 0 ? createOpsIssueMarkup(warnings, '') : ''
  ].join('');

  const executionItems = [];

  if (posts) {
    executionItems.push(`
      <article class="ops-item">
        <div class="ops-item-top">
          <strong>发帖准备情况</strong>
          <span class="tag ${getStatusTagClass(posts.ready_for_browser_review_count > 0 ? 'ready' : 'warning')}">${escapeHtml(formatOpsValue(posts.mode))}</span>
        </div>
        <span class="ops-item-meta">${escapeHtml(formatOpsPairs([
          ['日期', posts.run_date],
          ['浏览器就绪', posts.ready_for_browser_review_count],
          ['缺少目标 URL', posts.missing_target_url_count]
        ]))}</span>
        <span class="ops-item-note">${escapeHtml(formatOpsPairs([
          ['新生成', posts.generated_count],
          ['已存在', posts.existing_count],
          ['错误', posts.error_count]
        ]))}</span>
      </article>
    `);
  }

  if (fill) {
    executionItems.push(`
      <article class="ops-item">
        <div class="ops-item-top">
          <strong>自动填写</strong>
          <span class="tag ${getStatusTagClass(fill.cdp_status)}">${escapeHtml(formatOpsValue(fill.cdp_status))}</span>
        </div>
        <span class="ops-item-meta">${escapeHtml(formatOpsPairs([
          ['日期', fill.run_date],
          ['发帖就绪', fill.posts.ready],
          ['发帖待审核', fill.posts.approval_pending],
          ['发帖阻塞', fill.posts.blocked]
        ]))}</span>
        <span class="ops-item-note">${escapeHtml(formatOpsPairs([
          ['回复就绪', fill.replies.ready],
          ['回复待审核', fill.replies.approval_pending],
          ['回复阻塞', fill.replies.blocked]
        ]))}</span>
      </article>
    `);
  }

  if (replies) {
    executionItems.push(`
      <article class="ops-item">
        <div class="ops-item-top">
          <strong>自动回复</strong>
          <span class="tag ${getStatusTagClass(replies.ready_count > 0 ? 'ready' : 'pending')}">${escapeHtml(formatOpsValue(replies.mode))}</span>
        </div>
        <span class="ops-item-meta">${escapeHtml(formatOpsPairs([
          ['日期', replies.run_date],
          ['回复任务数', replies.total_packets],
          ['就绪', replies.ready_count],
          ['阻塞', replies.blocked_count]
        ]))}</span>
        <span class="ops-item-note">${escapeHtml(formatOpsPairs([
          ['新生成任务', replies.generated_job_count],
          ['新生成结果', replies.generated_result_count],
          ['错误', replies.error_count]
        ]))}</span>
      </article>
    `);
  }

  elements.executionSnapshotSummary.innerHTML = [
    createOpsMetricsMarkup([
      { label: '填写待审核', value: fill ? fill.approval_pending_total : 'n/a' },
      { label: '填充记录', value: fill ? fill.total_records : 'n/a' },
      { label: '回复任务数', value: replies ? replies.total_packets : 'n/a' },
      { label: '回复就绪', value: replies ? replies.ready_count : 'n/a' }
    ]),
    executionItems.length > 0
      ? `<div class="ops-list">${executionItems.join('')}</div>`
      : '<div class="empty-state">暂未发现执行进度记录。</div>',
    postBlockers.length > 0
      ? `
        <div class="ops-list">
          ${postBlockers
            .map((record) => {
              return `
                <article class="ops-item">
                  <div class="ops-item-top">
                    <strong>${escapeHtml(record.title || record.item_id || '未知项目')}</strong>
                    <span class="tag ${getStatusTagClass(record.status || 'warning')}">${escapeHtml(formatOpsValue(record.status || 'blocked'))}</span>
                  </div>
                  <span class="ops-item-meta">${escapeHtml(formatOpsPairs([
                    ['平台', record.platform],
                    ['队列', record.queue_status]
                  ]))}</span>
                  <span class="ops-item-note">${escapeHtml(record.reason ? translateDisplayValue(record.reason) : '暂无阻塞原因记录。')}</span>
                </article>
              `;
            })
            .join('')}
        </div>
      `
      : ''
  ].join('');

  if (threads && !filteredThreadRecords.some((record) => record.reply_id === state.selectedThreadId)) {
    state.selectedThreadId = filteredThreadRecords[0] ? filteredThreadRecords[0].reply_id : null;
  }

  elements.bossThreadsSummary.innerHTML = threads
    ? [
      createOpsMetricsMarkup([
        { label: '待人工判断', value: threads.needs_reply_count },
        { label: '可直接回复', value: threads.ready_count },
        { label: '待跟进', value: threads.follow_up_count },
        { label: '已处理', value: threads.done_count }
      ]),
      filteredThreadRecords.length > 0
        ? `
          <div class="ops-list">
            ${filteredThreadRecords
              .map((record) => {
                const flags = [
                  record.manual_required ? 'manual review' : '',
                  record.has_sensitive_content ? 'sensitive' : '',
                  record.handoff_ready ? 'handoff ready' : '',
                  record.blocked_reasons && record.blocked_reasons.length > 0 ? 'blocked' : ''
                ].filter(Boolean).join(' · ');
                const selectedClass = state.detailMode === 'thread' && state.selectedThreadId === record.reply_id
                  ? ' ops-item-selected'
                  : '';

                return `
                  <button class="ops-item ops-item-button${selectedClass}" data-thread-id="${escapeHtml(record.reply_id || '')}" type="button">
                    <div class="ops-item-top">
                      <strong>${escapeHtml(record.reply_id || '未知回复')}</strong>
                      <span class="tag ${getThreadStateTagClass(record.review_state)}">${escapeHtml(getThreadStateLabel(record.review_state))}</span>
                    </div>
                    <span class="ops-item-meta">${escapeHtml(formatOpsPairs([
                      ['平台', record.platform],
                      ['时间', formatDate(record.created_at)],
                      ['评分', record.classification_score],
                      ['来源', record.source_kind]
                    ]))}</span>
                    <span class="ops-item-note">${escapeHtml(translateValueList(flags ? flags.split(' · ') : []).join(' · ') || '暂无门禁标记。')}</span>
                    <span class="ops-item-note">${escapeHtml(record.blocked_reasons && record.blocked_reasons.length > 0 ? translateValueList(record.blocked_reasons).join('，') : record.review_note || record.draft_preview || '暂无草稿预览。')}</span>
                  </button>
                `;
              })
              .join('')}
          </div>
        `
        : '<div class="empty-state">当前筛选下没有匹配的回复任务。</div>'
    ].join('')
    : '<div class="empty-state">当前还没有需要人工接手的回复任务。</div>';

  attachThreadSelection();
}

function renderSummary() {
  const summary = state.data.summary;
  const cards = [
    { label: '等待审核', value: summary.pending_approvals },
    { label: '已准备好', value: summary.queued_items },
    { label: '平台数', value: summary.platform_count },
    { label: '状态数', value: summary.status_count }
  ];

  elements.summaryCards.innerHTML = cards
    .map((card) => {
      return `
        <article class="summary-card">
          <p>${escapeHtml(card.label)}</p>
          <strong>${escapeHtml(card.value)}</strong>
        </article>
      `;
    })
    .join('');
}

function renderFilters() {
  const { statuses, platforms, projects, risks } = state.data.filters;
  createOptions(elements.projectFilter, projects, state.filters.project);
  createOptions(elements.statusFilter, statuses, state.filters.status);
  createOptions(elements.platformFilter, platforms, state.filters.platform);
  createOptions(elements.riskFilter, risks, state.filters.risk);
}

function createBucketMarkup(items, emptyText) {
  if (items.length === 0) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }

  return items
    .map((item) => {
      const missingInfo = item.missing_info && item.missing_info.length > 0
        ? `<span class="bucket-subline">缺失：${escapeHtml(translateMissingInfoList(item.missing_info).join('，'))}</span>`
        : '';

      return `
        <button class="bucket-item" data-item-id="${escapeHtml(item.id)}" data-item-source="bucket" type="button">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.platform)} · ${escapeHtml(translateDisplayValue(item.action_label || item.action_state))}</span>
          ${missingInfo}
        </button>
      `;
    })
    .join('');
}

function attachBucketSelection() {
  document.querySelectorAll('[data-item-id]').forEach((button) => {
    if (button.dataset.selectionBound === 'true') {
      return;
    }

    button.dataset.selectionBound = 'true';
    button.addEventListener('click', () => {
      clearActionFeedback();
      if (button.dataset.itemSource === 'bucket') {
        resetQueueFilters();
      }

      state.detailMode = 'queue';
      state.selectedId = button.dataset.itemId;
      state.selectedThreadId = null;
      state.selectedOpsRecordId = null;
      setActiveSection('queue', { syncContext: false });
    });
  });
}

function attachThreadSelection() {
  document.querySelectorAll('[data-thread-id]').forEach((button) => {
    if (button.dataset.selectionBound === 'true') {
      return;
    }

    button.dataset.selectionBound = 'true';
    button.addEventListener('click', () => {
      clearActionFeedback();
      state.detailMode = 'thread';
      state.selectedThreadId = button.dataset.threadId;
      state.selectedOpsRecordId = null;
      setActiveSection('pipeline', { syncContext: false });
    });
  });
}

function attachOpsRecordSelection() {
  document.querySelectorAll('[data-ops-record-id]').forEach((button) => {
    if (button.dataset.selectionBound === 'true') {
      return;
    }

    button.dataset.selectionBound = 'true';
    button.addEventListener('click', () => {
      clearActionFeedback();
      state.detailMode = 'ops';
      state.selectedOpsRecordId = button.dataset.opsRecordId;
      state.selectedThreadId = null;
      setActiveSection('operations', { syncContext: false });
    });
  });
}

function resetQueueFilters() {
  state.filters.project = 'all';
  state.filters.status = 'all';
  state.filters.platform = 'all';
  state.filters.risk = 'all';
  state.filters.search = '';
  renderFilters();
  elements.searchInput.value = '';
}

function navigateToQueueItem(itemId, options = {}) {
  const queueItem = getQueueItemById(itemId);

  if (!queueItem) {
    return;
  }

  clearActionFeedback();

  if (options.resetFilters) {
    resetQueueFilters();
  }

  state.detailMode = 'queue';
  state.selectedId = queueItem.id;
  state.selectedThreadId = null;
  state.selectedOpsRecordId = null;
  setActiveSection('queue', { syncContext: false });
}

function navigateToOpsRecord(recordId) {
  if (!getOperationsRecords().some((record) => record.id === recordId)) {
    return;
  }

  clearActionFeedback();
  state.detailMode = 'ops';
  state.selectedOpsRecordId = recordId;
  state.selectedThreadId = null;
  setActiveSection('operations', { syncContext: false });
}

function renderContextPanel(actions) {
  if (!actions || actions.length === 0) {
    elements.detailContextPanel.hidden = true;
    elements.detailContextBar.innerHTML = '';
    return;
  }

  elements.detailContextPanel.hidden = false;
  elements.detailContextBar.innerHTML = actions
    .map((action) => {
      if (action.kind === 'link') {
        return `
          <a
            class="button button-link"
            href="${escapeHtml(action.href)}"
            target="_blank"
            rel="noreferrer"
          >
            ${escapeHtml(action.label)}
          </a>
        `;
      }

      return `
        <button class="button" data-context-target="${escapeHtml(action.target)}" type="button">
          ${escapeHtml(action.label)}
        </button>
      `;
    })
    .join('');

  document.querySelectorAll('[data-context-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const [targetKind, ...rest] = button.dataset.contextTarget.split(':');
      const targetId = rest.join(':');

      if (targetKind === 'queue') {
        navigateToQueueItem(targetId, { resetFilters: true });
      }

      if (targetKind === 'ops') {
        navigateToOpsRecord(targetId);
      }
    });
  });
}

function renderManagementBuckets(items = (state.data && state.data.items) || []) {
  const buckets = {
    needs_review: items.filter((item) => item.action_state === 'needs_review'),
    ready_to_execute: items.filter((item) => item.action_state === 'ready_to_execute'),
    missing_info: items.filter((item) => item.action_state === 'missing_info')
  };

  elements.needsReviewCount.textContent = String(buckets.needs_review.length);
  elements.readyToExecuteCount.textContent = String(buckets.ready_to_execute.length);
  elements.needsInfoCount.textContent = String(buckets.missing_info.length);

  elements.needsReviewList.innerHTML = createBucketMarkup(
    buckets.needs_review,
    '当前没有需要你决定的内容。'
  );
  elements.readyToExecuteList.innerHTML = createBucketMarkup(
    buckets.ready_to_execute,
    '当前没有可以继续处理的内容。'
  );
  elements.needsInfoList.innerHTML = createBucketMarkup(
    buckets.missing_info,
    '当前没有资料不全的内容。'
  );

  attachBucketSelection();
}

function canRunQueueAction(item, action) {
  if (!item) {
    return false;
  }

  if (action === 'approve' || action === 'reject') {
    return item.status === 'approval_pending' && Boolean(item.approval_match);
  }

  if (action === 'mark_missing_info') {
    return item.action_state !== 'missing_info';
  }

  if (action === 'mark_ready') {
    return item.action_state !== 'ready_to_execute';
  }

  if (action === 'restore_auto') {
    return Boolean(item.review_override);
  }

  return false;
}

function getActionableQueueIds(action, items = getFilteredItems()) {
  return items
    .filter((item) => canRunQueueAction(item, action))
    .map((item) => item.id);
}

function getNextQueueSelection(processedIds, currentId = state.selectedId) {
  const filteredItems = getFilteredItems();
  const excluded = new Set((processedIds || []).map((itemId) => cleanClientValue(itemId)));

  if (filteredItems.length === 0) {
    return null;
  }

  const currentIndex = filteredItems.findIndex((item) => item.id === currentId);
  const startIndex = currentIndex >= 0 ? currentIndex : -1;

  for (let index = startIndex + 1; index < filteredItems.length; index += 1) {
    if (!excluded.has(filteredItems[index].id)) {
      return filteredItems[index].id;
    }
  }

  for (let index = 0; index <= startIndex; index += 1) {
    if (filteredItems[index] && !excluded.has(filteredItems[index].id)) {
      return filteredItems[index].id;
    }
  }

  return null;
}

function renderBatchActionPanel() {
  if (!state.data) {
    elements.batchActionPanel.hidden = true;
    elements.batchActionSummary.textContent = '';
    elements.batchActionStatus.textContent = '';
    elements.batchActionBar.innerHTML = '';
    return;
  }

  const filteredItems = getFilteredItems();
  const isPending = state.actionPending || state.threadPending || state.batchPending;
  const actions = [
    { action: 'approve', label: '批量批准并入队', className: 'button button-primary' },
    { action: 'reject', label: '批量驳回', className: 'button button-danger' },
    { action: 'mark_missing_info', label: '批量标记缺信息', className: 'button' },
    { action: 'mark_ready', label: '批量标记可执行', className: 'button' },
    { action: 'restore_auto', label: '批量恢复自动判断', className: 'button' }
  ];

  elements.batchActionPanel.hidden = false;
  elements.batchActionSummary.textContent = `当前筛选 ${filteredItems.length} 条`;
  elements.batchActionActor.disabled = isPending;
  elements.batchActionNote.disabled = isPending;
  elements.batchActionActor.value = state.actor;

  if (filteredItems.length === 0) {
    elements.batchActionBar.innerHTML = '<div class="empty-state">当前筛选结果为空，暂时没有可批量处理的内容。</div>';
  } else {
    elements.batchActionBar.innerHTML = actions
      .map((config) => {
        const eligibleCount = getActionableQueueIds(config.action, filteredItems).length;
        const disabled = isPending || eligibleCount === 0;

        return `
          <button
            class="${config.className}"
            data-batch-action="${escapeHtml(config.action)}"
            type="button"
            ${disabled ? 'disabled' : ''}
          >
            ${escapeHtml(`${config.label}（${eligibleCount}）`)}
          </button>
        `;
      })
      .join('');
  }

  if (state.batchActionFeedback) {
    elements.batchActionStatus.textContent = state.batchActionFeedback.message;
    elements.batchActionStatus.className = `detail-action-status batch-action-status is-${state.batchActionFeedback.tone}`;
  } else {
    elements.batchActionStatus.textContent = '系统会只处理当前筛选结果里适合该动作的内容。';
    elements.batchActionStatus.className = 'detail-action-status batch-action-status';
  }

  document.querySelectorAll('[data-batch-action]').forEach((button) => {
    button.addEventListener('click', () => {
      runBatchQueueAction(button.dataset.batchAction);
    });
  });
}

function renderActionLogPanel(target) {
  if (!target || !state.data) {
    elements.actionLogPanel.hidden = true;
    elements.actionLogMeta.textContent = '';
    elements.actionLogList.innerHTML = '';
    return;
  }

  const isQueueMode = state.detailMode === 'queue';
  const actionLog = isQueueMode ? state.data.action_log : state.data.thread_action_log;

  if (!actionLog) {
    elements.actionLogPanel.hidden = true;
    elements.actionLogMeta.textContent = '';
    elements.actionLogList.innerHTML = '';
    return;
  }

  const entries = isQueueMode
    ? (actionLog.entries || []).filter((entry) => entry.item_id === target.id).slice(0, 5)
    : (actionLog.entries || []).filter((entry) => entry.reply_id === target.reply_id).slice(0, 5);

  elements.actionLogPanel.hidden = false;

  if (!actionLog.available && (!actionLog.issues || actionLog.issues.length === 0)) {
    elements.actionLogMeta.textContent = '暂无记录';
    elements.actionLogList.innerHTML = '<div class="empty-state">这条内容还没有处理记录。</div>';
    return;
  }

  if (actionLog.issues && actionLog.issues.length > 0) {
    elements.actionLogMeta.textContent = '暂不可用';
    elements.actionLogList.innerHTML = createOpsIssueMarkup(actionLog.issues, '审计日志暂时不可用。');
    return;
  }

  elements.actionLogMeta.textContent = `${entries.length} 条`;
  elements.actionLogList.innerHTML = entries.length === 0
    ? '<div class="empty-state">这条内容还没有处理记录。</div>'
    : entries
      .map((entry) => {
        const noteParts = [entry.note];

        if (isQueueMode && entry.reasons && entry.reasons.length > 0) {
          noteParts.push(`原因：${translateMissingInfoList(entry.reasons).join('，')}`);
        }

        return `
          <article class="ops-item">
            <div class="ops-item-top">
              <strong>${escapeHtml(translateDisplayValue(entry.action || 'unknown'))}</strong>
              <span class="tag tag-muted">${escapeHtml(entry.actor || '—')}</span>
            </div>
            <span class="ops-item-meta">${escapeHtml(formatDate(entry.timestamp_utc))}</span>
            <span class="ops-item-note">${escapeHtml(noteParts.filter(Boolean).join(' · ') || '没有备注。')}</span>
          </article>
        `;
      })
      .join('');
}

function getFilteredItems() {
  if (!state.data) {
    return [];
  }

  const searchTerm = state.filters.search.trim().toLowerCase();

  return state.data.items.filter((item) => {
    const projectMatch = state.filters.project === 'all' || item.project === state.filters.project;
    const statusMatch = state.filters.status === 'all' || item.status === state.filters.status;
    const platformMatch = state.filters.platform === 'all' || item.platform === state.filters.platform;
    const riskMatch = state.filters.risk === 'all' || item.risk === state.filters.risk;
    const searchMatch =
      !searchTerm ||
      [item.title, item.notes, item.source, item.project, item.platform, item.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm);

    return projectMatch && statusMatch && platformMatch && riskMatch && searchMatch;
  });
}

function renderList() {
  if (!state.data) {
    elements.resultCount.textContent = '0 / 0';
    elements.listMeta.textContent = '数据源诊断';
    elements.itemList.innerHTML = '<div class="empty-state">看板数据暂时不可用。</div>';
    renderBatchActionPanel();
    renderManagementBuckets([]);
    renderDetail(null, 'queue', '看板数据暂时不可用。');
    return;
  }

  const filteredItems = getFilteredItems();
  const totalItems = state.data.items.length;

  elements.resultCount.textContent = `${filteredItems.length} / ${totalItems}`;
  elements.listMeta.textContent = `内容日期 ${state.data.metadata.queue_run_date || '—'}`;
  renderManagementBuckets(state.data.items);
  renderBatchActionPanel();
  renderRecentActivity();

  if (!filteredItems.some((item) => item.id === state.selectedId)) {
    state.selectedId = filteredItems[0] ? filteredItems[0].id : null;
  }

  if (filteredItems.length === 0) {
    elements.itemList.innerHTML = '<div class="empty-state">当前筛选条件下没有匹配项目。</div>';
    renderDetailForCurrentMode('当前筛选条件下没有匹配项目。');
    renderOpsSnapshot();
    return;
  }

  elements.itemList.innerHTML = filteredItems
    .map((item) => {
      const selectedClass = state.detailMode === 'queue' && item.id === state.selectedId ? ' item-row-selected' : '';
      const approvalTag = item.approval_match ? '<span class="tag tag-muted">已匹配审核</span>' : '';

      return `
        <button class="item-row${selectedClass}" data-item-id="${escapeHtml(item.id)}" data-item-source="list" type="button">
          <div class="item-row-top">
            <strong>${escapeHtml(item.title)}</strong>
            <div class="tag-group">
              <span class="tag tag-project">${escapeHtml(item.project || '未分配')}</span>
              <span class="tag tag-status">${escapeHtml(translateDisplayValue(item.status))}</span>
              <span class="tag tag-risk">${escapeHtml(translateDisplayValue(item.risk))}</span>
              ${approvalTag}
            </div>
          </div>
          <div class="item-row-meta">
            <span>${escapeHtml(item.platform)}</span>
            <span>${escapeHtml(item.source || '无来源')}</span>
          </div>
        </button>
      `;
    })
    .join('');

  const selectedItem = filteredItems.find((item) => item.id === state.selectedId) || filteredItems[0];
  attachBucketSelection();
  renderDetailForCurrentMode('当前还没有可展示的详情。', selectedItem);
  renderOpsSnapshot();
}

function renderThreadActionPanel(thread) {
  const isPending = state.threadPending || state.actionPending || state.batchPending;
  const buttons = [];

  if (thread.review_state !== 'ready') {
    buttons.push({ action: 'mark_ready', label: '标记可直接回复', className: 'button button-primary' });
  }

  if (thread.review_state !== 'follow_up') {
    buttons.push({ action: 'mark_follow_up', label: '标记待跟进', className: 'button' });
  }

  if (thread.review_state !== 'blocked') {
    buttons.push({ action: 'mark_blocked', label: '标记阻塞', className: 'button button-danger' });
  }

  if (thread.review_state !== 'done') {
    buttons.push({ action: 'mark_done', label: '标记已处理', className: 'button' });
  }

  if (thread.review_override) {
    buttons.push({ action: 'restore_auto', label: '恢复系统判断', className: 'button' });
  }

  elements.detailActionPanel.hidden = false;
  elements.detailActionActor.value = state.actor;
  elements.detailActionActor.disabled = isPending;
  elements.detailActionNote.disabled = isPending;
  elements.detailActionBar.innerHTML = buttons.length > 0
    ? buttons
      .map((button) => {
        return `
          <button
            class="${button.className}"
            data-thread-action="${escapeHtml(button.action)}"
            type="button"
            ${isPending ? 'disabled' : ''}
          >
            ${escapeHtml(button.label)}
          </button>
        `;
      })
      .join('')
    : '<div class="empty-state">当前回复任务没有可用动作。</div>';

  if (state.threadActionFeedback && state.threadActionFeedback.replyId === thread.reply_id) {
    elements.detailActionStatus.textContent = state.threadActionFeedback.message;
    elements.detailActionStatus.className = `detail-action-status is-${state.threadActionFeedback.tone}`;
  } else {
    elements.detailActionStatus.textContent = '';
    elements.detailActionStatus.className = 'detail-action-status';
  }

  document.querySelectorAll('[data-thread-action]').forEach((button) => {
    button.addEventListener('click', () => {
      runThreadAction(button.dataset.threadAction);
    });
  });
}

function renderActionPanel(item) {
  if (!item) {
    elements.detailActionPanel.hidden = true;
    elements.detailActionBar.innerHTML = '';
    elements.detailActionStatus.textContent = '';
    elements.detailActionStatus.className = 'detail-action-status';
    return;
  }

  if (state.detailMode === 'thread') {
    renderThreadActionPanel(item);
    return;
  }

  if (state.detailMode !== 'queue') {
    elements.detailActionPanel.hidden = true;
    elements.detailActionBar.innerHTML = '';
    elements.detailActionStatus.textContent = '';
    elements.detailActionStatus.className = 'detail-action-status';
    return;
  }

  const isPending = state.actionPending || state.threadPending || state.batchPending;
  const buttons = [];

  if (item.status === 'approval_pending' && item.approval_match) {
    buttons.push({ action: 'approve', label: '批准并入队', className: 'button button-primary' });
    buttons.push({ action: 'reject', label: '驳回', className: 'button button-danger' });
  }

  if (item.action_state !== 'missing_info') {
    buttons.push({ action: 'mark_missing_info', label: '标记缺信息', className: 'button' });
  }

  if (item.action_state !== 'ready_to_execute') {
    buttons.push({ action: 'mark_ready', label: '标记可执行', className: 'button' });
  }

  if (item.review_override) {
    buttons.push({ action: 'restore_auto', label: '恢复自动判断', className: 'button' });
  }

  elements.detailActionPanel.hidden = false;
  elements.detailActionActor.value = state.actor;
  elements.detailActionActor.disabled = isPending;
  elements.detailActionNote.disabled = isPending;
  elements.detailActionBar.innerHTML = buttons.length > 0
    ? buttons
      .map((button) => {
        return `
          <button
            class="${button.className}"
            data-queue-action="${escapeHtml(button.action)}"
            type="button"
            ${isPending ? 'disabled' : ''}
          >
            ${escapeHtml(button.label)}
          </button>
        `;
      })
      .join('')
    : '<div class="empty-state">当前项目没有可用动作。</div>';

  if (state.actionFeedback && state.actionFeedback.itemId === item.id) {
    elements.detailActionStatus.textContent = state.actionFeedback.message;
    elements.detailActionStatus.className = `detail-action-status is-${state.actionFeedback.tone}`;
  } else {
    elements.detailActionStatus.textContent = '';
    elements.detailActionStatus.className = 'detail-action-status';
  }

  document.querySelectorAll('[data-queue-action]').forEach((button) => {
    button.addEventListener('click', () => {
      runQueueAction(button.dataset.queueAction);
    });
  });
}

function renderQueueDetail(item) {
  elements.detailTitle.textContent = '内容详情';
  elements.detailSubtitle.textContent = '这里显示内容本身、审核情况和你可以直接做的处理。';
  elements.primaryJsonTitle.textContent = '原始内容数据';
  elements.secondaryJsonTitle.textContent = '原始审核数据';

  const rows = [
    ['标题', item.title || '—'],
    ['项目', item.project || '—'],
    ['当前状态', translateDisplayValue(item.action_label || item.action_state)],
    ['平台', item.platform || '—'],
    ['状态', translateDisplayValue(item.status)],
    ['风险', translateDisplayValue(item.risk)],
    ['分类', translateDisplayValue(item.category)],
    ['负责人', translateDisplayValue(item.owner)],
    ['提交时间', formatDate(item.requested_at)],
    ['提交人', item.requested_by || '—'],
    ['审核单号', item.approval_ticket || '—'],
    ['审核记录号', item.approval_entry_id || '—'],
    ['缺少资料', item.missing_info && item.missing_info.length ? translateMissingInfoList(item.missing_info).join('，') : '—'],
    ['人工覆盖', item.review_override ? '是' : '否'],
    ['最后动作', translateDisplayValue(item.review_last_action)],
    ['处理备注', item.review_note || '—'],
    ['处理人', item.review_updated_by || '—'],
    ['处理时间', formatDate(item.review_updated_at)],
    ['审核原因', item.reason || '—'],
    ['备注', item.notes || '—'],
    ['来源', item.source || '—'],
    ['源文件可读', item.source_details && item.source_details.available ? '是' : '否'],
    ['识别资源数', item.source_details ? String(item.source_details.artifact_count || 0) : '0']
  ];

  elements.detailGrid.innerHTML = rows
    .map(([label, value]) => {
      return `
        <div class="detail-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `;
    })
    .join('');

  elements.queueJson.textContent = JSON.stringify(item.raw.queue, null, 2);
  elements.approvalJson.textContent = item.raw.approval
    ? JSON.stringify(item.raw.approval, null, 2)
    : '没有匹配到审核记录。';

  const contextActions = [];
  const linkedHandoffRecord = getLinkedHandoffRecordForQueueItem(item);

  if (linkedHandoffRecord) {
    contextActions.push({
      kind: 'nav',
      label: '查看待自动发布记录',
      target: `ops:${linkedHandoffRecord.id}`
    });

    if (isHttpUrl(linkedHandoffRecord.primaryPayload && linkedHandoffRecord.primaryPayload.target_url)) {
      contextActions.push({
        kind: 'link',
        label: '打开目标 URL',
        href: linkedHandoffRecord.primaryPayload.target_url
      });
    }
  }

  renderContextPanel(contextActions);
  renderActionLogPanel(item);
  renderActionPanel(item);
  renderSourcePreview(item.source_details || null);
}

function renderThreadDetail(thread) {
  elements.detailTitle.textContent = '回复任务详情';
  elements.detailSubtitle.textContent = '这里显示回复任务本身、当前处理状态，以及自动执行需要的步骤。';
  elements.primaryJsonTitle.textContent = '回复任务数据';
  elements.secondaryJsonTitle.textContent = '自动执行步骤';

  const rows = [
    ['任务 ID', thread.reply_id || '—'],
    ['当前处理状态', getThreadStateLabel(thread.review_state)],
    ['运行日期', thread.run_date || '—'],
    ['创建时间', formatDate(thread.created_at)],
    ['平台', thread.platform || '—'],
    ['频道', thread.channel_name || '—'],
    ['任务分类', thread.classification_bucket || '—'],
    ['分类评分', formatOpsValue(thread.classification_score)],
    ['需要人工处理', formatBoolean(thread.manual_required || thread.needs_manual_review)],
    ['是否敏感', formatBoolean(thread.has_sensitive_content)],
    ['可交接', formatBoolean(thread.handoff_ready)],
    ['阻塞原因', thread.blocked_reasons && thread.blocked_reasons.length > 0 ? translateValueList(thread.blocked_reasons).join('，') : '—'],
    ['人工覆盖', thread.review_override ? '是' : '否'],
    ['最后动作', translateDisplayValue(thread.review_last_action)],
    ['处理备注', thread.review_note || '—'],
    ['处理人', thread.review_updated_by || '—'],
    ['处理时间', formatDate(thread.review_updated_at)],
    ['审核单号', thread.approval_ticket || '—'],
    ['目标 URL', thread.target_url || '—'],
    ['来源形式', translateDisplayValue(thread.source_kind)],
    ['草稿预览', thread.draft_preview || '—'],
    ['任务文件', thread.packet_path || '—'],
    ['执行步骤文件', thread.job_path || '—']
  ];

  elements.detailGrid.innerHTML = rows
    .map(([label, value]) => {
      return `
        <div class="detail-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `;
    })
    .join('');

  elements.queueJson.textContent = JSON.stringify(
    thread.raw && thread.raw.packet
      ? thread.raw.packet
      : {
        reply_id: thread.reply_id || null,
        run_date: thread.run_date || null,
        created_at: thread.created_at || null,
        platform: thread.platform || null,
        channel_name: thread.channel_name || null,
        target_url: thread.target_url || null,
        approval_ticket: thread.approval_ticket || null,
        source_kind: thread.source_kind || null,
        classification: {
          bucket: thread.classification_bucket || null,
          score: thread.classification_score,
          manual_required: Boolean(thread.manual_required)
        },
        needs_manual_review: Boolean(thread.needs_manual_review),
        has_sensitive_content: Boolean(thread.has_sensitive_content),
        handoff_ready: Boolean(thread.handoff_ready),
        blocked_reasons: thread.blocked_reasons || [],
        draft_preview: thread.draft_preview || null,
        packet_path: thread.packet_path || null
      },
    null,
    2
  );
  elements.approvalJson.textContent = thread.raw && thread.raw.job
    ? JSON.stringify(thread.raw.job, null, 2)
    : thread.selectors || thread.gates
      ? JSON.stringify({
        selectors: thread.selectors || null,
        gates: thread.gates || null,
        job_path: thread.job_path || null
      }, null, 2)
      : '没有匹配到自动执行步骤。';
  const contextActions = [];
  const linkedQueueItem = getLinkedQueueItemForThread(thread);

  if (linkedQueueItem) {
    contextActions.push({
      kind: 'nav',
      label: '跳到关联队列项',
      target: `queue:${linkedQueueItem.id}`
    });
  }

  if (isHttpUrl(thread.target_url)) {
    contextActions.push({
      kind: 'link',
      label: '打开目标 URL',
      href: thread.target_url
    });
  }

  if (cleanClientValue(thread.packet_path)) {
    contextActions.push({
      kind: 'link',
      label: '打开任务文件',
      href: toLocalFileHref(thread.packet_path)
    });
  }

  if (cleanClientValue(thread.job_path)) {
    contextActions.push({
      kind: 'link',
      label: '打开执行步骤文件',
      href: toLocalFileHref(thread.job_path)
    });
  }

  renderContextPanel(contextActions);
  renderActionLogPanel(thread);
  renderActionPanel(thread);
  renderSourcePreview(null);
}

function renderOperationsDetail(record) {
  elements.detailTitle.textContent = record.title || '问题记录';
  elements.detailSubtitle.textContent = record.subtitle || '这里显示这条问题记录的详细上下文。';
  elements.primaryJsonTitle.textContent = record.primaryTitle || '原始问题数据';
  elements.secondaryJsonTitle.textContent = record.secondaryTitle || '来源信息';
  elements.detailGrid.innerHTML = (record.rows || [])
    .map(([label, value]) => {
      return `
        <div class="detail-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `;
    })
    .join('');
  elements.queueJson.textContent = JSON.stringify(record.primaryPayload || {}, null, 2);
  elements.approvalJson.textContent = JSON.stringify(record.secondaryPayload || {}, null, 2);
  const contextActions = [];
  const linkedQueueItem = getLinkedQueueItemForOpsRecord(record);

  if (linkedQueueItem) {
    contextActions.push({
      kind: 'nav',
      label: '跳到关联队列项',
      target: `queue:${linkedQueueItem.id}`
    });
  }

  if (isHttpUrl(record.primaryPayload && record.primaryPayload.target_url)) {
    contextActions.push({
      kind: 'link',
      label: '打开目标 URL',
      href: record.primaryPayload.target_url
    });
  }

  if (cleanClientValue(record.secondaryPayload && record.secondaryPayload.path)) {
    contextActions.push({
      kind: 'link',
      label: '打开源文件',
      href: toLocalFileHref(record.secondaryPayload.path)
    });
  }

  renderContextPanel(contextActions);
  renderActionLogPanel(null);
  renderActionPanel(null);
  renderSourcePreview(null);
}

function renderDetail(item, mode = 'queue', emptyMessage = '请选择一条内容、一条问题记录或一条回复任务。') {
  if (!item) {
    elements.detailEmpty.textContent = emptyMessage;
    elements.detailEmpty.hidden = false;
    elements.detailView.hidden = true;
    renderContextPanel([]);
    renderActionLogPanel(null);
    renderActionPanel(null);
    renderSourcePreview(null);
    return;
  }

  elements.detailEmpty.hidden = true;
  elements.detailView.hidden = false;

  if (mode === 'thread') {
    renderThreadDetail(item);
    return;
  }

  if (mode === 'ops') {
    renderOperationsDetail(item);
    return;
  }

  renderQueueDetail(item);
}

function renderDetailForCurrentMode(queueFallbackMessage, selectedQueueItem = null) {
  if (state.detailMode === 'thread' && state.activeSection === 'pipeline') {
    const selectedThread = getSelectedThread();
    renderDetail(
      selectedThread,
      'thread',
      '当前还没有可用的回复任务。'
    );
    return;
  }

  if (state.detailMode === 'ops' && state.activeSection === 'operations') {
    const selectedRecord = getSelectedOperationsRecord();
    renderDetail(
      selectedRecord,
      'ops',
      state.data && state.data.operations_review && state.data.operations_review.available === false
        ? '问题记录数据暂时不可用。'
        : '请选择一条问题记录查看详情。'
    );
    return;
  }

  renderDetail(selectedQueueItem || getSelectedQueueItem(), 'queue', queueFallbackMessage);
}

async function runQueueAction(action) {
  const item = getSelectedQueueItem();

  if (!item || state.actionPending || state.batchPending) {
    return;
  }

  const nextSelectionId = getNextQueueSelection([item.id], item.id);
  state.actionPending = true;
  state.actionFeedback = {
    itemId: item.id,
    tone: 'success',
    message: '正在提交动作…'
  };
  renderActionPanel(item);

  const note = elements.detailActionNote.value.trim();
  const reasons = action === 'mark_missing_info'
    ? note.split(/[\n,，]/).map((value) => value.trim()).filter(Boolean)
    : [];

  try {
    const response = await fetch(`/api/queue/${encodeURIComponent(item.id)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        action,
        actor: state.actor,
        note,
        reasons
      })
    });

    let payload = null;

    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload && payload.error ? payload.error : `提交失败（HTTP ${response.status}）`);
    }

    state.actionFeedback = {
      itemId: item.id,
      tone: 'success',
      message: `已完成操作：${translateDisplayValue(action)}`
    };
    elements.detailActionNote.value = '';
    await loadData({
      activeSection: 'queue',
      detailMode: 'queue',
      selectedId: nextSelectionId
    });
  } catch (error) {
    state.actionFeedback = {
      itemId: item.id,
      tone: 'error',
      message: error.message || '提交动作失败。'
    };
    renderActionPanel(item);
  } finally {
    state.actionPending = false;
    const selectedItem = getSelectedQueueItem();
    if (selectedItem) {
      renderActionPanel(selectedItem);
    }
  }
}

async function runBatchQueueAction(action) {
  if (state.batchPending || state.actionPending) {
    return;
  }

  const filteredItems = getFilteredItems();
  const itemIds = getActionableQueueIds(action, filteredItems);

  if (itemIds.length === 0) {
    state.batchActionFeedback = {
      tone: 'error',
      message: '当前筛选结果里没有适合这个动作的内容。'
    };
    renderBatchActionPanel();
    return;
  }

  const note = elements.batchActionNote.value.trim();
  const reasons = action === 'mark_missing_info'
    ? note.split(/[\n,，]/).map((value) => value.trim()).filter(Boolean)
    : [];
  const nextSelectionId = getNextQueueSelection(itemIds, state.selectedId);

  state.batchPending = true;
  state.batchActionFeedback = {
    tone: 'success',
    message: `正在批量提交 ${itemIds.length} 条内容…`
  };
  renderBatchActionPanel();

  const selectedItem = getSelectedQueueItem();
  if (selectedItem) {
    renderActionPanel(selectedItem);
  }

  try {
    const response = await fetch('/api/queue/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        item_ids: itemIds,
        action,
        actor: state.actor,
        note,
        reasons
      })
    });

    let payload = null;

    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload && payload.error ? payload.error : `批量提交失败（HTTP ${response.status}）`);
    }

    state.batchActionFeedback = {
      tone: 'success',
      message: `已批量完成 ${payload && payload.updated_count ? payload.updated_count : itemIds.length} 条：${translateDisplayValue(action)}`
    };
    elements.batchActionNote.value = '';
    await loadData({
      activeSection: 'queue',
      detailMode: 'queue',
      selectedId: nextSelectionId
    });
  } catch (error) {
    state.batchActionFeedback = {
      tone: 'error',
      message: error.message || '批量动作提交失败。'
    };
    renderBatchActionPanel();
  } finally {
    state.batchPending = false;
    renderBatchActionPanel();
    const nextSelectedItem = getSelectedQueueItem();
    if (nextSelectedItem) {
      renderActionPanel(nextSelectedItem);
    }
  }
}

async function runThreadAction(action) {
  const thread = getSelectedThread();

  if (!thread || state.threadPending || state.actionPending || state.batchPending) {
    return;
  }

  const nextSelectionId = getNextThreadSelection([thread.reply_id], thread.reply_id);
  const note = elements.detailActionNote.value.trim();

  state.threadPending = true;
  state.threadActionFeedback = {
    replyId: thread.reply_id,
    tone: 'success',
    message: '正在提交线程动作…'
  };
  renderActionPanel(thread);

  try {
    const response = await fetch(`/api/thread/${encodeURIComponent(thread.reply_id)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        action,
        actor: state.actor,
        note
      })
    });

    let payload = null;

    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload && payload.error ? payload.error : `提交失败（HTTP ${response.status}）`);
    }

    state.threadActionFeedback = {
      replyId: thread.reply_id,
      tone: 'success',
      message: `已完成操作：${getThreadActionLabel(action)}`
    };
    elements.detailActionNote.value = '';
    await loadData({
      activeSection: 'pipeline',
      detailMode: 'thread',
      selectedThreadId: nextSelectionId
    });
  } catch (error) {
    state.threadActionFeedback = {
      replyId: thread.reply_id,
      tone: 'error',
      message: error.message || '线程动作提交失败。'
    };
    renderActionPanel(thread);
  } finally {
    state.threadPending = false;
    const selectedThread = getSelectedThread();
    if (selectedThread) {
      renderActionPanel(selectedThread);
    }
  }
}

function syncFiltersFromInputs() {
  if (!state.data) {
    return;
  }

  state.filters.project = elements.projectFilter.value;
  state.filters.status = elements.statusFilter.value;
  state.filters.platform = elements.platformFilter.value;
  state.filters.risk = elements.riskFilter.value;
  state.filters.search = elements.searchInput.value;
  state.detailMode = 'queue';
  state.selectedThreadId = null;
  state.selectedOpsRecordId = null;
  clearActionFeedback();
  renderList();
}

function syncThreadInboxFilter() {
  if (!state.data) {
    return;
  }

  state.threadInboxFilter = elements.threadInboxFilter.value;
  clearActionFeedback();
  renderOpsSnapshot();

  if (state.activeSection === 'pipeline') {
    state.detailMode = 'thread';
    renderDetailForCurrentMode('当前还没有可用的回复任务。');
  }
}

async function loadData(options = {}) {
  elements.refreshButton.disabled = true;
  elements.statusBanner.textContent = '正在加载数据…';
  setFilterAvailability(true);

  const previousSection = Object.prototype.hasOwnProperty.call(options, 'activeSection')
    ? options.activeSection
    : state.activeSection;
  const previousDetailMode = Object.prototype.hasOwnProperty.call(options, 'detailMode')
    ? options.detailMode
    : state.detailMode;
  const previousSelectedId = Object.prototype.hasOwnProperty.call(options, 'selectedId')
    ? options.selectedId
    : state.selectedId;
  const previousSelectedThreadId = Object.prototype.hasOwnProperty.call(options, 'selectedThreadId')
    ? options.selectedThreadId
    : state.selectedThreadId;
  const previousSelectedOpsRecordId = Object.prototype.hasOwnProperty.call(options, 'selectedOpsRecordId')
    ? options.selectedOpsRecordId
    : state.selectedOpsRecordId;

  try {
    const response = await fetch('/api/dashboard', { cache: 'no-store' });

    if (!response.ok) {
      let payload = null;

      try {
        payload = await response.json();
      } catch (_error) {
        payload = null;
      }

      throw normalizeLoadError(payload, response.status);
    }

    state.data = await response.json();
    state.activeSection = previousSection;
    state.detailMode = previousDetailMode;
    state.selectedId = previousSelectedId;
    state.selectedThreadId = previousSelectedThreadId;
    state.selectedOpsRecordId = previousSelectedOpsRecordId;
    setFilterAvailability(false);
    renderWorkspaceHighlights();
    renderWorkspaceSections();
    renderSummary();
    renderOperationsReview();
    renderFilters();
    renderList();

    elements.statusBanner.textContent = [
      `审核更新时间 ${formatDate(state.data.metadata.approval_updated_at)}`,
      `内容日期 ${state.data.metadata.queue_run_date || '—'}`,
      `自动执行 ${state.data.ops_snapshot && state.data.ops_snapshot.latest_run_date ? state.data.ops_snapshot.latest_run_date : '—'}`,
      `生成时间 ${formatDate(state.data.generated_at)}`
    ].join(' · ');
  } catch (error) {
    state.data = null;
    state.detailMode = 'queue';
    state.selectedId = null;
    state.selectedThreadId = null;
    state.selectedOpsRecordId = null;
    state.actionPending = false;
    state.threadPending = false;
    elements.summaryCards.innerHTML = '';
    elements.workspaceHighlights.innerHTML = '';
    elements.reviewLedgerMeta.textContent = '';
    elements.experimentMeta.textContent = '';
    elements.feedbackMeta.textContent = '';
    elements.handoffMeta.textContent = '';
    elements.runHealthMeta.textContent = '';
    elements.executionSnapshotMeta.textContent = '';
    elements.bossThreadsMeta.textContent = '';
    elements.threadInboxFilter.disabled = true;
    elements.reviewLedgerList.innerHTML = '<div class="empty-state">问题记录数据暂时不可用。</div>';
    elements.experimentList.innerHTML = '<div class="empty-state">问题记录数据暂时不可用。</div>';
    elements.feedbackSummary.innerHTML = '<div class="empty-state">问题记录数据暂时不可用。</div>';
    elements.handoffList.innerHTML = '<div class="empty-state">问题记录数据暂时不可用。</div>';
    elements.runHealthSummary.innerHTML = '<div class="empty-state">自动执行数据暂时不可用。</div>';
    elements.executionSnapshotSummary.innerHTML = '<div class="empty-state">自动执行数据暂时不可用。</div>';
    elements.bossThreadsSummary.innerHTML = '<div class="empty-state">自动执行数据暂时不可用。</div>';
    elements.itemList.innerHTML = createLoadErrorMarkup(normalizeLoadError(error));
    elements.listMeta.textContent = '数据源诊断';
    elements.resultCount.textContent = '0 / 0';
    elements.batchActionPanel.hidden = true;
    elements.batchActionBar.innerHTML = '';
    elements.batchActionStatus.textContent = '';
    elements.batchActionSummary.textContent = '';
    elements.needsReviewCount.textContent = '0';
    elements.readyToExecuteCount.textContent = '0';
    elements.needsInfoCount.textContent = '0';
    elements.needsReviewList.innerHTML = '<div class="empty-state">看板数据暂时不可用。</div>';
    elements.readyToExecuteList.innerHTML = '<div class="empty-state">看板数据暂时不可用。</div>';
    elements.needsInfoList.innerHTML = '<div class="empty-state">看板数据暂时不可用。</div>';
    elements.detailEmpty.hidden = false;
    elements.detailView.hidden = true;
    elements.detailActionPanel.hidden = true;
    elements.detailContextPanel.hidden = true;
    elements.statusBanner.textContent = `加载失败：${normalizeLoadError(error).message}`;
  } finally {
    elements.refreshButton.disabled = false;
  }
}

syncActorInputs();
elements.detailActionActor.addEventListener('input', () => {
  setActorValue(elements.detailActionActor.value);
});
elements.batchActionActor.addEventListener('input', () => {
  setActorValue(elements.batchActionActor.value);
});
elements.projectFilter.addEventListener('change', syncFiltersFromInputs);
elements.statusFilter.addEventListener('change', syncFiltersFromInputs);
elements.platformFilter.addEventListener('change', syncFiltersFromInputs);
elements.riskFilter.addEventListener('change', syncFiltersFromInputs);
elements.searchInput.addEventListener('input', syncFiltersFromInputs);
elements.threadInboxFilter.addEventListener('change', syncThreadInboxFilter);
elements.refreshButton.addEventListener('click', loadData);

attachWorkspaceNavigation();
renderWorkspaceSections();
loadData();
