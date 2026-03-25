const ACTOR_STORAGE_KEY = 'reviewhub.actor';
let flashBannerTimer = null;

function readStoredActor() {
  try {
    return window.localStorage.getItem(ACTOR_STORAGE_KEY) || '';
  } catch (_error) {
    return '';
  }
}

const INBOX_TABS = [
  { id: 'pending', label: '待审核' },
  { id: 'ready', label: '可以继续' },
  { id: 'missing_info', label: '资料不全' },
  { id: 'deferred', label: '已暂缓' },
  { id: 'all', label: '全部' }
];

const state = {
  data: null,
  activeSection: 'queue',
  filters: {
    project: 'all',
    status: 'all',
    action_state: 'all',
    platform: 'all',
    risk: 'all',
    search: ''
  },
  detailMode: 'queue',
  selectedId: null,
  selectedThreadId: null,
  selectedOpsRecordId: null,
  laneSelectionId: null,
  actionFeedback: null,
  threadActionFeedback: null,
  opsActionFeedback: null,
  flashMessage: null,
  actionPending: false,
  threadPending: false,
  opsPending: false,
  detailDeferMode: '',
  processingLaneFilter: 'all',
  threadInboxFilter: 'needs_reply',
  actor: readStoredActor(),
  inboxTab: 'pending'
};

const UI_LOCALE = 'zh-CN';

const DISPLAY_VALUE_MAP = {
  all: '全部',
  active: '进行中',
  approve: '批准并入队',
  approval_pending: '等待审核',
  approval_registry: '审核记录表',
  blocked: '阻塞',
  'bucket a': '分类 A',
  'bucket b': '分类 B',
  'bucket c': '分类 C',
  browser_post_queue_summary: '待自动发布数据',
  critical: '紧急',
  daily_channel_queue: '待处理内容列表',
  daily_processing: '日报待处理',
  degraded: '降级',
  error: '错误',
  experiment_log: '试验记录文件',
  experiments: '试验记录',
  failed: '失败',
  feedback: '问题反馈',
  feedback_incident: '反馈告警',
  feedback_report: '反馈报告',
  fill: '自动填写',
  high: '高',
  green: '正常',
  'handoff ready': '可交接',
  inline_text: '内联文本',
  low: '低',
  manual: '需人工确认',
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
  queue_action: '内容处理',
  reject: '驳回',
  ready: '就绪',
  ready_for_browser_review: '待浏览器复核',
  ready_to_execute: '可以继续',
  'ready to execute': '可以继续',
  metrics: '指标',
  posts: '发帖',
  replies: '回复',
  review_attention: '待关注记录',
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
  thread_action: '回复处理',
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
  deferred: '已暂缓',
  yes: '是'
};

DISPLAY_VALUE_MAP.defer = '暂缓';
DISPLAY_VALUE_MAP.execute = '推进执行';
DISPLAY_VALUE_MAP.mark_defer = '标记暂缓';
DISPLAY_VALUE_MAP.mark_deferred = '标记暂缓';
DISPLAY_VALUE_MAP.mark_execute = '标记推进执行';
DISPLAY_VALUE_MAP.mark_review = '标记需复核';
DISPLAY_VALUE_MAP.ops_action = '问题记录处理';

const MISSING_INFO_LABELS = {
  'approval match': '审核记录',
  'approval rejected': '审批已驳回',
  'approval reason': '审核原因',
  'approval revoked': '审批已撤回',
  'manual review': '人工补充',
  owner: '负责人'
};

const elements = {
  actionLogList: document.getElementById('actionLogList'),
  actionLogMeta: document.getElementById('actionLogMeta'),
  actionLogPanel: document.getElementById('actionLogPanel'),
  approvalJson: document.getElementById('approvalJson'),
  detailActionBar: document.getElementById('detailActionBar'),
  detailActionActor: document.getElementById('detailActionActor'),
  detailActionNote: document.getElementById('detailActionNote'),
  detailActionDeferUntil: document.getElementById('detailActionDeferUntil'),
  detailActionPanel: document.getElementById('detailActionPanel'),
  detailActionStatus: document.getElementById('detailActionStatus'),
  detailContextBar: document.getElementById('detailContextBar'),
  detailContextPanel: document.getElementById('detailContextPanel'),
  detailEmpty: document.getElementById('detailEmpty'),
  detailInsightCore: document.getElementById('detailInsightCore'),
  detailInsightDiagnosis: document.getElementById('detailInsightDiagnosis'),
  detailInsightMetadata: document.getElementById('detailInsightMetadata'),
  detailSubtitle: document.getElementById('detailSubtitle'),
  detailTitle: document.getElementById('detailTitle'),
  detailView: document.getElementById('detailView'),
  deferredCount: document.getElementById('deferredCount'),
  deferredList: document.getElementById('deferredList'),
  itemList: document.getElementById('itemList'),
  listMeta: document.getElementById('listMeta'),
  needsInfoCount: document.getElementById('needsInfoCount'),
  needsInfoList: document.getElementById('needsInfoList'),
  needsReviewCount: document.getElementById('needsReviewCount'),
  needsReviewList: document.getElementById('needsReviewList'),
  queueJson: document.getElementById('queueJson'),
  readyToExecuteCount: document.getElementById('readyToExecuteCount'),
  readyToExecuteList: document.getElementById('readyToExecuteList'),
  recentActivityList: document.getElementById('recentActivityList'),
  recentActivityMeta: document.getElementById('recentActivityMeta'),
  refreshButton: document.getElementById('refreshButton'),
  resultCount: document.getElementById('resultCount'),
  primaryJsonTitle: document.getElementById('primaryJsonTitle'),
  projectFilter: document.getElementById('projectFilter'),
  riskFilter: document.getElementById('riskFilter'),
  operationsUnifiedList: document.getElementById('operationsUnifiedList'),
  operationsUnifiedMeta: document.getElementById('operationsUnifiedMeta'),
  pipelineUnifiedList: document.getElementById('pipelineUnifiedList'),
  pipelineUnifiedMeta: document.getElementById('pipelineUnifiedMeta'),
  searchInput: document.getElementById('searchInput'),
  secondaryJsonTitle: document.getElementById('secondaryJsonTitle'),
  sourceArtifactList: document.getElementById('sourceArtifactList'),
  sourcePreview: document.getElementById('sourcePreview'),
  sourcePreviewPanel: document.getElementById('sourcePreviewPanel'),
  statusBanner: document.getElementById('statusBanner'),
  flashBanner: document.getElementById('flashBanner'),
  statusFilter: document.getElementById('statusFilter'),
  actionStateFilter: document.getElementById('actionStateFilter'),
  summaryCards: document.getElementById('summaryCards'),
  threadInboxFilter: document.getElementById('threadInboxFilter'),
  platformFilter: document.getElementById('platformFilter'),
  workspaceHighlights: document.getElementById('workspaceHighlights'),
  filterResetButton: document.getElementById('filterResetButton')
};

function matchesInboxTab(item) {
  if (!item) {
    return false;
  }

  const inboxTab = state.inboxTab || 'pending';
  const actionState = cleanClientValue(item.action_state);
  const status = cleanClientValue(item.status);

  switch (inboxTab) {
    case 'pending':
      return status === 'approval_pending';
    case 'ready':
      return actionState === 'ready_to_execute' || status === 'queued';
    case 'missing_info':
      return actionState === 'missing_info';
    case 'deferred':
      return actionState === 'deferred';
    case 'all':
    default:
      return true;
  }
}

function renderInboxTabs() {
  return INBOX_TABS
    .map((tab) => {
      const isActive = state.inboxTab === tab.id;
      const className = isActive ? 'inbox-view-tab is-active' : 'inbox-view-tab';
      return `<button class="${className}" type="button" data-inbox-tab="${escapeHtml(tab.id)}">${escapeHtml(tab.label)}</button>`;
    })
    .join('');
}

function getInboxTabCount(tabId) {
  const summary = state.data && state.data.summary ? state.data.summary : {};

  switch (tabId) {
    case 'pending':
      return summary.approval_pending_items || 0;
    case 'ready':
      return summary.ready_to_execute_count || 0;
    case 'missing_info':
      return summary.missing_info_count || 0;
    case 'deferred':
      return summary.deferred_count || 0;
    case 'all':
    default:
      return summary.total_items || 0;
  }
}

function renderInboxTabBar() {
  document.querySelectorAll('[data-inbox-tab]').forEach((button) => {
    const tabId = button.dataset.inboxTab;
    const config = INBOX_TABS.find((tab) => tab.id === tabId);

    if (!config) {
      return;
    }

    const isActive = state.inboxTab === tabId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
    button.textContent = `${config.label}（${getInboxTabCount(tabId)}）`;
  });
}

function attachInboxTabListeners() {
  document.querySelectorAll('[data-inbox-tab]').forEach((button) => {
    if (button.dataset.boundTab === 'true') {
      return;
    }

    button.dataset.boundTab = 'true';
    button.addEventListener('click', () => {
      const tabId = button.dataset.inboxTab;
      if (tabId && tabId !== state.inboxTab) {
        state.inboxTab = tabId;
        clearActionFeedback();
        renderInboxTabBar();
        renderList();
      }
    });
  });
}

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
  if (!elements.recentActivityList) return; // DOM removed in unified layout
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
      const targetLabel = entry.kind === 'thread'
        ? (entry.target_id || '未知回复')
        : entry.kind === 'ops'
          ? (entry.record_title || entry.target_id || '未知记录')
          : (entry.target_id || '未知内容');
      const targetButton = entry.kind === 'thread'
        ? `<button class="button button-link" type="button" data-jump-thread-id="${escapeHtml(entry.target_id || '')}">查看回复</button>`
        : entry.kind === 'ops'
          ? `<button class="button button-link" type="button" data-jump-ops-id="${escapeHtml(entry.target_id || '')}">查看记录</button>`
          : `<button class="button button-link" type="button" data-jump-item-id="${escapeHtml(entry.target_id || '')}">查看内容</button>`;
      const noteParts = [entry.note];
      if (entry.kind === 'queue' && entry.reasons && entry.reasons.length > 0) {
        noteParts.push(`原因：${translateMissingInfoList(entry.reasons).join('，')}`);
      }
      if (entry.kind === 'thread' && entry.manual_state) {
        noteParts.push(`状态：${getThreadStateLabel(entry.manual_state)}`);
      }
      if (entry.kind === 'ops' && entry.manual_state) {
        noteParts.push(`状态：${getOpsStateLabel(entry.manual_state)}`);
      }
      return `
        <article class="ops-item">
          <div class="ops-item-top">
            <strong>${escapeHtml(translateDisplayValue(entry.action || 'unknown'))}</strong>
            <div class="tag-group">
              <span class="tag tag-muted">${escapeHtml(entry.kind === 'thread' ? '回复' : entry.kind === 'ops' ? '问题记录' : '队列')}</span>
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

  document.querySelectorAll('[data-jump-ops-id]').forEach((button) => {
    button.addEventListener('click', () => {
      navigateToOpsRecord(button.dataset.jumpOpsId);
    });
  });
}

function getProcessingLaneEntries() {
  return state.data && state.data.daily_processing_queue && Array.isArray(state.data.daily_processing_queue.entries)
    ? state.data.daily_processing_queue.entries
    : [];
}

function getFilteredProcessingLaneEntries() {
  const entries = getProcessingLaneEntries();

  if (state.processingLaneFilter === 'all') {
    return entries;
  }

  return entries.filter((entry) => entry.source_kind === state.processingLaneFilter);
}

function getProcessingLaneTypeLabel(sourceKind) {
  const labels = {
    queue: '待处理内容',
    thread: '待人工回复',
    review: '问题记录'
  };

  return labels[sourceKind] || translateDisplayValue(sourceKind);
}

function formatProcessingLaneMeta(entry) {
  const parts = [];

  if (entry.source_kind === 'queue') {
    parts.push(cleanClientValue(entry.platform));
    parts.push(cleanClientValue(entry.project));
    if (cleanClientValue(entry.lane_status)) {
      parts.push(`当前状态：${translateDisplayValue(entry.lane_status)}`);
    }
    if (cleanClientValue(entry.handoff_status)) {
      parts.push(`发布准备：${translateDisplayValue(entry.handoff_status)}`);
    }
  } else if (entry.source_kind === 'thread') {
    parts.push(cleanClientValue(entry.platform));
    parts.push('待人工回复');
    if (cleanClientValue(entry.lane_status)) {
      parts.push(`处理状态：${translateDisplayValue(entry.lane_status)}`);
    }
  } else if (entry.source_kind === 'review') {
    parts.push('问题记录');
    if (cleanClientValue(entry.summary)) {
      parts.push(entry.summary);
    }
    if (cleanClientValue(entry.lane_status)) {
      parts.push(`跟进状态：${translateDisplayValue(entry.lane_status)}`);
    }
  }

  if (entry.timestamp_utc) {
    parts.push(formatDate(entry.timestamp_utc));
  }

  return parts.filter(Boolean).join(' · ') || '点击查看详情。';
}

function formatProcessingLaneNote(entry) {
  if (entry.source_kind === 'queue') {
    return entry.note || entry.preview || '打开后可直接处理这条内容。';
  }

  if (entry.source_kind === 'thread') {
    return entry.note || entry.preview || '打开后可查看回复上下文并继续处理。';
  }

  if (entry.source_kind === 'review') {
    return entry.note || entry.preview || '打开后可继续跟进这条问题记录。';
  }

  return entry.note || entry.preview || '点击进入对应工作区。';
}

function formatThreadFlags(record) {
  const flags = [];

  if (record.manual_required) {
    flags.push('需人工判断');
  }

  if (record.has_sensitive_content) {
    flags.push('含敏感内容');
  }

  if (record.handoff_ready) {
    flags.push('已准备交接');
  }

  if (record.blocked_reasons && record.blocked_reasons.length > 0) {
    flags.push('当前阻塞');
  }

  return flags;
}

function getProcessingPriorityClass(priority) {
  if (priority === 'high') {
    return 'tag-status';
  }

  if (priority === 'medium') {
    return 'tag-risk';
  }

  return 'tag-muted';
}

function getSignalSeverityClass(severity) {
  if (severity === 'critical') {
    return 'tag-status';
  }

  if (severity === 'warning') {
    return 'tag-risk';
  }

  return 'tag-muted';
}

function attachNavigationButtons(selector) {
  document.querySelectorAll(selector).forEach((button) => {
    if (button.dataset.selectionBound === 'true') {
      return;
    }

    button.dataset.selectionBound = 'true';
    button.addEventListener('click', () => {
      navigateByTarget(button.dataset.navKind, button.dataset.navId);
    });
  });
}

function renderProcessingLane() {
  if (!elements.processingLaneList) return; // DOM removed in unified layout
  if (!state.data || !state.data.daily_processing_queue) {
    elements.processingLaneMeta.textContent = '';
    elements.processingLaneList.innerHTML = '<div class="empty-state">暂时没有日报待处理。</div>';
    elements.processingLaneFilter.disabled = true;
    return;
  }

  const lane = state.data.daily_processing_queue;
  const filteredEntries = getFilteredProcessingLaneEntries();
  elements.processingLaneFilter.disabled = lane.total_entries === 0;
  elements.processingLaneFilter.value = state.processingLaneFilter;
  elements.processingLaneMeta.textContent = `${filteredEntries.length} / ${lane.total_entries} 条`;
  elements.processingLaneList.innerHTML = filteredEntries.length === 0
    ? '<div class="empty-state">当前范围下没有待处理项。</div>'
    : filteredEntries.map((entry) => {
      const selectedClass = state.laneSelectionId === entry.id ? ' ops-item-selected' : '';

      return `
        <button
          class="ops-item ops-item-button${selectedClass}"
          data-processing-entry="${escapeHtml(entry.id)}"
          data-nav-kind="${escapeHtml(entry.navigation && entry.navigation.kind)}"
          data-nav-id="${escapeHtml(entry.navigation && entry.navigation.target_id)}"
          type="button"
        >
          <div class="ops-item-top">
            <strong>${escapeHtml(entry.title || '未知项目')}</strong>
            <div class="tag-group">
              <span class="tag ${getProcessingPriorityClass(entry.priority)}">${escapeHtml(translateDisplayValue(entry.priority || 'low'))}</span>
              <span class="tag tag-muted">${escapeHtml(getProcessingLaneTypeLabel(entry.source_kind))}</span>
            </div>
          </div>
          <span class="ops-item-meta">${escapeHtml(formatProcessingLaneMeta(entry))}</span>
          <span class="ops-item-note">${escapeHtml(formatProcessingLaneNote(entry))}</span>
        </button>
      `;
    }).join('');

  document.querySelectorAll('[data-processing-entry]').forEach((button) => {
    button.addEventListener('click', () => {
      handleProcessingLaneEntry(button.dataset.navKind, button.dataset.navId, button.dataset.processingEntry);
    });
  });
}

function renderSignalStream() {
  if (!elements.signalStreamList) return; // DOM removed in unified layout
  if (!state.data || !state.data.signal_stream) {
    elements.signalStreamMeta.textContent = '';
    elements.signalStreamList.innerHTML = '<div class="empty-state">暂时没有重要变化。</div>';
    return;
  }

  const signalStream = state.data.signal_stream;
  const entries = Array.isArray(signalStream.entries) ? signalStream.entries : [];
  elements.signalStreamMeta.textContent = `${entries.length} / ${signalStream.total_entries} 条`;
  elements.signalStreamList.innerHTML = entries.length === 0
    ? '<div class="empty-state">暂时没有重要变化。</div>'
    : entries.map((entry) => {
      const hasTarget = entry.navigation && entry.navigation.kind && entry.navigation.target_id;
      const openTag = hasTarget
        ? `<button class="ops-item ops-item-button" data-nav-kind="${escapeHtml(entry.navigation.kind)}" data-nav-id="${escapeHtml(entry.navigation.target_id)}" type="button">`
        : '<article class="ops-item">';
      const closeTag = hasTarget ? '</button>' : '</article>';

      return `
        ${openTag}
          <div class="ops-item-top">
            <strong>${escapeHtml(translateDisplayValue(entry.title || entry.signal_kind || 'unknown'))}</strong>
            <div class="tag-group">
              <span class="tag ${getSignalSeverityClass(entry.severity)}">${escapeHtml(translateDisplayValue(entry.severity || 'info'))}</span>
              <span class="tag tag-muted">${escapeHtml(translateDisplayValue(entry.signal_kind || 'unknown'))}</span>
            </div>
          </div>
          <span class="ops-item-meta">${escapeHtml([
            entry.timestamp_utc ? formatDate(entry.timestamp_utc) : '',
            entry.summary || ''
          ].filter(Boolean).join(' · ') || '—')}</span>
          <span class="ops-item-note">${escapeHtml(
            entry.signal_kind === 'ops_action'
              ? [
                entry.manual_state ? `状态：${getOpsStateLabel(entry.manual_state)}` : '',
                entry.defer_until_utc ? `暂缓到：${formatDate(entry.defer_until_utc)}` : '',
                entry.note || ''
              ].filter(Boolean).join(' · ') || '点击查看详情。'
              : entry.note || '点击查看详情。'
          )}</span>
        ${closeTag}
      `;
    }).join('');

  attachNavigationButtons('[data-nav-kind]');
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
  elements.actionStateFilter.disabled = disabled;
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
    actionId: config.actionId || '',
    kind: config.kind,
    title: config.title,
    subtitle: config.subtitle,
    rows: config.rows || [],
    reviewState: config.reviewState || '',
    reviewOverride: Boolean(config.reviewOverride),
    reviewLastAction: config.reviewLastAction || '',
    reviewNote: config.reviewNote || '',
    reviewDeferUntil: config.reviewDeferUntil || '',
    reviewUpdatedAt: config.reviewUpdatedAt || '',
    reviewUpdatedBy: config.reviewUpdatedBy || '',
    primaryTitle: config.primaryTitle || '原始问题数据',
    secondaryTitle: config.secondaryTitle || '来源信息',
    primaryPayload: config.primaryPayload || null,
    secondaryPayload: config.secondaryPayload || null
  };
}

function getOperationsCatalogMap() {
  const catalog = state.data && Array.isArray(state.data.operations_record_catalog)
    ? state.data.operations_record_catalog
    : [];

  return new Map(catalog.map((record) => [record.ui_id, record]));
}

function getOperationsRecords() {
  if (!state.data || !state.data.operations_review || state.data.operations_review.available === false) {
    return [];
  }

  const operationsReview = state.data.operations_review;
  const catalogByUiId = getOperationsCatalogMap();
  const records = [];

  (operationsReview.reviews.entries || []).forEach((entry, index) => {
    const catalogRecord = catalogByUiId.get(`review:${index}`) || {};
    records.push(createOperationsRecord({
      id: `review:${index}`,
      actionId: catalogRecord.action_id || '',
      kind: 'review',
      title: translateDisplayValue(entry.job || 'Unnamed review'),
      subtitle: [entry.date_yyyy_mm_dd_ || entry.date_yyyy_mm_dd || entry.date || '暂无日期', entry.focus || '暂无重点'].join(' · '),
      reviewState: catalogRecord.review_state || '',
      reviewOverride: catalogRecord.review_override,
      reviewLastAction: catalogRecord.review_last_action || '',
      reviewNote: catalogRecord.review_note || '',
      reviewDeferUntil: catalogRecord.review_defer_until || '',
      reviewUpdatedAt: catalogRecord.review_updated_at || '',
      reviewUpdatedBy: catalogRecord.review_updated_by || '',
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
    const catalogRecord = catalogByUiId.get(`experiment:${index}`) || {};
    records.push(createOperationsRecord({
      id: `experiment:${index}`,
      actionId: catalogRecord.action_id || '',
      kind: 'experiment',
      title: translateDisplayValue(entry.experiment || 'Unnamed experiment'),
      subtitle: [entry.started || '暂无开始日期', translateDisplayValue(entry.job || 'unknown job')].join(' · '),
      reviewState: catalogRecord.review_state || '',
      reviewOverride: catalogRecord.review_override,
      reviewLastAction: catalogRecord.review_last_action || '',
      reviewNote: catalogRecord.review_note || '',
      reviewDeferUntil: catalogRecord.review_defer_until || '',
      reviewUpdatedAt: catalogRecord.review_updated_at || '',
      reviewUpdatedBy: catalogRecord.review_updated_by || '',
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
    const catalogRecord = catalogByUiId.get('feedback:summary') || {};
    records.push(createOperationsRecord({
      id: 'feedback:summary',
      actionId: catalogRecord.action_id || '',
      kind: 'feedback',
      title: `反馈报告 ${operationsReview.feedback.run_date || '最新一期'}`,
      subtitle: `${operationsReview.feedback.summary.total_incidents} 起事件 · ${operationsReview.feedback.summary.user_feedback_signals} 个用户信号`,
      reviewState: catalogRecord.review_state || '',
      reviewOverride: catalogRecord.review_override,
      reviewLastAction: catalogRecord.review_last_action || '',
      reviewNote: catalogRecord.review_note || '',
      reviewDeferUntil: catalogRecord.review_defer_until || '',
      reviewUpdatedAt: catalogRecord.review_updated_at || '',
      reviewUpdatedBy: catalogRecord.review_updated_by || '',
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
    const catalogRecord = catalogByUiId.get(`feedback-cause:${index}`) || {};
    records.push(createOperationsRecord({
      id: `feedback-cause:${index}`,
      actionId: catalogRecord.action_id || '',
      kind: 'feedback_cause',
      title: cause.label || `根因 ${index + 1}`,
      subtitle: `${cause.incidents} 起事件 · ${cause.share}`,
      reviewState: catalogRecord.review_state || '',
      reviewOverride: catalogRecord.review_override,
      reviewLastAction: catalogRecord.review_last_action || '',
      reviewNote: catalogRecord.review_note || '',
      reviewDeferUntil: catalogRecord.review_defer_until || '',
      reviewUpdatedAt: catalogRecord.review_updated_at || '',
      reviewUpdatedBy: catalogRecord.review_updated_by || '',
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
    const catalogRecord = catalogByUiId.get(`handoff:${index}`) || {};
    records.push(createOperationsRecord({
      id: `handoff:${index}`,
      actionId: catalogRecord.action_id || '',
      kind: 'handoff',
      title: record.item_id || `交接记录 ${index + 1}`,
      subtitle: [record.platform || '未知平台', translateDisplayValue(record.status || record.queue_status || 'unknown')].join(' · '),
      reviewState: catalogRecord.review_state || '',
      reviewOverride: catalogRecord.review_override,
      reviewLastAction: catalogRecord.review_last_action || '',
      reviewNote: catalogRecord.review_note || '',
      reviewDeferUntil: catalogRecord.review_defer_until || '',
      reviewUpdatedAt: catalogRecord.review_updated_at || '',
      reviewUpdatedBy: catalogRecord.review_updated_by || '',
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

function getOpsStateLabel(stateKey) {
  const labels = {
    review: '需复核',
    execute: '推进执行',
    defer: '已暂缓',
    done: '已处理'
  };

  return labels[stateKey] || translateDisplayValue(stateKey);
}

function getOpsActionLabel(action) {
  const labels = {
    mark_review: '标记需复核',
    mark_execute: '标记推进执行',
    mark_defer: '标记暂缓',
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

function getOpsStateTagClass(stateKey) {
  if (stateKey === 'done') {
    return 'tag-project';
  }

  if (stateKey === 'defer') {
    return 'tag-risk';
  }

  if (stateKey === 'execute') {
    return 'tag-project';
  }

  return 'tag-status';
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
  state.opsActionFeedback = null;
}

function setFlashMessage(message, tone = 'success') {
  if (flashBannerTimer) {
    window.clearTimeout(flashBannerTimer);
    flashBannerTimer = null;
  }

  state.flashMessage = { message, tone };
  renderFlashBanner();

  flashBannerTimer = window.setTimeout(() => {
    clearFlashBanner();
  }, 5000);
}

function renderFlashBanner() {
  if (!elements.flashBanner) {
    return;
  }

  if (!state.flashMessage) {
    elements.flashBanner.hidden = true;
    elements.flashBanner.textContent = '';
    elements.flashBanner.className = 'flash-banner';
    return;
  }

  elements.flashBanner.textContent = state.flashMessage.message;
  elements.flashBanner.hidden = false;
  elements.flashBanner.className = `flash-banner is-${state.flashMessage.tone}`;
}

function clearFlashBanner() {
  if (flashBannerTimer) {
    window.clearTimeout(flashBannerTimer);
    flashBannerTimer = null;
  }

  state.flashMessage = null;
  renderFlashBanner();
}

function persistActor() {
  try {
    window.localStorage.setItem(ACTOR_STORAGE_KEY, state.actor);
  } catch (_error) {
    // Best effort only.
  }
}

function handleProcessingLaneEntry(kind, targetId, laneId) {
  if (!kind || !targetId) {
    return;
  }

  state.laneSelectionId = laneId;
  clearActionFeedback();
  state.activeSection = 'operations';

  if (kind === 'queue') {
    state.detailMode = 'queue';
    state.selectedId = targetId;
    state.selectedThreadId = null;
    state.selectedOpsRecordId = null;
  } else if (kind === 'thread') {
    state.detailMode = 'thread';
    state.selectedThreadId = targetId;
    state.selectedId = null;
    state.selectedOpsRecordId = null;
  } else if (kind === 'ops') {
    state.detailMode = 'ops';
    state.selectedOpsRecordId = targetId;
    state.selectedId = null;
    state.selectedThreadId = null;
  } else {
    return;
  }

  renderWorkspaceSections();
  renderDetailForCurrentMode('当前筛选条件下没有匹配项目。');
}

function syncActorInputs() {
  elements.detailActionActor.value = state.actor;
}

function setInputLabelVisibility(inputElement, visible) {
  const label = inputElement && inputElement.closest('label');

  if (!label) {
    return;
  }

  label.hidden = !visible;
}

function toDatetimeLocalValue(value) {
  const raw = cleanClientValue(value);

  if (!raw) {
    return '';
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const offsetDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function readDeferUntilInput(inputElement) {
  if (!inputElement) {
    return '';
  }

  const raw = inputElement.value ? inputElement.value.trim() : '';

  if (!raw) {
    return '';
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('暂缓时间格式无效。');
  }

  return parsed.toISOString();
}

function syncDeferInputs() {
  const showDetailDefer = state.detailDeferMode === 'queue' || state.detailDeferMode === 'ops';
  setInputLabelVisibility(elements.detailActionDeferUntil, showDetailDefer);
  if (!showDetailDefer) {
    elements.detailActionDeferUntil.value = '';
  }
}

function requireDeferUntil(scope, feedbackSetter, renderFn, inputElement, modeKey, message) {
  const value = inputElement && inputElement.value ? inputElement.value.trim() : '';

  if (value) {
    return true;
  }

  if (scope === 'detail') {
    state.detailDeferMode = modeKey;
  }

  if (scope === 'batch') {
    // batch removed
  }

  feedbackSetter({
    tone: 'error',
    message
  });
  syncDeferInputs();
  renderFn();
  inputElement.focus();
  return false;
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

  // Since workspace highlights is dynamically generated, we update active states on next tick
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-section-jump]').forEach((button) => {
      const isActive = button.dataset.sectionJump === state.activeSection;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
  });
}

function syncSectionContext(section) {
  if (!state.data) {
    return;
  }

  if (section === 'overview') {
    state.selectedThreadId = null;
    state.selectedOpsRecordId = null;
    clearActionFeedback();
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
  const processingLane = state.data.daily_processing_queue || {};
  const threads = opsSnapshot.modules && opsSnapshot.modules.threads ? opsSnapshot.modules.threads : null;

  const cards = [
    {
      section: 'queue',
      title: '主操作台',
      value: `${summary.approval_pending_items || 0} 待审 · ${summary.ready_to_execute_count || 0} 可继续`
    },
    {
      section: 'operations',
      title: '异常拦截',
      value: operationsReview.available === false
        ? '不可用'
        : `${processingLane.high_priority_count || 0} 条拦阻`
    },
    {
      section: 'pipeline',
      title: '机器接管',
      value: `${threads ? threads.needs_reply_count : 0} 待人工流转`
    },
    {
      section: 'overview',
      title: '数据大屏',
      value: `${summary.total_items || 0} 全局水位`
    }
  ];

  const highlightMarkup = cards
    .map((card) => {
      const isActive = card.section === state.activeSection ? 'is-active' : '';
      return `
        <button class="workspace-highlight ${isActive}" data-section-jump="${escapeHtml(card.section)}" type="button">
          <span class="wh-title">${escapeHtml(card.title)}</span>
          <strong class="wh-value">${escapeHtml(card.value)}</strong>
        </button>
      `;
    })
    .join('');

  elements.workspaceHighlights.innerHTML = highlightMarkup;

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
  const operationsRecords = getOperationsRecords();
  const operationsRecordById = new Map(operationsRecords.map((record) => [record.id, record]));
  const reviews = operationsReview.reviews.entries || [];
  const experiments = operationsReview.experiments.entries || [];
  const feedback = operationsReview.feedback;
  const postHandoffs = operationsReview.post_handoffs;

  if (operationsReview.available === false) {
    elements.operationsUnifiedMeta.textContent = '不可用';
    elements.operationsUnifiedList.innerHTML = createOpsIssueMarkup(operationsReview.issues, '问题记录数据暂时不可用。');
    return;
  }

  const createOpsButton = (record, actionTypeLabel, actionTypeClass, title, meta, note, displayState) => {
    const selectedClass = selectedOpsRecord && record && selectedOpsRecord.id === record.id ? ' ops-item-selected' : '';
    const stateHtml = displayState ? `<span class="tag ${getOpsStateTagClass(displayState)}">${escapeHtml(getOpsStateLabel(displayState))}</span>` : '';

    return `
      <button class="ops-item ops-item-button${selectedClass}" data-ops-record-id="${escapeHtml(record ? record.id : '')}" type="button">
        <div class="ops-item-top">
          <strong>${escapeHtml(title)}</strong>
          <div class="tag-group">
            <span class="tag ${actionTypeClass}">${escapeHtml(actionTypeLabel)}</span>
            ${stateHtml}
          </div>
        </div>
        <span class="ops-item-meta">${escapeHtml(meta)}</span>
        <span class="ops-item-note">${escapeHtml(note)}</span>
      </button>
    `;
  };

  const listItems = [];

  // Feedback summary & root causes
  if (feedback.path) {
    listItems.push(createOpsButton(
      operationsRecordById.get('feedback:summary') || null,
      '系统异常', 'tag-risk',
      `${feedback.summary.total_incidents} 起异常拦截`,
      `${feedback.summary.session_errors} 会话阻塞 · ${feedback.summary.gateway_errors} 网关报错 · ${feedback.summary.user_feedback_signals} 用户信号`,
      '点击查看完整反馈池与来源路径。'
    ));

    (feedback.root_causes || []).forEach((cause, index) => {
      const record = operationsRecordById.get(`feedback-cause:${index}`) || null;
      listItems.push(createOpsButton(
        record,
        '反馈洞察', 'tag-risk',
        `${cause.incidents} 起事件反馈 (${cause.share})`,
        cause.example || '系统归因分析结果',
        (record && record.reviewNote) || '点击查看应对措施。',
        record && record.reviewState
      ));
    });
  }

  // Reviews
  reviews.forEach((entry, index) => {
    const record = operationsRecordById.get(`review:${index}`) || null;
    listItems.push(createOpsButton(
      record,
      '质检拦截', 'tag-status',
      translateDisplayValue(entry.status || 'unknown'),
      `${entry.date_yyyy_mm_dd_ || entry.date_yyyy_mm_dd || entry.date || '暂无日期'} · ${entry.focus || '暂无重点'} · 负责人 ${translateDisplayValue(entry.follow_up_owner || 'unassigned')}`,
      [record && record.reviewDeferUntil ? `暂缓到 ${formatDate(record.reviewDeferUntil)}` : '', record && record.reviewNote ? record.reviewNote : '', entry.blocker_notes].filter(Boolean)[0] || '点击处理重点项目任务。',
      record && record.reviewState
    ));
  });

  // Handoffs
  if (postHandoffs.records && postHandoffs.records.length > 0) {
    postHandoffs.records.forEach((record, index) => {
      const opsRecord = operationsRecordById.get(`handoff:${index}`) || null;
      const blockedReasons = record.blocked_reasons && record.blocked_reasons.length > 0 ? translateValueList(record.blocked_reasons).join('，') : '点击检查配置';
      
      listItems.push(createOpsButton(
        opsRecord,
        '交接拦截', 'tag-status',
        translateDisplayValue(record.status || record.queue_status || 'unknown'),
        `${record.platform || '未知平台'} · ${record.target_url || '无目标 URL'}`,
        [opsRecord && opsRecord.reviewDeferUntil ? `暂缓到 ${formatDate(opsRecord.reviewDeferUntil)}` : '', opsRecord && opsRecord.reviewNote ? opsRecord.reviewNote : '', blockedReasons].filter(Boolean)[0] || blockedReasons,
        opsRecord && opsRecord.reviewState
      ));
    });
  }

  // Experiments
  experiments.forEach((entry, index) => {
    const record = operationsRecordById.get(`experiment:${index}`) || null;
    listItems.push(createOpsButton(
      record,
      '机器试验', 'tag-project',
      translateDisplayValue(entry.status || 'unknown'),
      `${entry.started || '暂无开始日期'} · ${translateDisplayValue(entry.job || 'unknown job')}`,
      [record && record.reviewDeferUntil ? `暂缓到 ${formatDate(record.reviewDeferUntil)}` : '', record && record.reviewNote ? record.reviewNote : '', entry.next_step || entry.hypothesis].filter(Boolean)[0] || '探索性作业执行中',
      record && record.reviewState
    ));
  });

  const totalRecords = reviews.length + experiments.length + (postHandoffs.records || []).length + (feedback.root_causes || []).length + (feedback.path ? 1 : 0);
  elements.operationsUnifiedMeta.textContent = `${totalRecords} 项异常拦截记录需人工介入`;
  
  elements.operationsUnifiedList.innerHTML = listItems.length > 0 ? listItems.join('') : '<div class="empty-state">当前没有任何拦截异常，系统健康度良好。</div>';

  attachOpsRecordSelection();
}

function renderOpsSnapshot() {
  const opsSnapshot = state.data.ops_snapshot || {};
  const modules = opsSnapshot.modules || {};
  const supervisor = modules.supervisor || null;
  const metrics = modules.metrics || null;
  const posts = modules.posts || null;
  const replies = modules.replies || null;
  const fill = modules.fill || null;
  const threads = modules.threads || null;
  const warnings = Array.isArray(opsSnapshot.warnings) ? opsSnapshot.warnings : [];
  const threadRecords = threads && Array.isArray(threads.records) ? threads.records : [];
  const filteredThreadRecords = threads ? getFilteredThreadRecords() : [];

  elements.pipelineUnifiedMeta.textContent = [
    posts && posts.run_date ? `发帖 ${posts.run_date}` : '',
    fill && fill.run_date ? `填充 ${fill.run_date}` : '',
    replies && replies.run_date ? `回复 ${replies.run_date}` : ''
  ].filter(Boolean).join(' · ') || opsSnapshot.latest_run_date || '暂无运行记录';

  elements.threadInboxFilter.disabled = !threads || threadRecords.length === 0;
  elements.threadInboxFilter.value = state.threadInboxFilter;

  if (!opsSnapshot.available) {
    const fallbackMarkup = warnings.length > 0
      ? createOpsIssueMarkup(warnings, '暂未找到可用的自动执行记录。')
      : '<div class="empty-state">暂未找到可用的自动执行记录。</div>';
    elements.pipelineUnifiedList.innerHTML = fallbackMarkup;
    return;
  }

  const listItems = [];

  // =====================
  // 1. System Health
  // =====================
  if (supervisor) {
    const failingSteps = supervisor.failing_steps && supervisor.failing_steps.length > 0
      ? supervisor.failing_steps.map((step) => `${step.name}（${translateDisplayValue(step.status)}）`).join('，')
      : '无异常步骤。';

    listItems.push(`
      <article class="ops-item">
        <div class="ops-item-top">
          <strong>自动流程运行</strong>
          <div class="tag-group">
            <span class="tag tag-muted">监控器</span>
            <span class="tag ${getStatusTagClass(supervisor.run_status)}">${escapeHtml(formatOpsValue(supervisor.run_status))}</span>
          </div>
        </div>
        <span class="ops-item-meta">${escapeHtml(formatOpsPairs([['日期', supervisor.run_date], ['演练', supervisor.dry_run ? 'yes' : 'no']]))}</span>
        <span class="ops-item-note">${escapeHtml(failingSteps)}</span>
      </article>
    `);
  }

  if (metrics) {
    listItems.push(`
      <article class="ops-item">
        <div class="ops-item-top">
          <strong>大盘指标</strong>
          <div class="tag-group">
            <span class="tag tag-muted">系统指标</span>
            <span class="tag ${getStatusTagClass(metrics.overall_status)}">${escapeHtml(formatOpsValue(metrics.overall_status))}</span>
          </div>
        </div>
        <span class="ops-item-meta">${escapeHtml(formatOpsPairs([['KV', metrics.kv_status], ['Paddle', metrics.paddle_status], ['分析', metrics.analytics_status]]))}</span>
        <span class="ops-item-note">${escapeHtml(formatOpsPairs([['KV 条目', metrics.kv_entries], ['用户数', metrics.analytics_users]]))}</span>
      </article>
    `);
  }

  // =====================
  // 2. Automated Execution Syncs
  // =====================
  if (posts) {
    listItems.push(`
      <article class="ops-item">
        <div class="ops-item-top">
          <strong>发帖准备情况</strong>
          <div class="tag-group">
            <span class="tag tag-muted">生产线</span>
            <span class="tag ${getStatusTagClass(posts.ready_for_browser_review_count > 0 ? 'ready' : 'warning')}">${escapeHtml(formatOpsValue(posts.mode))}</span>
          </div>
        </div>
        <span class="ops-item-meta">就绪：${posts.ready_for_browser_review_count} · 新生成：${posts.generated_count} · 错误：${posts.error_count}</span>
        <span class="ops-item-note">缺少目标 URL：${posts.missing_target_url_count}</span>
      </article>
    `);
  }

  if (fill) {
    listItems.push(`
      <article class="ops-item">
        <div class="ops-item-top">
          <strong>自动表单填写</strong>
          <div class="tag-group">
            <span class="tag tag-muted">生产线</span>
            <span class="tag ${getStatusTagClass(fill.cdp_status)}">${escapeHtml(formatOpsValue(fill.cdp_status))}</span>
          </div>
        </div>
        <span class="ops-item-meta">发帖（就绪 ${fill.posts.ready} / 待审 ${fill.posts.approval_pending} / 阻塞 ${fill.posts.blocked}）</span>
        <span class="ops-item-note">回复（就绪 ${fill.replies.ready} / 待审 ${fill.replies.approval_pending} / 阻塞 ${fill.replies.blocked}）</span>
      </article>
    `);
  }

  // =====================
  // 3. Thread Inbox (Actionable Items)
  // =====================
  if (threads && !filteredThreadRecords.some((record) => record.reply_id === state.selectedThreadId)) {
    state.selectedThreadId = filteredThreadRecords[0] ? filteredThreadRecords[0].reply_id : null;
  }

  if (filteredThreadRecords.length > 0) {
    filteredThreadRecords.forEach((record) => {
      const flags = [...formatThreadFlags(record)];
      const selectedClass = state.detailMode === 'thread' && state.selectedThreadId === record.reply_id
        ? ' ops-item-selected'
        : '';

      listItems.push(`
        <button class="ops-item ops-item-button${selectedClass}" data-thread-id="${escapeHtml(record.reply_id || '')}" type="button">
          <div class="ops-item-top">
            <strong>${escapeHtml(record.reply_id || '未知回复')}</strong>
             <div class="tag-group">
              <span class="tag tag-muted">回复流</span>
              <span class="tag ${getThreadStateTagClass(record.review_state)}">${escapeHtml(getThreadStateLabel(record.review_state))}</span>
            </div>
          </div>
          <span class="ops-item-meta">${escapeHtml(formatOpsPairs([['平台', record.platform], ['时间', formatDate(record.created_at)], ['来源', getProcessingLaneTypeLabel(record.source_kind)]]))}</span>
          <span class="ops-item-note">${escapeHtml(record.blocked_reasons && record.blocked_reasons.length > 0 ? translateValueList(record.blocked_reasons).join('，') : record.review_note || record.draft_preview || '暂无草稿预览。')}</span>
        </button>
      `);
    });
  } else if (threads && threadRecords.length > 0) {
    listItems.push('<div class="empty-state" style="padding: 24px;">当前筛选下没有匹配的回复任务。</div>');
  } else {
    listItems.push('<div class="empty-state" style="padding: 24px;">当前还没有需要人工处理的回复任务。</div>');
  }

  elements.pipelineUnifiedList.innerHTML = listItems.join('');
  attachThreadSelection();
}
function renderSummary() {
  const summary = state.data.summary;
  const cards = [
    { label: '待补审批记录', value: summary.pending_approvals, note: '审批记录表口径' },
    { label: '已进入队列', value: summary.queued_items, note: '内容列表口径' },
    { label: '覆盖平台', value: summary.platform_count, note: '涉及平台数量' },
    { label: '状态类型', value: summary.status_count, note: '当前状态种类' }
  ];

  elements.summaryCards.innerHTML = cards
    .map((card) => {
      return `
        <article class="summary-card">
          <p>${escapeHtml(card.label)}</p>
          <strong>${escapeHtml(card.value)}</strong>
          <span class="summary-card-note">${escapeHtml(card.note)}</span>
        </article>
      `;
    })
    .join('');
}

function getQueueListPrimaryMeta(item) {
  return [
    cleanClientValue(item.platform) || '未知平台',
    cleanClientValue(item.project) || '',
    cleanClientValue(item.action_label || item.action_state)
      ? `当前：${translateDisplayValue(item.action_label || item.action_state)}`
      : ''
  ].filter(Boolean).join(' · ');
}

function getQueueListNote(item) {
  const sourcePreview = cleanClientValue(item.source_details && item.source_details.preview)
    .split(/\r?\n/)
    .find((line) => cleanClientValue(line));

  if (item.missing_info && item.missing_info.length > 0) {
    return `缺失：${translateMissingInfoList(item.missing_info).join('，')}`;
  }

  return cleanClientValue(item.review_note)
    || cleanClientValue(item.reason)
    || cleanClientValue(item.notes)
    || sourcePreview
    || '打开后查看详情并直接处理。';
}

function renderFilters() {
  const { statuses, platforms, projects, risks, action_states } = state.data.filters;
  createOptions(elements.projectFilter, projects, state.filters.project);
  createOptions(elements.statusFilter, statuses, state.filters.status);
  createOptions(elements.actionStateFilter, action_states || [], state.filters.action_state);
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
  state.filters.action_state = 'all';
  state.filters.platform = 'all';
  state.filters.risk = 'all';
  state.filters.search = '';
  state.inboxTab = 'pending';
  renderFilters();
  elements.searchInput.value = '';
  renderInboxTabBar();
}

function handleFilterReset() {
  if (!state.data) {
    return;
  }

  clearActionFeedback();
  resetQueueFilters();
  renderList();
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

function navigateToThread(replyId) {
  if (!getThreadRecords().some((record) => record.reply_id === replyId)) {
    return;
  }

  clearActionFeedback();
  state.detailMode = 'thread';
  state.selectedThreadId = replyId;
  state.selectedOpsRecordId = null;
  setActiveSection('pipeline', { syncContext: false });
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

function navigateByTarget(kind, targetId) {
  if (kind === 'queue') {
    navigateToQueueItem(targetId, { resetFilters: true });
    return;
  }

  if (kind === 'thread') {
    navigateToThread(targetId);
    return;
  }

  if (kind === 'ops') {
    navigateToOpsRecord(targetId);
  }
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
    missing_info: items.filter((item) => item.action_state === 'missing_info'),
    deferred: items.filter((item) => item.action_state === 'deferred')
  };

  elements.needsReviewCount.textContent = String(buckets.needs_review.length);
  elements.readyToExecuteCount.textContent = String(buckets.ready_to_execute.length);
  elements.needsInfoCount.textContent = String(buckets.missing_info.length);
  elements.deferredCount.textContent = String(buckets.deferred.length);

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
  elements.deferredList.innerHTML = createBucketMarkup(
    buckets.deferred,
    '当前没有已暂缓的内容。'
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

  if (action === 'mark_deferred') {
    return item.action_state !== 'deferred';
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



function renderActionLogPanel(target) {
  if (!target || !state.data) {
    elements.actionLogPanel.hidden = true;
    elements.actionLogMeta.textContent = '';
    elements.actionLogList.innerHTML = '';
    return;
  }

  const isQueueMode = state.detailMode === 'queue';
  const isThreadMode = state.detailMode === 'thread';
  const isOpsMode = state.detailMode === 'ops';
  const actionLog = isQueueMode
    ? state.data.action_log
    : isThreadMode
      ? state.data.thread_action_log
      : isOpsMode
        ? state.data.ops_action_log
        : null;

  if (!actionLog) {
    elements.actionLogPanel.hidden = true;
    elements.actionLogMeta.textContent = '';
    elements.actionLogList.innerHTML = '';
    return;
  }

  const entries = isQueueMode
    ? (actionLog.entries || []).filter((entry) => entry.item_id === target.id).slice(0, 5)
    : isThreadMode
      ? (actionLog.entries || []).filter((entry) => entry.reply_id === target.reply_id).slice(0, 5)
      : (actionLog.entries || []).filter((entry) => entry.ui_id === target.id || entry.action_id === target.actionId).slice(0, 5);

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

        if (isQueueMode && entry.defer_until_utc) {
          noteParts.push(`暂缓至：${formatDate(entry.defer_until_utc)}`);
        }

        if (isOpsMode && entry.manual_state) {
          noteParts.push(`状态：${getOpsStateLabel(entry.manual_state)}`);
        }

        if (isOpsMode && entry.defer_until_utc) {
          noteParts.push(`暂缓至：${formatDate(entry.defer_until_utc)}`);
        }

        return `
          <article class="ops-item">
            <div class="ops-item-top">
              <strong>${escapeHtml(isOpsMode ? getOpsActionLabel(entry.action || 'unknown') : translateDisplayValue(entry.action || 'unknown'))}</strong>
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

    const actionStateMatch = state.filters.action_state === 'all'
      || cleanClientValue(item.action_state) === state.filters.action_state;

    return projectMatch && statusMatch && platformMatch && riskMatch && searchMatch && actionStateMatch && matchesInboxTab(item);
  });
}

function renderList() {
  if (!state.data) {
    elements.resultCount.textContent = '0 / 0';
    elements.listMeta.textContent = '数据源诊断';
    elements.itemList.innerHTML = '<div class="empty-state">看板数据暂时不可用。</div>';
    renderManagementBuckets([]);
    renderDetail(null, 'queue', '看板数据暂时不可用。');
    return;
  }

  const filteredItems = getFilteredItems();
  const totalItems = state.data.items.length;

  elements.resultCount.textContent = `${filteredItems.length} / ${totalItems}`;
  elements.listMeta.textContent = `内容日期 ${state.data.metadata.queue_run_date || '—'}`;
  renderInboxTabBar();
  attachInboxTabListeners();
  renderManagementBuckets(state.data.items);


  if (!filteredItems.some((item) => item.id === state.selectedId)) {
    state.selectedId = filteredItems[0] ? filteredItems[0].id : null;
  }

  if (filteredItems.length === 0) {
    elements.itemList.innerHTML = '<div class="empty-state">当前筛选条件下没有匹配项目。</div>';
    renderDetailForCurrentMode('当前筛选条件下没有匹配项目。');
    renderOpsSnapshot();
    return;
  }
  const previousScrollTop = elements.itemList.scrollTop;

  elements.itemList.innerHTML = filteredItems
    .map((item) => {
      const selectedClass = state.detailMode === 'queue' && item.id === state.selectedId ? ' item-row-selected' : '';
      const approvalTag = item.approval_match ? '<span class="tag tag-muted">已匹配审核</span>' : '';
      const projectTag = item.project ? `<span class="tag tag-muted">${escapeHtml(item.project)}</span>` : '';

      return `
        <button class="item-row${selectedClass}" data-item-id="${escapeHtml(item.id)}" data-item-source="list" type="button">
          <div class="item-row-top" style="display: block; margin-bottom: 8px;">
            <strong style="display: block; font-size: 14px; margin-bottom: 6px;">${escapeHtml(item.title)}</strong>
            <div class="tag-group">
              <span class="tag tag-status">${escapeHtml(translateDisplayValue(item.action_label || item.action_state || item.status))}</span>
              ${projectTag}
              <span class="tag tag-muted">${escapeHtml(item.platform || '未知平台')}</span>
              ${approvalTag}
            </div>
          </div>
          <div class="item-row-meta">
            <span style="color: #64748b; line-height: 1.4;">${escapeHtml(getQueueListNote(item))}</span>
          </div>
        </button>
      `;
    })
    .join('');

  const selectedItem = filteredItems.find((item) => item.id === state.selectedId) || filteredItems[0];
  attachBucketSelection();
  
  // Restore scroll position to prevent jitter
  requestAnimationFrame(() => {
    elements.itemList.scrollTop = previousScrollTop;
  });
  
  renderDetailForCurrentMode('当前还没有可展示的详情。', selectedItem);
  renderOpsSnapshot();
}

function renderThreadActionPanel(thread) {
  const isPending = state.threadPending || state.actionPending || state.opsPending;
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
  state.detailDeferMode = '';
  elements.detailActionDeferUntil.disabled = true;
  elements.detailActionDeferUntil.value = '';
  syncDeferInputs();
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

function renderOpsActionPanel(record) {
  const isPending = state.opsPending || state.actionPending || state.threadPending;
  const buttons = [];

  if (record.reviewState !== 'review') {
    buttons.push({ action: 'mark_review', label: '标记需复核', className: 'button button-danger' });
  }

  if (record.reviewState !== 'execute') {
    buttons.push({ action: 'mark_execute', label: '标记推进执行', className: 'button button-primary' });
  }

  if (record.reviewState !== 'defer') {
    buttons.push({ action: 'mark_defer', label: '标记暂缓', className: 'button' });
  }

  if (record.reviewState !== 'done') {
    buttons.push({ action: 'mark_done', label: '标记已处理', className: 'button' });
  }

  if (record.reviewOverride) {
    buttons.push({ action: 'restore_auto', label: '恢复系统判断', className: 'button' });
  }

  elements.detailActionPanel.hidden = false;
  elements.detailActionActor.value = state.actor;
  elements.detailActionActor.disabled = isPending;
  elements.detailActionNote.disabled = isPending;
  state.detailDeferMode = record.reviewState === 'defer' ? 'ops' : '';
  elements.detailActionDeferUntil.disabled = isPending;
  elements.detailActionDeferUntil.value = toDatetimeLocalValue(record.reviewDeferUntil);
  syncDeferInputs();
  elements.detailActionBar.innerHTML = buttons.length > 0
    ? buttons
      .map((button) => {
        return `
          <button
            class="${button.className}"
            data-ops-action="${escapeHtml(button.action)}"
            type="button"
            ${isPending ? 'disabled' : ''}
          >
            ${escapeHtml(button.label)}
          </button>
        `;
      })
      .join('')
    : '<div class="empty-state">当前记录没有可用动作。</div>';

  if (state.opsActionFeedback && state.opsActionFeedback.recordId === record.id) {
    elements.detailActionStatus.textContent = state.opsActionFeedback.message;
    elements.detailActionStatus.className = `detail-action-status is-${state.opsActionFeedback.tone}`;
  } else {
    elements.detailActionStatus.textContent = '';
    elements.detailActionStatus.className = 'detail-action-status';
  }

  document.querySelectorAll('[data-ops-action]').forEach((button) => {
    button.addEventListener('click', () => {
      runOpsAction(button.dataset.opsAction);
    });
  });
}

function renderActionPanel(item) {
  if (!item) {
    elements.detailActionPanel.hidden = true;
    elements.detailActionBar.innerHTML = '';
    elements.detailActionStatus.textContent = '';
    elements.detailActionStatus.className = 'detail-action-status';
    state.detailDeferMode = '';
    elements.detailActionDeferUntil.value = '';
    syncDeferInputs();
    return;
  }

  if (state.detailMode === 'thread') {
    renderThreadActionPanel(item);
    return;
  }

  if (state.detailMode === 'ops') {
    renderOpsActionPanel(item);
    return;
  }

  if (state.detailMode !== 'queue') {
    elements.detailActionPanel.hidden = true;
    elements.detailActionBar.innerHTML = '';
    elements.detailActionStatus.textContent = '';
    elements.detailActionStatus.className = 'detail-action-status';
    state.detailDeferMode = '';
    elements.detailActionDeferUntil.value = '';
    syncDeferInputs();
    return;
  }

  const isPending = state.actionPending || state.threadPending || state.opsPending;
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

  if (item.action_state !== 'deferred') {
    buttons.push({ action: 'mark_deferred', label: '标记暂缓', className: 'button' });
  }

  if (item.review_override) {
    buttons.push({ action: 'restore_auto', label: '恢复自动判断', className: 'button' });
  }

  elements.detailActionPanel.hidden = false;
  elements.detailActionActor.value = state.actor;
  elements.detailActionActor.disabled = isPending;
  elements.detailActionNote.disabled = isPending;
  state.detailDeferMode = item.action_state === 'deferred' ? 'queue' : '';
  elements.detailActionDeferUntil.disabled = isPending;
  elements.detailActionDeferUntil.value = toDatetimeLocalValue(item.review_defer_until);
  syncDeferInputs();
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
  elements.detailTitle.textContent = item.title || '内容详情';
  elements.detailSubtitle.textContent = `${escapeHtml(item.platform || '')}${item.project ? ' · ' + item.project : ''}`.trim() || '待审核内容';
  elements.primaryJsonTitle.textContent = '原始内容';
  elements.secondaryJsonTitle.textContent = '原始审核';

  // ---- CORE: The content itself ----
  const coreLines = [];
  if (item.title) coreLines.push(`<p class="insight-headline">${escapeHtml(item.title)}</p>`);
  if (item.notes) coreLines.push(`<p class="insight-body">${escapeHtml(item.notes)}</p>`);
  if (item.reason) coreLines.push(`<p class="insight-body insight-muted">审核原因：${escapeHtml(item.reason)}</p>`);
  const hasCoreContent = coreLines.length > 0;
  elements.detailInsightCore.style.display = hasCoreContent ? '' : 'none';
  elements.detailInsightCore.innerHTML = hasCoreContent
    ? `<div class="insight-label">内容本体</div>${coreLines.join('')}`
    : '';

  // ---- DIAGNOSIS: AI flags / risk / missing info ----
  const diagLines = [];
  if (item.risk && item.risk !== 'none') {
    diagLines.push(`<div class="insight-flag flag-${item.risk === 'high' ? 'danger' : 'warn'}">风险：${escapeHtml(translateDisplayValue(item.risk))}</div>`);
  }
  if (item.missing_info && item.missing_info.length) {
    diagLines.push(`<div class="insight-flag flag-warn">缺失资料：${escapeHtml(translateMissingInfoList(item.missing_info).join('，'))}</div>`);
  }
  const statusVal = translateDisplayValue(item.action_label || item.action_state);
  if (statusVal) diagLines.push(`<div class="insight-flag flag-info">当前状态：${escapeHtml(statusVal)}</div>`);
  const hasDiag = diagLines.length > 0;
  elements.detailInsightDiagnosis.style.display = hasDiag ? '' : 'none';
  elements.detailInsightDiagnosis.innerHTML = hasDiag
    ? `<div class="insight-label">审核诊断</div>${diagLines.join('')}`
    : '';

  // ---- METADATA: Audit trail details ----
  const metaRows = [
    ['平台', item.platform],
    ['项目', item.project],
    ['分类', translateDisplayValue(item.category)],
    ['负责人', translateDisplayValue(item.owner)],
    ['提交人', item.requested_by],
    ['提交时间', formatDate(item.requested_at)],
    ['审核单号', item.approval_ticket],
    ['记录号', item.approval_entry_id],
    ['处理人', item.review_updated_by],
    ['处理时间', formatDate(item.review_updated_at)],
    ['暂缓到', formatDate(item.review_defer_until)],
    ['处理备注', item.review_note]
  ].filter(([, v]) => v && v !== '—');
  elements.detailInsightMetadata.innerHTML = metaRows.length
    ? `<div class="insight-meta-grid">${metaRows.map(([l, v]) => `<div class="meta-pair"><span>${escapeHtml(l)}</span><strong>${escapeHtml(v)}</strong></div>`).join('')}</div>`
    : '';

  elements.queueJson.textContent = JSON.stringify(item.raw.queue, null, 2);
  elements.approvalJson.textContent = item.raw.approval
    ? JSON.stringify(item.raw.approval, null, 2)
    : '没有匹配到审核记录。';

  const contextActions = [];
  const linkedHandoffRecord = getLinkedHandoffRecordForQueueItem(item);
  if (linkedHandoffRecord) {
    contextActions.push({ kind: 'nav', label: '查看待自动发布记录', target: `ops:${linkedHandoffRecord.id}` });
    if (isHttpUrl(linkedHandoffRecord.primaryPayload && linkedHandoffRecord.primaryPayload.target_url)) {
      contextActions.push({ kind: 'link', label: '打开目标 URL', href: linkedHandoffRecord.primaryPayload.target_url });
    }
  }

  renderContextPanel(contextActions);
  renderActionLogPanel(item);
  renderActionPanel(item);
  renderSourcePreview(item.source_details || null);
}

function renderThreadDetail(thread) {
  elements.detailTitle.textContent = thread.reply_id || '回复任务详情';
  elements.detailSubtitle.textContent = `${thread.platform || ''}${thread.channel_name ? ' · ' + thread.channel_name : ''}`.trim() || '自动回复任务';
  elements.primaryJsonTitle.textContent = '回复任务数据';
  elements.secondaryJsonTitle.textContent = '自动执行步骤';

  // ---- CORE: Draft preview (the actual reply text) ----
  const hasDraft = !!thread.draft_preview;
  elements.detailInsightCore.style.display = hasDraft ? '' : 'none';
  elements.detailInsightCore.innerHTML = hasDraft
    ? `<div class="insight-label">回复草稿预览</div><p class="insight-body">${escapeHtml(thread.draft_preview)}</p>`
    : '';

  // ---- DIAGNOSIS: Why it's blocked / needs human ----
  const diagLines = [];
  if (thread.blocked_reasons && thread.blocked_reasons.length > 0) {
    diagLines.push(`<div class="insight-flag flag-danger">阻塞原因：${escapeHtml(translateValueList(thread.blocked_reasons).join('，'))}</div>`);
  }
  if (thread.has_sensitive_content) diagLines.push(`<div class="insight-flag flag-warn">⚠️ 包含敏感内容</div>`);
  if (thread.manual_required || thread.needs_manual_review) diagLines.push(`<div class="insight-flag flag-warn">需要人工判断</div>`);
  const bucket = thread.classification_bucket;
  const score = thread.classification_score;
  if (bucket) diagLines.push(`<div class="insight-flag flag-info">AI 分类：${escapeHtml(bucket)}${score != null ? ` (评分 ${score})` : ''}</div>`);
  const stateLabel = getThreadStateLabel(thread.review_state);
  if (stateLabel) diagLines.push(`<div class="insight-flag flag-info">当前状态：${escapeHtml(stateLabel)}</div>`);
  const hasDiag = diagLines.length > 0;
  elements.detailInsightDiagnosis.style.display = hasDiag ? '' : 'none';
  elements.detailInsightDiagnosis.innerHTML = hasDiag
    ? `<div class="insight-label">机器诊断</div>${diagLines.join('')}`
    : '';

  // ---- METADATA ----
  const metaRows = [
    ['平台', thread.platform],
    ['频道', thread.channel_name],
    ['运行日期', thread.run_date],
    ['创建时间', formatDate(thread.created_at)],
    ['来源形式', translateDisplayValue(thread.source_kind)],
    ['审核单号', thread.approval_ticket],
    ['处理人', thread.review_updated_by],
    ['处理时间', formatDate(thread.review_updated_at)],
    ['处理备注', thread.review_note]
  ].filter(([, v]) => v && v !== '—');
  elements.detailInsightMetadata.innerHTML = metaRows.length
    ? `<div class="insight-meta-grid">${metaRows.map(([l, v]) => `<div class="meta-pair"><span>${escapeHtml(l)}</span><strong>${escapeHtml(v)}</strong></div>`).join('')}</div>`
    : '';

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
  elements.detailSubtitle.textContent = record.subtitle || '运营异常拦截记录';
  elements.primaryJsonTitle.textContent = record.primaryTitle || '原始问题数据';
  elements.secondaryJsonTitle.textContent = record.secondaryTitle || '来源信息';

  // ---- CORE: Primary descriptive content ----
  const primaryRows = (record.rows || []).filter(([l]) => !['当前处理状态','人工覆盖','最后动作','暂缓到','处理备注','处理人','处理时间'].includes(l));
  const hasCoreRows = primaryRows.length > 0;
  elements.detailInsightCore.style.display = hasCoreRows ? '' : 'none';
  elements.detailInsightCore.innerHTML = hasCoreRows
    ? `<div class="insight-label">记录内容</div><div class="insight-meta-grid">${primaryRows.map(([l, v]) => `<div class="meta-pair"><span>${escapeHtml(l)}</span><strong>${escapeHtml(String(v || '—'))}</strong></div>`).join('')}</div>`
    : '';

  // ---- DIAGNOSIS: Status/action state ----
  const diagLines = [];
  if (record.reviewState) diagLines.push(`<div class="insight-flag flag-info">当前状态：${escapeHtml(getOpsStateLabel(record.reviewState))}</div>`);
  if (record.reviewLastAction) diagLines.push(`<div class="insight-flag flag-info">最后动作：${escapeHtml(getOpsActionLabel(record.reviewLastAction))}</div>`);
  if (record.reviewDeferUntil) diagLines.push(`<div class="insight-flag flag-warn">暂缓到：${escapeHtml(formatDate(record.reviewDeferUntil))}</div>`);
  const hasDiag = diagLines.length > 0;
  elements.detailInsightDiagnosis.style.display = hasDiag ? '' : 'none';
  elements.detailInsightDiagnosis.innerHTML = hasDiag
    ? `<div class="insight-label">处理情况</div>${diagLines.join('')}`
    : '';

  // ---- METADATA ----
  const metaRows = [
    ['处理人', record.reviewUpdatedBy],
    ['处理时间', formatDate(record.reviewUpdatedAt)],
    ['处理备注', record.reviewNote],
    ['人工覆盖', record.reviewOverride ? '是' : null]
  ].filter(([, v]) => v);
  elements.detailInsightMetadata.innerHTML = metaRows.length
    ? `<div class="insight-meta-grid">${metaRows.map(([l, v]) => `<div class="meta-pair"><span>${escapeHtml(l)}</span><strong>${escapeHtml(v)}</strong></div>`).join('')}</div>`
    : '';

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
  renderActionLogPanel(record);
  renderActionPanel(record);
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
  if (state.activeSection === 'overview') {
    renderDetail(null, 'queue', '概览只看全局分布，请切到收件箱、问题跟进或自动流程再查看详情。');
    return;
  }

  if (state.detailMode === 'thread') {
    const selectedThread = getSelectedThread();
    renderDetail(
      selectedThread,
      'thread',
      '当前还没有可用的回复任务。'
    );
    return;
  }

  if (state.detailMode === 'ops') {
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

  if (!item || state.actionPending || state.opsPending) {
    return;
  }

  if (action === 'mark_deferred' && !requireDeferUntil(
    'detail',
    ({ tone, message }) => {
      state.actionFeedback = {
        itemId: item.id,
        tone,
        message
      };
    },
    () => renderActionPanel(item),
    elements.detailActionDeferUntil,
    'queue',
    '请先填写暂缓到的时间。'
  )) {
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
    const deferUntilUtc = action === 'mark_deferred'
      ? readDeferUntilInput(elements.detailActionDeferUntil)
      : '';
    const response = await fetch(`/api/queue/${encodeURIComponent(item.id)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        action,
        actor: state.actor,
        note,
        reasons,
        defer_until_utc: deferUntilUtc
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

    setFlashMessage(`已完成操作：${translateDisplayValue(action)}`);
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



async function runThreadAction(action) {
  const thread = getSelectedThread();

  if (!thread || state.threadPending || state.actionPending || state.opsPending) {
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

    setFlashMessage(`已完成操作：${getThreadActionLabel(action)}`);
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

async function runOpsAction(action) {
  const record = getSelectedOperationsRecord();

  if (!record || state.opsPending || state.actionPending || state.threadPending) {
    return;
  }

  if (!record.actionId) {
    state.opsActionFeedback = {
      recordId: record.id,
      tone: 'error',
      message: '当前记录缺少稳定 ID，暂时无法提交动作。'
    };
    renderActionPanel(record);
    return;
  }

  const note = elements.detailActionNote.value.trim();

  if (action === 'mark_defer' && !requireDeferUntil(
    'detail',
    ({ tone, message }) => {
      state.opsActionFeedback = {
        recordId: record.id,
        tone,
        message
      };
    },
    () => renderActionPanel(record),
    elements.detailActionDeferUntil,
    'ops',
    '请先填写问题记录的暂缓时间。'
  )) {
    return;
  }

  state.opsPending = true;
  state.opsActionFeedback = {
    recordId: record.id,
    tone: 'success',
    message: '正在提交问题记录动作…'
  };
  renderActionPanel(record);

  try {
    const deferUntilUtc = action === 'mark_defer'
      ? readDeferUntilInput(elements.detailActionDeferUntil)
      : '';
    const response = await fetch(`/api/ops/${encodeURIComponent(record.actionId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        action,
        actor: state.actor,
        note,
        defer_until_utc: deferUntilUtc
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

    setFlashMessage(`已完成操作：${getOpsActionLabel(action)}`);
    state.opsActionFeedback = {
      recordId: record.id,
      tone: 'success',
      message: `已完成操作：${getOpsActionLabel(action)}`
    };
    elements.detailActionNote.value = '';
    await loadData({
      activeSection: 'operations',
      detailMode: 'ops',
      selectedOpsRecordId: record.id
    });
  } catch (error) {
    state.opsActionFeedback = {
      recordId: record.id,
      tone: 'error',
      message: error.message || '问题记录动作提交失败。'
    };
    renderActionPanel(record);
  } finally {
    state.opsPending = false;
    const selectedRecord = getSelectedOperationsRecord();
    if (selectedRecord) {
      renderActionPanel(selectedRecord);
    }
  }
}

function syncFiltersFromInputs() {
  if (!state.data) {
    return;
  }

  state.filters.project = elements.projectFilter.value;
  state.filters.status = elements.statusFilter.value;
  state.filters.action_state = elements.actionStateFilter.value;
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

function syncProcessingLaneFilter() {
  if (!state.data) {
    return;
  }

  state.processingLaneFilter = elements.processingLaneFilter.value;
  renderProcessingLane();
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

    const baseStatus = [
      `审核更新时间 ${formatDate(state.data.metadata.approval_updated_at)}`,
      `内容日期 ${state.data.metadata.queue_run_date || '—'}`,
      `自动执行 ${state.data.ops_snapshot && state.data.ops_snapshot.latest_run_date ? state.data.ops_snapshot.latest_run_date : '—'}`,
      `生成时间 ${formatDate(state.data.generated_at)}`
    ].join(' · ');
    elements.statusBanner.textContent = baseStatus;
    renderFlashBanner();
  } catch (error) {
    state.data = null;
    clearFlashBanner();
    state.detailMode = 'queue';
    state.selectedId = null;
    state.selectedThreadId = null;
    state.selectedOpsRecordId = null;
    state.actionPending = false;
    state.threadPending = false;
    state.opsPending = false;
    elements.summaryCards.innerHTML = '';
    elements.workspaceHighlights.innerHTML = '';
    elements.operationsUnifiedMeta.textContent = '';
    elements.pipelineUnifiedMeta.textContent = '';
    elements.threadInboxFilter.disabled = true;
    elements.operationsUnifiedList.innerHTML = '<div class="empty-state">问题记录数据暂时不可用。</div>';
    elements.pipelineUnifiedList.innerHTML = '<div class="empty-state">自动执行数据暂时不可用。</div>';
    elements.itemList.innerHTML = createLoadErrorMarkup(normalizeLoadError(error));
    elements.listMeta.textContent = '数据源诊断';
    elements.resultCount.textContent = '0 / 0';
    elements.needsReviewCount.textContent = '0';
    elements.readyToExecuteCount.textContent = '0';
    elements.needsInfoCount.textContent = '0';
    elements.deferredCount.textContent = '0';
    elements.needsReviewList.innerHTML = '<div class="empty-state">看板数据暂时不可用。</div>';
    elements.readyToExecuteList.innerHTML = '<div class="empty-state">看板数据暂时不可用。</div>';
    elements.needsInfoList.innerHTML = '<div class="empty-state">看板数据暂时不可用。</div>';
    elements.deferredList.innerHTML = '<div class="empty-state">看板数据暂时不可用。</div>';
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
elements.projectFilter.addEventListener('change', syncFiltersFromInputs);
elements.statusFilter.addEventListener('change', syncFiltersFromInputs);
elements.actionStateFilter.addEventListener('change', syncFiltersFromInputs);
elements.platformFilter.addEventListener('change', syncFiltersFromInputs);
elements.riskFilter.addEventListener('change', syncFiltersFromInputs);
elements.searchInput.addEventListener('input', syncFiltersFromInputs);

elements.threadInboxFilter.addEventListener('change', syncThreadInboxFilter);
elements.refreshButton.addEventListener('click', loadData);
elements.filterResetButton.addEventListener('click', handleFilterReset);

attachWorkspaceNavigation();
renderWorkspaceSections();
loadData();
