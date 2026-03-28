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
  selectedProjectName: '',
  selectedProjectTaskId: '',
  selectedProjectMaterialId: '',
  laneSelectionId: null,
  actionFeedback: null,
  threadActionFeedback: null,
  opsActionFeedback: null,
  flashMessage: null,
  actionPending: false,
  threadPending: false,
  opsPending: false,
  projectPending: false,
  detailDeferMode: '',
  threadInboxFilter: 'needs_reply',
  actor: readStoredActor(),
  inboxTab: 'ready',
  projectView: 'progress',
  projectActionFeedback: null,
  detailModalOpen: false
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

const PROJECT_SECTION_LABELS = {
  inbox: '待梳理',
  ready: '可推进',
  running: '推进中',
  waiting: '被阻塞',
  done: '已完成'
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
  detailCloseButton: document.getElementById('detailCloseButton'),
  detailContextBar: document.getElementById('detailContextBar'),
  detailContextPanel: document.getElementById('detailContextPanel'),
  detailEmpty: document.getElementById('detailEmpty'),
  detailInsightCore: document.getElementById('detailInsightCore'),
  detailInsightDiagnosis: document.getElementById('detailInsightDiagnosis'),
  detailInsightMetadata: document.getElementById('detailInsightMetadata'),
  detailModal: document.getElementById('detailModal'),
  detailModalBackdrop: document.getElementById('detailModalBackdrop'),
  detailProjectEditor: document.getElementById('detailProjectEditor'),
  detailProjectEditorMeta: document.getElementById('detailProjectEditorMeta'),
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
  projectCurrentStep: document.getElementById('projectCurrentStep'),
  projectTaskType: document.getElementById('projectTaskType'),
  projectNextStep: document.getElementById('projectNextStep'),
  projectBlocker: document.getElementById('projectBlocker'),
  projectNotes: document.getElementById('projectNotes'),
  projectCanonicalLink: document.getElementById('projectCanonicalLink'),
  projectOutput: document.getElementById('projectOutput'),
  projectSaveButton: document.getElementById('projectSaveButton'),
  readyToExecuteCount: document.getElementById('readyToExecuteCount'),
  readyToExecuteList: document.getElementById('readyToExecuteList'),
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
  workboardBoard: document.getElementById('workboardBoard'),
  workboardMeta: document.getElementById('workboardMeta'),
  projectBoardSummary: document.getElementById('projectBoardSummary'),
  projectBoardList: document.getElementById('projectBoardList'),
  projectBoardMeta: document.getElementById('projectBoardMeta'),
  projectRailMeta: document.getElementById('projectRailMeta'),
  projectHubTitle: document.getElementById('projectHubTitle'),
  projectHubSubtitle: document.getElementById('projectHubSubtitle'),
  heroKicker: document.getElementById('heroKicker'),
  heroTitle: document.getElementById('heroTitle'),
  heroSubtitle: document.getElementById('heroSubtitle'),
  heroMetrics: document.getElementById('heroMetrics'),
  projectSpotlight: document.getElementById('projectSpotlight'),
  filterResetButton: document.getElementById('filterResetButton')
};

function isModalDetailMode(mode = state.detailMode) {
  return ['queue', 'thread', 'ops', 'project_task', 'project_material'].includes(mode);
}

function usesInlineInspector() {
  return window.matchMedia('(min-width: 1180px)').matches;
}

function syncDetailModal() {
  if (!elements.detailModal) {
    return;
  }

  const inlineInspector = usesInlineInspector();
  const shouldShow = Boolean((inlineInspector || (state.detailModalOpen && isModalDetailMode())) && state.data);
  elements.detailModal.hidden = !shouldShow;
  elements.detailModal.setAttribute('aria-hidden', String(!shouldShow));
  elements.detailModal.classList.toggle('detail-modal-inline', inlineInspector);
  document.body.classList.toggle('detail-modal-open', shouldShow && !inlineInspector);
}

function openDetailModal() {
  if (!isModalDetailMode()) {
    return;
  }

  state.detailModalOpen = true;
  syncDetailModal();
}

function closeDetailModal() {
  state.detailModalOpen = false;
  syncDetailModal();
}

function matchesInboxTab(item) {
  if (!item) {
    return false;
  }

  const inboxTab = state.inboxTab || 'pending';
  const actionState = cleanClientValue(item.action_state);
  const status = cleanClientValue(item.status);
  const hasManualDecision = ['ready_to_execute', 'missing_info', 'deferred'].includes(actionState);

  switch (inboxTab) {
    case 'pending':
      return status === 'approval_pending' && !hasManualDecision;
    case 'ready':
      return actionState === 'ready_to_execute';
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
  const items = state.data && Array.isArray(state.data.items) ? state.data.items : [];

  if (tabId === 'all') {
    return items.length;
  }

  return items.filter((item) => {
    const previousTab = state.inboxTab;
    state.inboxTab = tabId;
    const matched = matchesInboxTab(item);
    state.inboxTab = previousTab;
    return matched;
  }).length;
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

function getProjectHub() {
  return state.data && state.data.project_hub ? state.data.project_hub : null;
}

function getProjectProfiles() {
  const projectHub = getProjectHub();
  return projectHub && Array.isArray(projectHub.projects) ? projectHub.projects : [];
}

function getSelectedProjectProfile() {
  return getProjectProfiles().find((project) => project.project === state.selectedProjectName) || null;
}

function getSelectedProjectTask() {
  const profile = getSelectedProjectProfile();
  if (!profile) {
    return null;
  }

  return profile.tasks_by_section
    .flatMap((section) => section.items || [])
    .find((item) => item.id === state.selectedProjectTaskId) || null;
}

function getSelectedProjectMaterial() {
  const profile = getSelectedProjectProfile();
  if (!profile) {
    return null;
  }

  return (profile.materials || []).find((item) => item.id === state.selectedProjectMaterialId) || null;
}

const WORKBOARD_LANE_CONFIG = [
  { id: 'decide', title: '等你拍板', note: '需要人工判断或确认', empty: '当前没有需要拍板的事项。' },
  { id: 'next', title: '下一步', note: '已经清楚，可以继续推进', empty: '当前没有明确的 next step。' },
  { id: 'blocked', title: '卡住了', note: '被 blocker、缺信息或阻塞状态拦住', empty: '当前没有 blocker。' },
  { id: 'watch', title: '观察区', note: '系统在跑、已完成或只需跟进', empty: '当前没有观察中的事项。' }
];

function summarizeProjectTask(task) {
  return cleanClientValue(task && task.blocker)
    || cleanClientValue(task && task.next_step)
    || cleanClientValue(task && task.current_step)
    || cleanClientValue(task && task.notes)
    || '打开右侧查看完整上下文。';
}

function getWorkboardProjectName(value, fallback = '未归类') {
  const normalized = cleanClientValue(value);
  return normalized || fallback;
}

function getWorkboardSearchText(item) {
  return [
    item.title,
    item.project,
    item.subtitle,
    item.note,
    item.surface,
    item.stage,
    item.typeLabel
  ].filter(Boolean).join(' ').toLowerCase();
}

function matchesWorkboardFilters(item) {
  const searchTerm = state.filters.search.trim().toLowerCase();
  const projectMatch = state.filters.project === 'all' || getWorkboardProjectName(item.project) === state.filters.project;
  if (!projectMatch) {
    return false;
  }

  if (!searchTerm) {
    return true;
  }

  return getWorkboardSearchText(item).includes(searchTerm);
}

function buildWorkboardItem(config) {
  return {
    id: config.id,
    lane: config.lane,
    mode: config.mode,
    project: getWorkboardProjectName(config.project),
    title: config.title,
    subtitle: config.subtitle || '',
    note: config.note || '',
    stage: config.stage || '',
    surface: config.surface || '',
    typeLabel: config.typeLabel || '',
    tagTone: config.tagTone || 'tag-muted',
    primaryId: config.primaryId || '',
    secondaryId: config.secondaryId || '',
    tertiaryId: config.tertiaryId || ''
  };
}

function getQueueWorkboardLane(item) {
  const actionState = cleanClientValue(item && item.action_state);
  const status = cleanClientValue(item && item.status);

  if (actionState === 'deferred' || actionState === 'missing_info') {
    return 'blocked';
  }

  if (actionState === 'ready_to_execute' || status === 'queued') {
    return 'next';
  }

  return 'decide';
}

function getThreadWorkboardLane(record) {
  if (record.review_state === 'blocked') {
    return 'blocked';
  }

  if (record.review_state === 'ready' || record.review_state === 'follow_up') {
    return 'next';
  }

  if (record.review_state === 'done') {
    return 'watch';
  }

  return 'decide';
}

function getOpsWorkboardLane(record) {
  const reviewState = cleanClientValue(record.reviewState);
  const blockedReasons = record.primaryPayload && Array.isArray(record.primaryPayload.blocked_reasons)
    ? record.primaryPayload.blocked_reasons
    : [];

  if (reviewState === 'defer' || blockedReasons.length > 0) {
    return 'blocked';
  }

  if (reviewState === 'execute') {
    return 'next';
  }

  if (reviewState === 'done' || record.kind === 'experiment') {
    return 'watch';
  }

  return 'decide';
}

function getProjectTaskWorkboardLane(sectionId) {
  if (sectionId === 'waiting') {
    return 'blocked';
  }

  if (sectionId === 'done') {
    return 'watch';
  }

  if (sectionId === 'ready' || sectionId === 'running') {
    return 'next';
  }

  return 'decide';
}

function getWorkboardItems() {
  if (!state.data) {
    return [];
  }

  const queueItems = (state.data.items || []).map((item) => buildWorkboardItem({
    id: `queue:${item.id}`,
    lane: getQueueWorkboardLane(item),
    mode: 'queue',
    project: item.project,
    title: item.title || '未命名内容入口',
    subtitle: [getQueueItemTypeLabel(item), getQueueSubtitle(item)].filter(Boolean).join(' · '),
    note: getQueueListNote(item),
    stage: getQueueStageLabel(item),
    surface: '内容入口',
    typeLabel: getQueueItemTypeLabel(item),
    tagTone: item.action_state === 'ready_to_execute' ? 'tag-project' : 'tag-status',
    primaryId: item.id
  }));

  const threadItems = getThreadRecords().map((record) => {
    const linkedQueue = getLinkedQueueItemForThread(record);
    return buildWorkboardItem({
      id: `thread:${record.reply_id}`,
      lane: getThreadWorkboardLane(record),
      mode: 'thread',
      project: linkedQueue ? linkedQueue.project : '',
      title: record.reply_id || '未知回复',
      subtitle: [record.platform || '未知平台', getThreadStateLabel(record.review_state)].join(' · '),
      note: record.review_note || record.draft_preview || (record.blocked_reasons || []).join('，') || '打开查看回复上下文。',
      stage: getThreadStateLabel(record.review_state),
      surface: '自动接力',
      typeLabel: '回复任务',
      tagTone: getThreadStateTagClass(record.review_state),
      primaryId: record.reply_id
    });
  });

  const opsItems = getOperationsRecords().map((record) => {
    const linkedQueue = getLinkedQueueItemForOpsRecord(record);
    return buildWorkboardItem({
      id: `ops:${record.id}`,
      lane: getOpsWorkboardLane(record),
      mode: 'ops',
      project: linkedQueue ? linkedQueue.project : '',
      title: record.title || '未命名异常',
      subtitle: [record.kind || 'ops', record.subtitle || ''].filter(Boolean).join(' · '),
      note: record.reviewNote || record.rows.map(([, value]) => value).find(Boolean) || '打开查看诊断与处理记录。',
      stage: record.reviewState ? getOpsStateLabel(record.reviewState) : '待判断',
      surface: '人工介入',
      typeLabel: '异常 / Blocker',
      tagTone: getOpsStateTagClass(record.reviewState),
      primaryId: record.id
    });
  });

  const projectItems = getProjectProfiles().flatMap((project) => {
    return (project.tasks_by_section || []).flatMap((section) => {
      return (section.items || []).map((item) => buildWorkboardItem({
        id: `project:${item.id}`,
        lane: getProjectTaskWorkboardLane(section.id),
        mode: 'project_task',
        project: project.project,
        title: item.task || '未命名任务',
        subtitle: [item.type || 'task', PROJECT_SECTION_LABELS[section.id] || section.title || section.id].join(' · '),
        note: summarizeProjectTask(item),
        stage: PROJECT_SECTION_LABELS[section.id] || section.title || section.id,
        surface: '项目推进',
        typeLabel: item.type || 'task',
        tagTone: section.id === 'waiting' ? 'tag-risk' : section.id === 'done' ? 'tag-project' : 'tag-status',
        primaryId: project.project,
        secondaryId: item.id
      }));
    });
  });

  return [...queueItems, ...threadItems, ...opsItems, ...projectItems].filter(matchesWorkboardFilters);
}

function isWorkboardItemSelected(item) {
  if (!item) {
    return false;
  }

  if (item.mode === 'queue') {
    return state.detailMode === 'queue' && state.selectedId === item.primaryId;
  }

  if (item.mode === 'thread') {
    return state.detailMode === 'thread' && state.selectedThreadId === item.primaryId;
  }

  if (item.mode === 'ops') {
    return state.detailMode === 'ops' && state.selectedOpsRecordId === item.primaryId;
  }

  if (item.mode === 'project_task') {
    return state.detailMode === 'project_task'
      && state.selectedProjectName === item.primaryId
      && state.selectedProjectTaskId === item.secondaryId;
  }

  return false;
}

function selectWorkboardItem(workItem, options = {}) {
  if (!workItem) {
    return;
  }

  clearActionFeedback();
  state.detailModalOpen = true;

  if (workItem.mode === 'queue') {
    state.detailMode = 'queue';
    state.selectedId = workItem.primaryId;
    state.selectedThreadId = null;
    state.selectedOpsRecordId = null;
    state.selectedProjectTaskId = '';
    state.selectedProjectMaterialId = '';
  } else if (workItem.mode === 'thread') {
    state.detailMode = 'thread';
    state.selectedThreadId = workItem.primaryId;
    state.selectedOpsRecordId = null;
    state.selectedProjectTaskId = '';
    state.selectedProjectMaterialId = '';
  } else if (workItem.mode === 'ops') {
    state.detailMode = 'ops';
    state.selectedOpsRecordId = workItem.primaryId;
    state.selectedThreadId = null;
    state.selectedProjectTaskId = '';
    state.selectedProjectMaterialId = '';
  } else if (workItem.mode === 'project_task') {
    state.detailMode = 'project_task';
    state.selectedProjectName = workItem.primaryId;
    state.selectedProjectTaskId = workItem.secondaryId;
    state.selectedProjectMaterialId = '';
    state.selectedThreadId = null;
    state.selectedOpsRecordId = null;
  }

  if (options.switchSection === false) {
    renderWorkboard();
    renderDetailForCurrentMode('请选择一条工作项查看详情。');
    return;
  }

  setActiveSection('workboard', { syncContext: false, preserveDetailModal: true });
}

function renderWorkboard() {
  if (!elements.workboardBoard || !elements.workboardMeta) {
    return;
  }

  if (!state.data) {
    elements.workboardMeta.textContent = '数据暂不可用';
    elements.workboardBoard.innerHTML = '<div class="empty-state">工作台数据暂时不可用。</div>';
    return;
  }

  const items = getWorkboardItems();
  const projectCount = new Set(items.map((item) => item.project).filter(Boolean)).size;
  const blockedCount = items.filter((item) => item.lane === 'blocked').length;
  const decideCount = items.filter((item) => item.lane === 'decide').length;
  elements.workboardMeta.textContent = `${items.length} 条工作对象 · ${projectCount} 个项目 · ${decideCount} 条待拍板 · ${blockedCount} 条 blocker`;

  const markup = WORKBOARD_LANE_CONFIG.map((lane) => {
    const laneItems = items.filter((item) => item.lane === lane.id);
    const cards = laneItems.length === 0
      ? `<div class="empty-state-inline">${escapeHtml(lane.empty)}</div>`
      : laneItems.map((item) => {
        const selectedClass = isWorkboardItemSelected(item) ? ' is-selected' : '';
        return `
          <button class="workboard-card${selectedClass}" type="button" data-workboard-id="${escapeHtml(item.id)}">
            <div class="workboard-card-top">
              <div class="tag-group">
                <span class="tag ${escapeHtml(item.tagTone)}">${escapeHtml(item.surface)}</span>
                <span class="tag tag-muted">${escapeHtml(item.project)}</span>
              </div>
              <span class="workboard-card-stage">${escapeHtml(item.stage || '待处理')}</span>
            </div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.note || '打开查看详情。')}</p>
            <div class="workboard-card-meta">
              <span>${escapeHtml(item.subtitle || '—')}</span>
              <span>${escapeHtml(item.typeLabel || '—')}</span>
            </div>
          </button>
        `;
      }).join('');

    return `
      <section class="workboard-lane">
        <div class="workboard-lane-header">
          <div>
            <h2>${escapeHtml(lane.title)}</h2>
            <p>${escapeHtml(lane.note)}</p>
          </div>
          <span class="workboard-lane-count">${laneItems.length}</span>
        </div>
        <div class="workboard-lane-list">${cards}</div>
      </section>
    `;
  }).join('');

  elements.workboardBoard.innerHTML = markup;
  document.querySelectorAll('[data-workboard-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const workItem = getWorkboardItems().find((item) => item.id === button.dataset.workboardId) || null;
      selectWorkboardItem(workItem, { switchSection: false });
    });
  });
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

function formatThreadFlags(record) {
  const flags = [];
  if (!record) {
    return flags;
  }

  if (record.review_override) {
    flags.push('人工覆盖');
  }
  if (record.blocked_reasons && record.blocked_reasons.length > 0) {
    flags.push(...translateValueList(record.blocked_reasons));
  }
  if (record.review_note) {
    flags.push(record.review_note);
  }

  return flags;
}

function getProcessingLaneTypeLabel(sourceKind) {
  const labels = {
    comment: '评论',
    reply: '回复',
    post: '发帖',
    article: '文章',
    thread: '线程',
    queue: '队列',
    manual: '手动',
    system: '系统'
  };

  return labels[sourceKind] || translateDisplayValue(sourceKind || '未知');
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
  state.projectActionFeedback = null;
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

  if (section === 'workboard') {
    clearActionFeedback();
    return;
  }

  if (section === 'projects') {
    const firstProject = getProjectProfiles()[0] || null;
    state.selectedProjectName = state.selectedProjectName || (firstProject ? firstProject.project : '');
    state.selectedProjectTaskId = '';
    state.selectedProjectMaterialId = '';
    state.detailMode = 'project_overview';
    state.selectedThreadId = null;
    state.selectedOpsRecordId = null;
    clearActionFeedback();
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
  if (options.preserveDetailModal !== true) {
    closeDetailModal();
  }
  if (options.syncContext !== false) {
    syncSectionContext(section);
  }
  renderWorkspaceSections();

  if (!state.data) {
    return;
  }

  renderWorkspaceHighlights();
  renderWorkboard();
  renderProjectBoard();
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
  const pendingCount = getInboxTabCount('pending');
  const readyCount = getInboxTabCount('ready');
  const opsSnapshot = state.data.ops_snapshot || {};
  const processingLane = state.data.daily_processing_queue || {};
  const threads = opsSnapshot.modules && opsSnapshot.modules.threads ? opsSnapshot.modules.threads : null;
  const projectHub = state.data.project_hub || {};
  const workspaceSummary = projectHub.workspace_summary || {};
  const workboardItems = getWorkboardItems();
  const workboardDecide = workboardItems.filter((item) => item.lane === 'decide').length;
  const workboardBlocked = workboardItems.filter((item) => item.lane === 'blocked').length;

  const cards = [
    {
      section: 'queue',
      title: 'Inbox',
      value: `${pendingCount} 待审 · ${readyCount} 可继续`
    },
    {
      section: 'projects',
      title: 'Projects',
      value: projectHub.available === false
        ? '未接入'
        : `${workspaceSummary.project_count || 0} 项目 · ${workspaceSummary.total_tasks || 0} 条事项`
    },
    {
      section: 'operations',
      title: 'Issues',
      value: operationsReview.available === false
        ? '不可用'
        : `${processingLane.high_priority_count || 0} 条拦阻`
    },
    {
      section: 'pipeline',
      title: 'Automation',
      value: `${threads ? threads.needs_reply_count : 0} 待人工流转`
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

  renderProjectShellSummary();
}

function attachWorkspaceNavigation() {
  document.querySelectorAll('[data-section-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveSection(button.dataset.sectionTab);
    });
  });
}

function ensureProjectSelection(projectProfiles) {
  if (!Array.isArray(projectProfiles) || projectProfiles.length === 0) {
    state.selectedProjectName = '';
    state.selectedProjectTaskId = '';
    state.selectedProjectMaterialId = '';
    return null;
  }

  const selectedProfile = projectProfiles.find((project) => project.project === state.selectedProjectName) || projectProfiles[0];
  state.selectedProjectName = selectedProfile.project;

  const taskIds = selectedProfile.tasks_by_section.flatMap((section) => (section.items || []).map((item) => item.id));
  const materialIds = (selectedProfile.materials || []).map((item) => item.id);

  if (state.selectedProjectTaskId && !taskIds.includes(state.selectedProjectTaskId)) {
    state.selectedProjectTaskId = '';
  }

  if (state.selectedProjectMaterialId && !materialIds.includes(state.selectedProjectMaterialId)) {
    state.selectedProjectMaterialId = '';
  }

  return selectedProfile;
}

function renderProjectShellSummary(selectedProfile = getSelectedProjectProfile()) {
  if (!elements.heroTitle || !elements.heroSubtitle || !elements.heroMetrics || !elements.projectSpotlight) {
    return;
  }

  const summary = state.data && state.data.summary ? state.data.summary : {};
  const projectHub = getProjectHub();
  const workboardItems = getWorkboardItems();
  const decideItems = workboardItems.filter((item) => item.lane === 'decide');
  const nextItems = workboardItems.filter((item) => item.lane === 'next');
  const blockedItems = workboardItems.filter((item) => item.lane === 'blocked');
  const sectionConfig = {
    workboard: {
      kicker: 'Decision Workbench',
      title: '多项目统一工作台',
      subtitle: '默认先处理需要你拍板的，再推进 next step；项目资料层只在具体项目里展开。',
      metrics: [
        { label: '待拍板', count: decideItems.length, note: '需要人工判断' },
        { label: '下一步', count: nextItems.length, note: '已经清楚，可以推进' },
        { label: 'Blocker', count: blockedItems.length, note: '缺信息或被阻塞' },
        { label: '项目', count: projectHub && projectHub.project_names ? projectHub.project_names.length : 0, note: '接入项目数' }
      ],
      spotlight: [
        {
          label: '现在先做',
          value: decideItems[0] ? decideItems[0].title : '当前没有待拍板事项'
        },
        {
          label: '最明显 blocker',
          value: blockedItems[0] ? blockedItems[0].note || blockedItems[0].title : '当前没有 blocker'
        },
        {
          label: '最近 next step',
          value: nextItems[0] ? nextItems[0].title : '当前没有可推进事项'
        }
      ]
    },
    projects: {
      kicker: 'Projects',
      title: selectedProfile ? `${selectedProfile.project} 项目工作台` : '项目推进层 / 资料层',
      subtitle: selectedProfile
        ? `${selectedProfile.total_tasks || 0} 条推进任务 · ${(selectedProfile.materials || []).length} 份资料 · ${selectedProfile.total_queue_items || 0} 个执行入口`
        : `${projectHub && projectHub.project_names ? projectHub.project_names.length : 0} 个项目已经接入统一工作台`,
      metrics: selectedProfile
        ? (selectedProfile.focus_cards || []).slice(0, 4)
        : [
          { label: '项目', count: projectHub && projectHub.project_names ? projectHub.project_names.length : 0, note: '已接入项目数' },
          { label: '推进任务', count: projectHub ? projectHub.total_items || 0 : 0, note: '总看板口径' },
          { label: '待审', count: summary.pending_approvals || 0, note: '审批记录待处理' },
          { label: '可继续', count: summary.ready_to_execute_count || 0, note: '执行队列可推进' }
        ],
      spotlight: selectedProfile
        ? [
          {
            label: '最优先 Next Step',
            value: selectedProfile.next_steps && selectedProfile.next_steps[0]
              ? selectedProfile.next_steps[0].next_step || selectedProfile.next_steps[0].title
              : '当前没有明确的下一步'
          },
          {
            label: '当前 Blocker',
            value: selectedProfile.blockers && selectedProfile.blockers[0]
              ? selectedProfile.blockers[0].blocker || selectedProfile.blockers[0].title
              : '当前没有 blocker'
          },
          {
            label: '资料层覆盖',
            value: selectedProfile.material_groups && selectedProfile.material_groups.length
              ? selectedProfile.material_groups.map((group) => `${group.label} ${group.items.length}`).join(' · ')
              : '还没有挂上项目资料'
          },
          {
            label: '经验沉淀',
            value: selectedProfile.learned && selectedProfile.learned[0]
              ? selectedProfile.learned[0].lesson || '已沉淀经验'
              : '当前没有沉淀条目'
          }
        ]
        : [
          { label: '目标', value: '项目资料层和任务推进层分开，避免继续靠聊天推进。' },
          { label: '适配任务', value: '内容、分发、复盘、运营、blocker、next step 全部挂进一个壳里。' }
        ]
    },
    queue: {
      kicker: 'Inbox',
      title: '网页内处理执行入口',
      subtitle: `${getInboxTabCount('pending')} 条待审核 · ${getInboxTabCount('ready')} 条可继续 · ${(state.data && state.data.items ? state.data.items.length : 0)} 条总入口`,
      metrics: [
        { label: '待审核', count: getInboxTabCount('pending'), note: '需要拍板' },
        { label: '可继续', count: getInboxTabCount('ready'), note: '可以直接推进' },
        { label: '资料不全', count: getInboxTabCount('missing_info'), note: '缺信息待补' },
        { label: '已暂缓', count: getInboxTabCount('deferred'), note: '先挂起' }
      ],
      spotlight: [
        { label: '当前筛选', value: state.filters.project === 'all' ? '全部项目' : state.filters.project },
        { label: '搜索', value: state.filters.search ? state.filters.search : '当前没有搜索词' }
      ]
    },
    operations: {
      kicker: 'Issues',
      title: '异常与 blocker 工作带',
      subtitle: '把异常、需复核项和人工决策点拉到一条操作面里。',
      metrics: [
        { label: '高优先', count: state.data && state.data.daily_processing_queue ? state.data.daily_processing_queue.high_priority_count || 0 : 0, note: '当前高优先条目' },
        { label: '审核记录', count: state.data && state.data.operations_review ? (state.data.operations_review.reviews.entries || []).length : 0, note: 'review index' },
        { label: '实验记录', count: state.data && state.data.operations_review ? (state.data.operations_review.experiments.entries || []).length : 0, note: 'experiment log' },
        { label: '反馈快照', count: state.data && state.data.operations_review && state.data.operations_review.feedback && state.data.operations_review.feedback.entries ? state.data.operations_review.feedback.entries.length : 0, note: '反馈摘要' }
      ],
      spotlight: [
        { label: '作用', value: '把异常、问题记录、需复核入口集中处理，不和项目资料混在一起。' }
      ]
    },
    pipeline: {
      kicker: 'Automation',
      title: '机器接管与人工接力面',
      subtitle: '把自动回复、填单、handoff 状态收进同一个网页操作面。',
      metrics: [
        { label: '待判断', count: getThreadRecords().filter((record) => record.review_state === 'needs_reply').length, note: '需要人工判断' },
        { label: '可直接回复', count: getThreadRecords().filter((record) => record.review_state === 'ready').length, note: '可直接接手' },
        { label: '待跟进', count: getThreadRecords().filter((record) => record.review_state === 'follow_up').length, note: '后续动作' },
        { label: '阻塞', count: getThreadRecords().filter((record) => record.review_state === 'blocked').length, note: '需要人工拆卡' }
      ],
      spotlight: [
        { label: '作用', value: '把自动流程和人工 checkpoint 分开，减少聊天框来回跳。' }
      ]
    },
    overview: {
      kicker: 'Archive',
      title: '全局分布',
      subtitle: '保留旧分桶视图，但不再作为主入口。',
      metrics: [
        { label: '项目', count: projectHub && projectHub.project_names ? projectHub.project_names.length : 0, note: '接入项目数' },
        { label: '推进任务', count: projectHub ? projectHub.total_items || 0 : 0, note: '任务总数' },
        { label: '待审', count: summary.pending_approvals || 0, note: '审批水位' },
        { label: '队列', count: summary.total_items || 0, note: '执行入口总数' }
      ],
      spotlight: [
        { label: '作用', value: '保留统计分布，但不在这里做推进动作。' }
      ]
    }
  };

  const currentConfig = sectionConfig[state.activeSection] || sectionConfig.workboard;
  elements.heroKicker.textContent = currentConfig.kicker;
  elements.heroTitle.textContent = currentConfig.title;
  elements.heroSubtitle.textContent = currentConfig.subtitle;
  elements.heroMetrics.innerHTML = (currentConfig.metrics || []).map((card) => `
    <article class="hero-metric-card">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(String(card.count || 0))}</strong>
      <p>${escapeHtml(card.note || '—')}</p>
    </article>
  `).join('');

  elements.projectSpotlight.hidden = state.activeSection === 'projects';
  elements.projectSpotlight.innerHTML = (currentConfig.spotlight || []).map((card) => `
    <article class="spotlight-card">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value || '—')}</strong>
    </article>
  `).join('');
}

function renderProjectBoard() {
  if (!elements.projectBoardSummary || !elements.projectBoardList || !elements.projectBoardMeta) {
    return;
  }

  const projectHub = state.data && state.data.project_hub ? state.data.project_hub : null;

  if (!projectHub || projectHub.available === false) {
    elements.projectBoardSummary.innerHTML = '<div class="empty-state-inline">项目总览暂不可用</div>';
    elements.projectBoardList.innerHTML = '<div class="empty-state-inline">未读取到多项目总看板数据。</div>';
    elements.projectBoardMeta.textContent = projectHub && projectHub.path ? `来源：${projectHub.path}` : '未配置项目总看板';
    if (elements.projectRailMeta) {
      elements.projectRailMeta.textContent = '0 项目';
    }
    elements.projectHubTitle.textContent = '项目总览';
    elements.projectHubSubtitle.textContent = '';
    renderProjectShellSummary(null);
    return;
  }

  const selectedProfile = ensureProjectSelection(projectHub.projects || []);
  renderProjectShellSummary(selectedProfile);

  const summaryCards = (projectHub.projects || []).map((project) => {
    const running = Number(project.section_counts && project.section_counts.running) || 0;
    const ready = Number(project.section_counts && project.section_counts.ready) || 0;
    const waiting = Number(project.section_counts && project.section_counts.waiting) || 0;
    const queueCount = Number(project.total_queue_items) || 0;
    const isActive = state.selectedProjectName === project.project ? ' is-active' : '';
    return `
      <button class="workspace-highlight-card${isActive}" type="button" data-project-pick="${escapeHtml(project.project || '')}">
        <span class="workspace-highlight-title">${escapeHtml(project.project || '未知项目')}</span>
        <span class="workspace-highlight-value">${escapeHtml(`${ready} 可推进 · ${running} 推进中 · ${waiting} 阻塞`)}</span>
        <span class="workspace-highlight-note">${escapeHtml(`${queueCount} 条相关入口`)}</span>
      </button>
    `;
  }).join('');

  elements.projectBoardSummary.innerHTML = summaryCards || '<div class="empty-state-inline">暂无项目卡片。</div>';
  elements.projectBoardMeta.textContent = `${projectHub.project_names ? projectHub.project_names.length : 0} 个项目 · ${projectHub.total_items || 0} 条任务`;
  if (elements.projectRailMeta) {
    elements.projectRailMeta.textContent = `${projectHub.project_names ? projectHub.project_names.length : 0} 项目`;
  }

  if (!selectedProfile) {
    elements.projectHubTitle.textContent = '项目总览';
    elements.projectHubSubtitle.textContent = '';
    elements.projectBoardList.innerHTML = '<div class="empty-state-inline">没有可展示的项目。</div>';
    renderProjectShellSummary(null);
    return;
  }

  elements.projectHubTitle.textContent = selectedProfile.project;
  elements.projectHubSubtitle.textContent = `${selectedProfile.total_tasks || 0} 条推进任务 · ${(selectedProfile.materials || []).length || 0} 份资料 · ${selectedProfile.total_queue_items || 0} 个相关入口`;
  renderProjectShellSummary(selectedProfile);

  const summaryCardMarkup = (selectedProfile.focus_cards || []).map((card) => `
    <article class="project-summary-card">
      <span class="project-summary-label">${escapeHtml(card.label)}</span>
      <strong class="project-summary-value">${escapeHtml(String(card.count || 0))}</strong>
      <p class="project-summary-note">${escapeHtml(card.note || '—')}</p>
    </article>
  `).join('');

  const progressMarkup = (selectedProfile.tasks_by_section || []).map((section) => {
    const cards = (section.items || []).map((item) => {
      const selectedClass = state.selectedProjectTaskId === item.id ? ' is-selected' : '';
      const statusLine = item.blocker
        ? `Blocker · ${item.blocker}`
        : item.current_step
          ? `当前步骤 · ${item.current_step}`
          : item.next_step
            ? `下一步 · ${item.next_step}`
            : '点击查看详情与编辑';
      const docCount = [item.canonical_link, item.output].filter(Boolean).length;
      return `
        <button class="project-card${selectedClass}" type="button" data-project-task-id="${escapeHtml(item.id)}">
          <div class="project-card-meta">
            <span class="tag tag-muted">${escapeHtml(item.type || 'task')}</span>
            ${docCount ? `<span class="tag tag-project">${escapeHtml(`${docCount} 份资料`)}</span>` : ''}
          </div>
          <strong>${escapeHtml(item.task || '未命名任务')}</strong>
          <p>${escapeHtml(statusLine)}</p>
        </button>
      `;
    }).join('');

    return `
      <section class="project-column">
        <div class="panel-heading">
          <h2>${escapeHtml(PROJECT_SECTION_LABELS[section.id] || section.title || section.id)}</h2>
          <div class="panel-meta">${(section.items || []).length}</div>
        </div>
        <div class="project-column-list">${cards || '<div class="empty-state-inline">暂无任务</div>'}</div>
      </section>
    `;
  }).join('');

  const queueMarkup = (selectedProfile.related_queue_items || []).slice(0, 8).map((item) => `
    <article class="project-strip-card">
      <strong>${escapeHtml(item.title || '未命名入口')}</strong>
      <span>${escapeHtml([item.platform, item.category, translateDisplayValue(item.action_state)].filter(Boolean).join(' · '))}</span>
    </article>
  `).join('');

  const learnedMarkup = (selectedProfile.learned || []).map((item) => `
    <article class="project-learned-item">
      <strong>${escapeHtml(item.scope || '通用')}</strong>
      <p>${escapeHtml(item.lesson || '—')}</p>
    </article>
  `).join('');

  const materialsMarkup = (selectedProfile.material_groups || []).map((group) => {
    const cards = group.items.map((item) => {
      const selectedClass = state.selectedProjectMaterialId === item.id ? ' is-selected' : '';
      const openLink = item.absolute_path ? `<a class="button button-link" href="${escapeHtml(toLocalFileHref(item.absolute_path))}" target="_blank" rel="noreferrer">打开</a>` : '';
      return `
        <article class="project-material-card${selectedClass}">
          <button class="project-material-main" type="button" data-project-material-id="${escapeHtml(item.id)}">
            <span class="tag tag-muted">${escapeHtml(item.kind || '资料')}</span>
            <strong>${escapeHtml(item.label || item.title || '未命名资料')}</strong>
            <p>${escapeHtml(item.task_title || item.title || '—')}</p>
          </button>
          <div class="project-material-actions">${openLink}</div>
        </article>
      `;
    }).join('');

    return `
      <section class="project-material-group">
        <div class="panel-heading">
          <h2>${escapeHtml(group.label)}</h2>
          <div class="panel-meta">${group.items.length}</div>
        </div>
        <div class="project-material-grid">${cards}</div>
      </section>
    `;
  }).join('');

  const projectBody = state.projectView === 'materials'
    ? `
      <section class="project-summary-grid">${summaryCardMarkup}</section>
      ${materialsMarkup || '<div class="empty-state-inline">当前项目还没有可挂载的资料。</div>'}
      ${learnedMarkup ? `<section class="project-learned-panel"><div class="panel-heading"><h2>经验沉淀</h2></div>${learnedMarkup}</section>` : ''}
    `
    : `
      <section class="project-summary-grid">${summaryCardMarkup}</section>
      <section class="project-progress-grid">${progressMarkup}</section>
      <section class="project-strip">
        <div class="panel-heading">
          <h2>相关执行入口</h2>
          <div class="panel-meta">${(selectedProfile.related_queue_items || []).length}</div>
        </div>
        <div class="project-strip-grid">${queueMarkup || '<div class="empty-state-inline">当前项目没有挂进执行入口。</div>'}</div>
      </section>
      ${learnedMarkup ? `<section class="project-learned-panel"><div class="panel-heading"><h2>经验沉淀</h2></div>${learnedMarkup}</section>` : ''}
    `;

  elements.projectBoardList.innerHTML = projectBody;

  document.querySelectorAll('[data-project-pick]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedProjectName = button.dataset.projectPick;
      state.selectedProjectTaskId = '';
      state.selectedProjectMaterialId = '';
      state.detailMode = 'project_overview';
      closeDetailModal();
      state.activeSection = 'projects';
      renderWorkspaceSections();
      renderProjectBoard();
      renderDetailForCurrentMode('请选择一个项目任务或资料。');
    });
  });

  document.querySelectorAll('[data-project-view]').forEach((button) => {
    const isActive = button.dataset.projectView === state.projectView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
    if (button.dataset.boundProjectView === 'true') {
      return;
    }
    button.dataset.boundProjectView = 'true';
    button.addEventListener('click', () => {
      if (button.dataset.projectView === state.projectView) {
        return;
      }
      state.projectView = button.dataset.projectView;
      state.selectedProjectTaskId = '';
      state.selectedProjectMaterialId = '';
      state.detailMode = 'project_overview';
      closeDetailModal();
      renderProjectBoard();
      renderDetailForCurrentMode('请选择一个项目任务或资料。');
    });
  });

  document.querySelectorAll('[data-project-task-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedProjectTaskId = button.dataset.projectTaskId;
      state.selectedProjectMaterialId = '';
      state.detailMode = 'project_task';
      state.detailModalOpen = true;
      renderProjectBoard();
      renderDetailForCurrentMode('请选择一个项目任务或资料。');
    });
  });

  document.querySelectorAll('[data-project-material-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedProjectMaterialId = button.dataset.projectMaterialId;
      state.selectedProjectTaskId = '';
      state.detailMode = 'project_material';
      state.detailModalOpen = true;
      renderProjectBoard();
      renderDetailForCurrentMode('请选择一个项目任务或资料。');
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

  const shortReviewNote = cleanClientValue(item.review_note).split(/\r?\n/).find((line) => cleanClientValue(line));
  const shortReason = cleanClientValue(item.reason).split(/\r?\n/).find((line) => cleanClientValue(line));
  return shortReviewNote
    || shortReason
    || sourcePreview
    || '点开右侧查看详情。';
}

function renderFilters() {
  const { statuses, platforms, projects, risks, action_states } = state.data.filters;
  const mergedProjects = Array.from(new Set([
    ...(projects || []),
    ...getProjectProfiles().map((project) => project.project).filter(Boolean)
  ])).sort((left, right) => String(left).localeCompare(String(right), 'zh-CN'));

  createOptions(elements.projectFilter, mergedProjects, state.filters.project);
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
      state.detailModalOpen = true;
      setActiveSection('queue', { syncContext: false, preserveDetailModal: true });
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
      state.detailModalOpen = true;
      setActiveSection('pipeline', { syncContext: false, preserveDetailModal: true });
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
      state.detailModalOpen = true;
      setActiveSection('operations', { syncContext: false, preserveDetailModal: true });
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
  state.inboxTab = 'ready';
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
  state.detailModalOpen = true;
  setActiveSection('queue', { syncContext: false, preserveDetailModal: true });
}

function navigateToThread(replyId) {
  if (!getThreadRecords().some((record) => record.reply_id === replyId)) {
    return;
  }

  clearActionFeedback();
  state.detailMode = 'thread';
  state.selectedThreadId = replyId;
  state.selectedOpsRecordId = null;
  state.detailModalOpen = true;
  setActiveSection('pipeline', { syncContext: false, preserveDetailModal: true });
}

function navigateToOpsRecord(recordId) {
  if (!getOperationsRecords().some((record) => record.id === recordId)) {
    return;
  }

  clearActionFeedback();
  state.detailMode = 'ops';
  state.selectedOpsRecordId = recordId;
  state.selectedThreadId = null;
  state.detailModalOpen = true;
  setActiveSection('operations', { syncContext: false, preserveDetailModal: true });
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

function applyQuickDecision(option, suggestedReply = '') {
  const cleanOption = cleanClientValue(option);
  if (!cleanOption) {
    return;
  }

  let note = `审批结论：${cleanOption}`;
  if (cleanOption.includes('按建议回复') && suggestedReply) {
    note += `\n建议回复：${suggestedReply}`;
  } else if (cleanOption.includes('改文案')) {
    note += suggestedReply
      ? `\n请按此为基础修改：${suggestedReply}`
      : '\n请填写你的改后文案。';
  } else if (cleanOption.includes('暂时不回')) {
    note += '\n先不执行回复，后续再看。';
  }

  elements.detailActionNote.value = note;
  elements.detailActionNote.focus();
  setFlashMessage(`已带入审批结论：${cleanOption}`);
}

function renderContextPanel(actions) {
  if (!actions || actions.length === 0) {
    elements.detailContextPanel.hidden = false;
    elements.detailContextBar.innerHTML = '';
    elements.detailContextBar.hidden = true;
  } else {
    elements.detailContextPanel.hidden = false;
    elements.detailContextBar.hidden = false;
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

        if (action.kind === 'copy') {
          return `
            <button class="button" data-copy-text="${escapeHtml(action.value || '')}" type="button">
              ${escapeHtml(action.label)}
            </button>
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

        if (targetKind === 'project-task') {
          state.selectedProjectTaskId = targetId;
          state.selectedProjectMaterialId = '';
          state.detailMode = 'project_task';
          state.detailModalOpen = true;
          renderProjectBoard();
          renderDetailForCurrentMode('请选择一个项目任务或资料。');
        }
      });
    });

    document.querySelectorAll('[data-copy-text]').forEach((button) => {
      button.addEventListener('click', async () => {
        const text = button.dataset.copyText || '';
        try {
          await navigator.clipboard.writeText(text);
          setFlashMessage('已复制到剪贴板');
        } catch (_error) {
          setFlashMessage('复制失败，请手动复制');
        }
      });
    });
  }

  document.querySelectorAll('[data-decision-option]').forEach((button) => {
    button.addEventListener('click', () => {
      applyQuickDecision(button.dataset.decisionOption, button.dataset.suggestedReply || '');
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

  if (action === 'mark_blocked') {
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
    elements.itemList.innerHTML = '<div class="empty-state">这一组现在没有需要你处理的内容</div>';
    renderDetailForCurrentMode('当前筛选条件下没有匹配项目。');
    renderOpsSnapshot();
    return;
  }
  const previousScrollTop = elements.itemList.scrollTop;

  elements.itemList.innerHTML = filteredItems
    .map((item) => {
      const selectedClass = state.detailMode === 'queue' && item.id === state.selectedId ? ' item-row-selected' : '';

      return `
        <button class="item-row${selectedClass}" data-item-id="${escapeHtml(item.id)}" data-item-source="list" type="button">
          <div class="item-row-line1">
            <strong class="item-row-title">${escapeHtml(item.title || '未命名任务')}</strong>
            <span class="item-row-state">${escapeHtml(getQueueStageLabel(item))}</span>
          </div>
          <div class="item-row-line2">
            <span class="item-row-headline">${escapeHtml(item.platform || '未知平台')}</span>
            <span class="item-row-subline">${escapeHtml(getQueueListNote(item) || '打开后查看处理建议')}</span>
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


function classifyQueueItem(item) {
  const category = cleanClientValue(item && item.category);
  const project = cleanClientValue(item && item.project);
  const ctx = item && item.raw && item.raw.queue && item.raw.queue.reviewhub && item.raw.queue.reviewhub.context
    ? item.raw.queue.reviewhub.context
    : null;
  const decisionType = cleanClientValue(ctx && ctx.decision_type);

  if (decisionType === 'reviewhub_project' || category === 'Project') {
    return 'project';
  }

  if (decisionType === 'project_task' || category === 'Project Task') {
    return 'issue';
  }

  if (decisionType && decisionType.includes('approval')) {
    return 'approval';
  }

  if (category && /Comment Reply|Workflow Approval|Acceptance Checklist/i.test(category)) {
    return 'approval';
  }

  if (project && /ReviewHub/i.test(project)) {
    return 'issue';
  }

  return 'execution';
}

function getQueueStageLabel(item) {
  const type = classifyQueueItem(item);
  const actionState = cleanClientValue(item && item.action_state);

  if (type === 'approval') {
    if (actionState === 'missing_info') return '待补充';
    if (actionState === 'deferred') return '已关闭';
    return '待审批';
  }

  if (type === 'project') {
    if (actionState === 'deferred') return '暂缓';
    if (actionState === 'missing_info') return '规划中';
    if (actionState === 'ready_to_execute') return '进行中';
    return '进行中';
  }

  if (type === 'issue') {
    if (actionState === 'deferred') return '阻塞';
    if (actionState === 'missing_info') return '待修复';
    if (actionState === 'ready_to_execute') {
      const note = cleanClientValue(item && item.review_note).toLowerCase();
      if (/验证|验收|completed|done/.test(note)) return '待验证';
      return '修复中';
    }
    return '待修复';
  }

  if (actionState === 'deferred') return '阻塞';
  if (actionState === 'missing_info') return '未开始';
  if (actionState === 'ready_to_execute') return '进行中';
  return '未开始';
}

function buildQueueActionButtons(item) {
  const type = classifyQueueItem(item);
  const stage = getQueueStageLabel(item);
  const buttons = [];

  if (type === 'approval') {
    if (stage === '待审批') {
      buttons.push({ action: 'mark_ready', label: '通过', className: 'button button-primary' });
      buttons.push({ action: 'mark_missing_info', label: '补充后再看', className: 'button' });
      buttons.push({ action: 'mark_deferred', label: '暂缓', className: 'button' });
      buttons.push({ action: 'reject', label: '不通过', className: 'button button-danger' });
    } else if (stage === '待补充') {
      buttons.push({ action: 'mark_ready', label: '补充完成，回到待审批', className: 'button button-primary' });
      buttons.push({ action: 'mark_deferred', label: '暂缓', className: 'button' });
      buttons.push({ action: 'reject', label: '关闭', className: 'button button-danger' });
    } else if (stage === '已决定') {
      buttons.push({ action: 'approve', label: '查看决定', className: 'button button-primary' });
      buttons.push({ action: 'restore_auto', label: '重新打开', className: 'button' });
    } else {
      buttons.push({ action: 'restore_auto', label: '重新打开', className: 'button button-primary' });
    }
  } else if (type === 'project') {
    if (stage === '规划中') {
      buttons.push({ action: 'mark_ready', label: '开始项目', className: 'button button-primary' });
      buttons.push({ action: 'mark_missing_info', label: '新增事项', className: 'button' });
      buttons.push({ action: 'mark_deferred', label: '暂缓项目', className: 'button' });
    } else if (stage === '进行中') {
      buttons.push({ action: 'mark_ready', label: '更新进度', className: 'button button-primary' });
      buttons.push({ action: 'mark_missing_info', label: '新增事项', className: 'button' });
      buttons.push({ action: 'approve', label: '查看事项', className: 'button' });
      buttons.push({ action: 'mark_deferred', label: '暂缓项目', className: 'button' });
    } else if (stage === '暂缓') {
      buttons.push({ action: 'restore_auto', label: '恢复项目', className: 'button button-primary' });
      buttons.push({ action: 'approve', label: '查看事项', className: 'button' });
    }
  } else if (type === 'issue') {
    if (stage === '待修复') {
      buttons.push({ action: 'mark_ready', label: '开始修复', className: 'button button-primary' });
      buttons.push({ action: 'mark_blocked', label: '标记阻塞', className: 'button' });
      buttons.push({ action: 'mark_missing_info', label: '补充缺失信息', className: 'button' });
      buttons.push({ action: 'mark_deferred', label: '暂缓', className: 'button' });
    } else if (stage === '修复中') {
      buttons.push({ action: 'mark_ready', label: '更新修复进度', className: 'button button-primary' });
      buttons.push({ action: 'approve', label: '标记待验证', className: 'button' });
      buttons.push({ action: 'mark_blocked', label: '标记阻塞', className: 'button' });
      buttons.push({ action: 'mark_deferred', label: '暂缓', className: 'button' });
    } else if (stage === '待验证') {
      buttons.push({ action: 'approve', label: '验证通过', className: 'button button-primary' });
      buttons.push({ action: 'mark_ready', label: '验证不通过', className: 'button' });
      buttons.push({ action: 'mark_missing_info', label: '补充说明', className: 'button' });
    } else if (stage === '阻塞') {
      buttons.push({ action: 'restore_auto', label: '恢复修复', className: 'button button-primary' });
      buttons.push({ action: 'mark_missing_info', label: '补充缺失信息', className: 'button' });
    }
  } else {
    if (stage === '未开始') {
      buttons.push({ action: 'mark_ready', label: '开始处理', className: 'button button-primary' });
      buttons.push({ action: 'mark_blocked', label: '标记阻塞', className: 'button' });
      buttons.push({ action: 'mark_missing_info', label: '补充缺失信息', className: 'button' });
      buttons.push({ action: 'mark_deferred', label: '暂缓', className: 'button' });
    } else if (stage === '进行中') {
      buttons.push({ action: 'mark_ready', label: '更新进度', className: 'button button-primary' });
      buttons.push({ action: 'approve', label: '标记待验证', className: 'button' });
      buttons.push({ action: 'mark_blocked', label: '标记阻塞', className: 'button' });
      buttons.push({ action: 'mark_deferred', label: '暂缓', className: 'button' });
    } else if (stage === '阻塞') {
      buttons.push({ action: 'restore_auto', label: '恢复处理', className: 'button button-primary' });
      buttons.push({ action: 'mark_missing_info', label: '补充缺失信息', className: 'button' });
    }
  }

  if (item.review_override && !buttons.some((button) => button.action === 'restore_auto')) {
    buttons.push({ action: 'restore_auto', label: '恢复自动判断', className: 'button' });
  }

  return buttons;
}


function getQueueItemTypeLabel(item) {
  const type = classifyQueueItem(item);
  if (type === 'approval') return '审批';
  if (type === 'project') return '项目';
  if (type === 'issue') return '问题';
  return '执行';
}

function getQueueSubtitle(item) {
  const platform = cleanClientValue(item && item.platform);
  const project = cleanClientValue(item && item.project);
  if (platform && project && platform !== project) {
    return `${platform} · ${project}`;
  }
  return platform || project || '待审核内容';
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

function hideProjectEditor() {
  elements.detailProjectEditor.hidden = true;
  elements.detailProjectEditorMeta.textContent = '';
  elements.projectCurrentStep.disabled = false;
  elements.projectTaskType.disabled = false;
  elements.projectNextStep.disabled = false;
  elements.projectBlocker.disabled = false;
  elements.projectNotes.disabled = false;
  elements.projectCanonicalLink.disabled = false;
  elements.projectOutput.disabled = false;
  elements.projectCurrentStep.value = '';
  elements.projectTaskType.value = '';
  elements.projectNextStep.value = '';
  elements.projectBlocker.value = '';
  elements.projectNotes.value = '';
  elements.projectCanonicalLink.value = '';
  elements.projectOutput.value = '';
  elements.projectSaveButton.disabled = false;
}

function renderProjectTaskEditor(task) {
  if (!task) {
    hideProjectEditor();
    return;
  }

  const isPending = Boolean(state.projectPending);
  elements.detailProjectEditor.hidden = false;
  elements.detailProjectEditorMeta.textContent = `${PROJECT_SECTION_LABELS[task.section_id] || task.section_title || ''}`;
  elements.projectCurrentStep.disabled = isPending;
  elements.projectTaskType.disabled = isPending;
  elements.projectNextStep.disabled = isPending;
  elements.projectBlocker.disabled = isPending;
  elements.projectNotes.disabled = isPending;
  elements.projectCanonicalLink.disabled = isPending;
  elements.projectOutput.disabled = isPending;
  elements.projectCurrentStep.value = task.current_step || '';
  elements.projectTaskType.value = task.type || '';
  elements.projectNextStep.value = task.next_step || '';
  elements.projectBlocker.value = task.blocker || '';
  elements.projectNotes.value = task.notes || '';
  elements.projectCanonicalLink.value = task.canonical_link || '';
  elements.projectOutput.value = task.output || '';
  elements.projectSaveButton.disabled = isPending;
}

function renderProjectTaskActionPanel(task) {
  const isPending = state.projectPending || state.actionPending || state.threadPending || state.opsPending;
  const sectionOrder = ['inbox', 'ready', 'running', 'waiting', 'done'];
  const buttons = sectionOrder
    .filter((sectionId) => sectionId !== task.section_id)
    .map((sectionId) => ({
      action: sectionId,
      label: `移动到${PROJECT_SECTION_LABELS[sectionId] || sectionId}`,
      className: sectionId === 'running' || sectionId === 'done' ? 'button button-primary' : 'button'
    }));

  elements.detailActionPanel.hidden = false;
  elements.detailActionActor.disabled = true;
  elements.detailActionNote.disabled = true;
  elements.detailActionDeferUntil.disabled = true;
  elements.detailActionBar.innerHTML = buttons.length > 0
    ? buttons.map((button) => `
        <button
          class="${button.className}"
          data-project-move="${escapeHtml(button.action)}"
          type="button"
          ${isPending ? 'disabled' : ''}
        >
          ${escapeHtml(button.label)}
        </button>
      `).join('')
    : '<div class="empty-state">当前任务已经在最终阶段。</div>';

  if (state.projectActionFeedback && state.projectActionFeedback.taskId === task.id) {
    elements.detailActionStatus.textContent = state.projectActionFeedback.message;
    elements.detailActionStatus.className = `detail-action-status is-${state.projectActionFeedback.tone}`;
  } else {
    elements.detailActionStatus.textContent = '';
    elements.detailActionStatus.className = 'detail-action-status';
  }

  document.querySelectorAll('[data-project-move]').forEach((button) => {
    button.addEventListener('click', () => {
      runProjectTaskMove(button.dataset.projectMove);
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

  if (state.detailMode === 'project_task') {
    renderProjectTaskActionPanel(item);
    return;
  }

  if (state.detailMode === 'project_material' || state.detailMode === 'project_overview') {
    elements.detailActionPanel.hidden = true;
    elements.detailActionBar.innerHTML = '';
    elements.detailActionStatus.textContent = '';
    elements.detailActionStatus.className = 'detail-action-status';
    state.detailDeferMode = '';
    elements.detailActionDeferUntil.value = '';
    syncDeferInputs();
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
  const buttons = buildQueueActionButtons(item);

  elements.detailActionPanel.hidden = false;
  elements.detailActionActor.value = state.actor;
  elements.detailActionActor.disabled = isPending;
  elements.detailActionNote.disabled = isPending;
  state.detailDeferMode = item.action_state === 'deferred' && Boolean(item.review_defer_until) ? 'queue' : '';
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

function renderProjectOverviewDetail(project) {
  closeDetailModal();
  elements.detailTitle.textContent = project.project || '项目总览';
  elements.detailSubtitle.textContent = `${project.total_tasks || 0} 条推进任务 · ${(project.materials || []).length || 0} 份资料 · ${project.total_queue_items || 0} 个相关入口`;
  elements.primaryJsonTitle.textContent = '项目推进';
  elements.secondaryJsonTitle.textContent = '项目资料';

  const summaryLines = (project.focus_cards || []).map((card) => `
    <div class="meta-pair">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(String(card.count || 0))}</strong>
      <em class="insight-subtext">${escapeHtml(card.note || '—')}</em>
    </div>
  `).join('');
  elements.detailInsightCore.style.display = '';
  elements.detailInsightCore.innerHTML = `<div class="insight-label">项目状态</div><div class="insight-meta-grid">${summaryLines}</div>`;

  const diagLines = [];
  if (project.blockers && project.blockers.length > 0) {
    diagLines.push(`<div class="insight-flag flag-warn">当前 blocker：${escapeHtml(project.blockers[0].blocker || project.blockers[0].title || '—')}</div>`);
  }
  if (project.next_steps && project.next_steps.length > 0) {
    diagLines.push(`<div class="insight-flag flag-info">最优先 next step：${escapeHtml(project.next_steps[0].next_step || project.next_steps[0].title || '—')}</div>`);
  }
  if ((project.learned || []).length > 0) {
    diagLines.push(`<div class="insight-flag flag-info">已沉淀 ${(project.learned || []).length} 条经验，可直接复用</div>`);
  }
  elements.detailInsightDiagnosis.style.display = diagLines.length ? '' : 'none';
  elements.detailInsightDiagnosis.innerHTML = diagLines.length
    ? `<div class="insight-label">当前焦点</div>${diagLines.join('')}`
    : '';

  const metaRows = [
    ['项目', project.project],
    ['推进任务', String(project.total_tasks || 0)],
    ['相关入口', String(project.total_queue_items || 0)],
    ['资料数', String((project.materials || []).length)],
    ['阻塞数', String((project.blockers || []).length)],
    ['Next Step', String((project.next_steps || []).length)]
  ];
  elements.detailInsightMetadata.innerHTML = `<div class="insight-meta-grid">${metaRows.map(([label, value]) => `<div class="meta-pair"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`;
  elements.queueJson.textContent = JSON.stringify(project.tasks_by_section || [], null, 2);
  elements.approvalJson.textContent = JSON.stringify(project.material_groups || [], null, 2);

  const boardPath = (state.data.project_hub && state.data.project_hub.path) || '';
  renderContextPanel(boardPath ? [{
    kind: 'link',
    label: '打开总看板文件',
    href: toLocalFileHref(boardPath)
  }] : []);
  renderActionLogPanel(null);
  renderActionPanel(project);
  hideProjectEditor();
  renderSourcePreview(null);
}

function renderProjectTaskDetail(task, project) {
  elements.detailTitle.textContent = task.task || '项目任务';
  elements.detailSubtitle.textContent = `${project.project} · ${PROJECT_SECTION_LABELS[task.section_id] || task.section_title || '任务'}`;
  elements.primaryJsonTitle.textContent = '任务数据';
  elements.secondaryJsonTitle.textContent = '项目资料';

  const coreRows = [
    task.current_step ? ['当前步骤', task.current_step] : null,
    task.next_step ? ['下一步', task.next_step] : null,
    task.blocker ? ['Blocker', task.blocker] : null,
    task.notes ? ['备注', task.notes] : null
  ].filter(Boolean);
  elements.detailInsightCore.style.display = '';
  elements.detailInsightCore.innerHTML = `
    <div class="insight-label">推进层</div>
    <p class="insight-headline">${escapeHtml(task.task || '未命名任务')}</p>
    <div class="insight-meta-grid">
      ${coreRows.map(([label, value]) => `<div class="meta-pair"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
    </div>
  `;

  const diagLines = [];
  diagLines.push(`<div class="insight-flag flag-info">当前阶段：${escapeHtml(PROJECT_SECTION_LABELS[task.section_id] || task.section_title || '—')}</div>`);
  if (task.type) {
    diagLines.push(`<div class="insight-flag flag-info">任务类型：${escapeHtml(task.type)}</div>`);
  }
  if (task.canonical_link || task.output) {
    diagLines.push('<div class="insight-flag flag-info">这张卡已挂接项目资料，可直接切到资料层查看。</div>');
  }
  elements.detailInsightDiagnosis.style.display = '';
  elements.detailInsightDiagnosis.innerHTML = `<div class="insight-label">任务判断</div>${diagLines.join('')}`;

  const relatedMaterials = (project.materials || []).filter((item) => item.task_id === task.id);
  const metaRows = [
    ['项目', project.project],
    ['阶段', PROJECT_SECTION_LABELS[task.section_id] || task.section_title],
    ['类型', task.type],
    ['资料数', String(relatedMaterials.length)],
    ['Canonical Link', task.canonical_link],
    ['Output', task.output]
  ].filter(([, value]) => value && value !== '0');
  elements.detailInsightMetadata.innerHTML = `<div class="insight-meta-grid">${metaRows.map(([label, value]) => `<div class="meta-pair"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`;
  elements.queueJson.textContent = JSON.stringify(task, null, 2);
  elements.approvalJson.textContent = JSON.stringify(relatedMaterials, null, 2);

  const contextActions = [];
  if (task.canonical_link) {
    contextActions.push({ kind: 'copy', label: '复制资料链接', value: task.canonical_link });
  }
  if (task.output) {
    contextActions.push({ kind: 'copy', label: '复制产出', value: task.output });
  }
  renderContextPanel(contextActions);
  renderActionLogPanel(null);
  renderActionPanel(task);
  renderProjectTaskEditor(task);
  renderSourcePreview(null);
}

function renderProjectMaterialDetail(material, project) {
  elements.detailTitle.textContent = material.label || material.title || '项目资料';
  elements.detailSubtitle.textContent = `${project.project} · ${material.bucket_label || '资料层'}`;
  elements.primaryJsonTitle.textContent = '资料信息';
  elements.secondaryJsonTitle.textContent = '关联任务';

  elements.detailInsightCore.style.display = '';
  elements.detailInsightCore.innerHTML = `
    <div class="insight-label">资料层</div>
    <p class="insight-headline">${escapeHtml(material.label || material.title || '未命名资料')}</p>
    <div class="insight-meta-grid">
      <div class="meta-pair"><span>归属</span><strong>${escapeHtml(material.bucket_label || '资料')}</strong></div>
      <div class="meta-pair"><span>来源</span><strong>${escapeHtml(material.kind || 'reference')}</strong></div>
      ${material.task_title ? `<div class="meta-pair"><span>关联任务</span><strong>${escapeHtml(material.task_title)}</strong></div>` : ''}
    </div>
  `;

  elements.detailInsightDiagnosis.style.display = material.note ? '' : 'none';
  elements.detailInsightDiagnosis.innerHTML = material.note
    ? `<div class="insight-label">补充说明</div><div class="insight-flag flag-info">${escapeHtml(material.note)}</div>`
    : '';

  const metaRows = [
    ['项目', project.project],
    ['资料层', material.bucket_label],
    ['路径', material.relative_path],
    ['任务', material.task_title],
    ['平台', material.platform],
    ['类别', material.category]
  ].filter(([, value]) => value);
  elements.detailInsightMetadata.innerHTML = `<div class="insight-meta-grid">${metaRows.map(([label, value]) => `<div class="meta-pair"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`;
  elements.queueJson.textContent = JSON.stringify(material, null, 2);
  elements.approvalJson.textContent = JSON.stringify(
    material.task_id
      ? ((project.tasks_by_section || []).flatMap((section) => section.items || []).find((item) => item.id === material.task_id) || {})
      : {},
    null,
    2
  );

  const contextActions = [];
  if (material.absolute_path) {
    contextActions.push({
      kind: 'link',
      label: '打开资料文件',
      href: toLocalFileHref(material.absolute_path)
    });
  }
  if (material.task_id) {
    contextActions.push({
      kind: 'nav',
      label: '跳到关联任务',
      target: `project-task:${material.task_id}`
    });
  }
  renderContextPanel(contextActions);
  renderActionLogPanel(null);
  renderActionPanel(material);
  hideProjectEditor();
  renderSourcePreview(null);
}

function renderQueueDetail(item) {
  hideProjectEditor();
  elements.detailTitle.textContent = item.title || '内容详情';
  elements.detailSubtitle.textContent = getQueueSubtitle(item);
  elements.primaryJsonTitle.textContent = '原始内容';
  elements.secondaryJsonTitle.textContent = '原始审核';

  const reviewhubContext = item.raw && item.raw.queue && item.raw.queue.reviewhub && item.raw.queue.reviewhub.context
    ? item.raw.queue.reviewhub.context
    : null;
  const acceptanceItems = reviewhubContext && Array.isArray(reviewhubContext.acceptance_items)
    ? reviewhubContext.acceptance_items
    : [];
  const projectWorkItems = reviewhubContext && Array.isArray(reviewhubContext.work_items)
    ? reviewhubContext.work_items
    : [];
  const projectObjective = reviewhubContext && reviewhubContext.objective ? reviewhubContext.objective : '';
  const projectProgress = reviewhubContext && reviewhubContext.progress_summary ? reviewhubContext.progress_summary : '';

  const noteLines = cleanClientValue(item.notes)
    ? item.notes.split(/\n+/).map((line) => line.trim()).filter(Boolean)
    : [];

  const structuredPairs = [];
  noteLines.forEach((line) => {
    const match = line.match(/^([^：:]+)[：:](.+)$/);
    if (match) {
      structuredPairs.push([match[1].trim(), match[2].trim()]);
    }
  });

  const pairValue = (keywords) => {
    const found = structuredPairs.find(([label]) => keywords.some((keyword) => label.includes(keyword)));
    return found ? found[1] : '';
  };

  const videoTitle = reviewhubContext && reviewhubContext.video_title
    ? reviewhubContext.video_title
    : pairValue(['视频']);
  const videoIntro = reviewhubContext && reviewhubContext.video_intro
    ? reviewhubContext.video_intro
    : pairValue(['视频简介', '投稿文案', '简介']);
  const sourceVideoUrl = reviewhubContext && reviewhubContext.source_video_url
    ? reviewhubContext.source_video_url
    : pairValue(['视频链接', '来源链接']);
  const originalComment = reviewhubContext && reviewhubContext.original_comment
    ? reviewhubContext.original_comment
    : pairValue(['对方原话', '原评论原文', '评论原文']);
  const pendingComment = originalComment || pairValue(['待处理评论', '评论背景', '评论']);
  const suggestionLine = reviewhubContext && reviewhubContext.suggested_reply
    ? reviewhubContext.suggested_reply
    : pairValue(['建议回复', '建议处理']);
  const whyReviewLine = reviewhubContext && reviewhubContext.why_review
    ? reviewhubContext.why_review
    : cleanClientValue(item.reason) || pairValue(['为什么', '拍板原因']);
  const options = reviewhubContext && Array.isArray(reviewhubContext.options)
    ? reviewhubContext.options.filter(Boolean)
    : [];
  const extraPairs = structuredPairs.filter(([label]) => !['视频', '待处理评论', '评论背景', '评论', '建议回复', '建议处理', '为什么', '拍板原因', '审批选项'].some((keyword) => label.includes(keyword)));

  const coreLines = [];
  if (item.title) coreLines.push(`<p class="insight-headline">${escapeHtml(item.title)}</p>`);
  const primaryPairs = [
    videoTitle ? ['视频', videoTitle] : null,
    pendingComment ? ['待处理评论', pendingComment] : null,
    ...extraPairs
  ].filter(Boolean);
  if (primaryPairs.length > 0) {
    coreLines.push(`<div class="insight-meta-grid">${primaryPairs.map(([label, value]) => `<div class="meta-pair"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`);
  }
  if (whyReviewLine) {
    coreLines.push(`<div class="insight-flag flag-warn">为什么要你拍板：${escapeHtml(whyReviewLine)}</div>`);
  }
  if (projectObjective) {
    coreLines.push(`<div class="insight-label" style="margin-top: 12px;">项目目标</div><p class="insight-body">${escapeHtml(projectObjective)}</p>`);
  }
  if (projectProgress) {
    coreLines.push(`<div class="insight-label" style="margin-top: 12px;">当前进度</div><p class="insight-body">${escapeHtml(projectProgress)}</p>`);
  }
  if (projectWorkItems.length > 0) {
    coreLines.push(`<div class="insight-label" style="margin-top: 12px;">项目事项</div><div class="insight-meta-grid">${projectWorkItems.map((entry, index) => `<div class="meta-pair"><span>${index + 1}. ${escapeHtml(entry.name || '未命名项')}</span><strong>${escapeHtml(entry.status || '未标记')}</strong><em class="insight-subtext">${escapeHtml(entry.detail || '')}</em></div>`).join('')}</div>`);
  } else if (acceptanceItems.length > 0) {
    coreLines.push(`<div class="insight-label" style="margin-top: 12px;">验收子项</div><div class="insight-meta-grid">${acceptanceItems.map((entry, index) => `<div class="meta-pair"><span>${index + 1}. ${escapeHtml(entry.name || '未命名项')}</span><strong>${escapeHtml(entry.status || '未标记')}</strong><em class="insight-subtext">${escapeHtml(entry.detail || '')}</em></div>`).join('')}</div>`);
  }
  if (videoIntro) {
    coreLines.push(`<div class="insight-label" style="margin-top: 12px;">视频简介 / 投稿文案</div><p class="insight-body">${escapeHtml(videoIntro)}</p>`);
  }
  if (sourceVideoUrl) {
    coreLines.push(`<div class="insight-label" style="margin-top: 12px;">来源视频链接</div><p class="insight-body">${escapeHtml(sourceVideoUrl)}</p>`);
  }
  if (suggestionLine) {
    coreLines.push(`<div class="insight-label" style="margin-top: 12px;">建议处理</div><p class="insight-body">${escapeHtml(suggestionLine)}</p>`);
  }
  if (options.length > 0) {
    coreLines.push(`<div class="insight-label" style="margin-top: 12px;">可选操作</div><div class="tag-group quick-decision-group">${options.map((option) => `<button type="button" class="button button-sm quick-decision-button" data-decision-option="${escapeHtml(option)}" data-suggested-reply="${escapeHtml(suggestionLine || '')}">${escapeHtml(option)}</button>`).join('')}</div>`);
  }
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
  const statusVal = getQueueStageLabel(item);
  if (statusVal) diagLines.push(`<div class="insight-flag flag-info">当前阶段：${escapeHtml(statusVal)}</div>`);
  const hasDiag = diagLines.length > 0;
  elements.detailInsightDiagnosis.style.display = hasDiag ? '' : 'none';
  elements.detailInsightDiagnosis.innerHTML = hasDiag
    ? `<div class="insight-label">审核诊断</div>${diagLines.join('')}`
    : '';

  // ---- METADATA: Audit trail details ----
  const metaRows = [
    ['类型', getQueueItemTypeLabel(item)],
    ['阶段', getQueueStageLabel(item)],
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
  hideProjectEditor();
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
  hideProjectEditor();
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
    closeDetailModal();
    hideProjectEditor();
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
    syncDetailModal();
    return;
  }

  if (mode === 'ops') {
    renderOperationsDetail(item);
    syncDetailModal();
    return;
  }

  renderQueueDetail(item);
  syncDetailModal();
}

function renderDetailForCurrentMode(queueFallbackMessage, selectedQueueItem = null) {
  if (state.activeSection === 'projects' || ['project_task', 'project_material', 'project_overview'].includes(state.detailMode)) {
    const selectedProject = getSelectedProjectProfile();

    if (!selectedProject) {
      renderDetail(null, 'queue', '当前还没有可展示的项目。');
      hideProjectEditor();
      return;
    }

    if (state.detailMode === 'project_task' && state.selectedProjectTaskId) {
      const task = getSelectedProjectTask();
      if (task) {
        elements.detailEmpty.hidden = true;
        elements.detailView.hidden = false;
        renderProjectTaskDetail(task, selectedProject);
        syncDetailModal();
        return;
      }
    }

    if (state.detailMode === 'project_material' && state.selectedProjectMaterialId) {
      const material = getSelectedProjectMaterial();
      if (material) {
        elements.detailEmpty.hidden = true;
        elements.detailView.hidden = false;
        renderProjectMaterialDetail(material, selectedProject);
        syncDetailModal();
        return;
      }
    }

    if (state.activeSection === 'projects' || state.detailMode === 'project_overview') {
      state.detailMode = 'project_overview';
      renderProjectOverviewDetail(selectedProject);
      return;
    }
  }

  if (state.activeSection === 'overview') {
    closeDetailModal();
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

  const nextSelectionId = item.id;
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

async function runProjectTaskMove(sectionId) {
  const task = getSelectedProjectTask();
  const project = getSelectedProjectProfile();

  if (!task || !project || state.projectPending) {
    return;
  }

  state.projectPending = true;
  state.projectActionFeedback = {
    taskId: task.id,
    tone: 'success',
    message: '正在移动任务阶段…'
  };
  renderActionPanel(task);
  renderProjectTaskEditor(task);

  try {
    const response = await fetch(`/api/project-board/${encodeURIComponent(task.id)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        action: 'move',
        section_id: sectionId
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload && payload.error ? payload.error : `提交失败（HTTP ${response.status}）`);
    }

    state.projectActionFeedback = {
      taskId: task.id,
      tone: 'success',
      message: `已移动到${PROJECT_SECTION_LABELS[sectionId] || sectionId}`
    };
    setFlashMessage(`已移动到${PROJECT_SECTION_LABELS[sectionId] || sectionId}`);
    await loadData({
      activeSection: 'projects',
      detailMode: 'project_task',
      selectedProjectName: project.project,
      selectedProjectTaskId: payload.item_id,
      selectedProjectMaterialId: '',
      projectView: 'progress'
    });
  } catch (error) {
    state.projectActionFeedback = {
      taskId: task.id,
      tone: 'error',
      message: error.message || '移动任务失败。'
    };
    renderActionPanel(task);
  } finally {
    state.projectPending = false;
    const selectedTask = getSelectedProjectTask();
    if (selectedTask) {
      renderActionPanel(selectedTask);
      renderProjectTaskEditor(selectedTask);
    }
  }
}

async function runProjectTaskSave() {
  const task = getSelectedProjectTask();
  const project = getSelectedProjectProfile();

  if (!task || !project || state.projectPending) {
    return;
  }

  state.projectPending = true;
  state.projectActionFeedback = {
    taskId: task.id,
    tone: 'success',
    message: '正在保存项目任务…'
  };
  renderActionPanel(task);
  elements.projectSaveButton.disabled = true;

  try {
    const response = await fetch(`/api/project-board/${encodeURIComponent(task.id)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        action: 'update',
        fields: {
          type: elements.projectTaskType.value,
          current_step: elements.projectCurrentStep.value,
          next_step: elements.projectNextStep.value,
          blocker: elements.projectBlocker.value,
          notes: elements.projectNotes.value,
          canonical_link: elements.projectCanonicalLink.value,
          output: elements.projectOutput.value
        }
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload && payload.error ? payload.error : `提交失败（HTTP ${response.status}）`);
    }

    state.projectActionFeedback = {
      taskId: task.id,
      tone: 'success',
      message: '项目任务已保存'
    };
    setFlashMessage('项目任务已保存');
    await loadData({
      activeSection: 'projects',
      detailMode: 'project_task',
      selectedProjectName: project.project,
      selectedProjectTaskId: payload.item_id || task.id,
      selectedProjectMaterialId: '',
      projectView: state.projectView
    });
  } catch (error) {
    state.projectActionFeedback = {
      taskId: task.id,
      tone: 'error',
      message: error.message || '保存任务失败。'
    };
    renderActionPanel(task);
  } finally {
    state.projectPending = false;
    elements.projectSaveButton.disabled = false;
    const selectedTask = getSelectedProjectTask();
    if (selectedTask) {
      renderActionPanel(selectedTask);
      renderProjectTaskEditor(selectedTask);
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
  const previousSelectedProjectName = Object.prototype.hasOwnProperty.call(options, 'selectedProjectName')
    ? options.selectedProjectName
    : state.selectedProjectName;
  const previousSelectedProjectTaskId = Object.prototype.hasOwnProperty.call(options, 'selectedProjectTaskId')
    ? options.selectedProjectTaskId
    : state.selectedProjectTaskId;
  const previousSelectedProjectMaterialId = Object.prototype.hasOwnProperty.call(options, 'selectedProjectMaterialId')
    ? options.selectedProjectMaterialId
    : state.selectedProjectMaterialId;
  const previousProjectView = Object.prototype.hasOwnProperty.call(options, 'projectView')
    ? options.projectView
    : state.projectView;

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
    state.selectedProjectName = previousSelectedProjectName;
    state.selectedProjectTaskId = previousSelectedProjectTaskId;
    state.selectedProjectMaterialId = previousSelectedProjectMaterialId;
    state.projectView = previousProjectView;
    setFilterAvailability(false);
    renderWorkspaceHighlights();
    renderWorkboard();
    renderProjectBoard();
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
    state.detailModalOpen = false;
    syncDetailModal();
    clearFlashBanner();
    state.detailMode = 'queue';
    state.selectedId = null;
    state.selectedThreadId = null;
    state.selectedOpsRecordId = null;
    state.selectedProjectName = '';
    state.selectedProjectTaskId = '';
    state.selectedProjectMaterialId = '';
    state.actionPending = false;
    state.threadPending = false;
    state.opsPending = false;
    state.projectPending = false;
    elements.summaryCards.innerHTML = '';
    elements.workspaceHighlights.innerHTML = '';
    if (elements.workboardMeta) {
      elements.workboardMeta.textContent = '';
    }
    if (elements.workboardBoard) {
      elements.workboardBoard.innerHTML = '<div class="empty-state">工作台数据暂时不可用。</div>';
    }
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
elements.projectSaveButton.addEventListener('click', runProjectTaskSave);
if (elements.detailCloseButton) {
  elements.detailCloseButton.addEventListener('click', closeDetailModal);
}
if (elements.detailModalBackdrop) {
  elements.detailModalBackdrop.addEventListener('click', closeDetailModal);
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.detailModalOpen) {
    closeDetailModal();
  }
});
window.addEventListener('resize', syncDetailModal);
if (elements.filterResetButton) {
  elements.filterResetButton.addEventListener('click', handleFilterReset);
}

attachWorkspaceNavigation();
renderWorkspaceSections();
loadData();
