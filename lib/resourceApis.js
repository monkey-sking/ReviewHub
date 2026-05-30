const path = require('path');
const fs = require('fs');
const {
  loadDashboardData,
  buildDailyProcessingQueue,
  buildSignalStream,
  loadActionLog,
  loadThreadActionLog,
  loadOpsActionLog,
  readJsonSource,
  getApprovalPath,
  getQueuePath,
  validateApprovalData,
  validateQueueData,
  buildItems,
  buildOpsSnapshot,
  buildThreadStateMap,
  loadOperationsReviewData,
  buildOpsRecordStateMap,
  buildOperationsRecordCatalog,
  attachOpsStateToCatalog,
  loadProjectBoard,
  buildProjectHub,
  getOperationsRoot,
  DashboardDataError
} = require('./dashboard');

/**
 * 统一状态机映射逻辑 (对标 P0-3 规范)
 */
function mapToUnifiedState(item) {
  const internalState = item.action_state || item.status;
  
  if (item.is_automation) {
    if (item.kind === 'approval_request') return 'pending_approval';
    if (item.kind === 'support_required') return 'waiting_support';
    if (item.kind === 'execution_failed') return 'blocked';
    return item.status === 'pending' ? 'new' : item.status;
  }

  switch (internalState) {
    case 'needs_review': return 'pending_approval';
    case 'missing_info': return 'waiting_support';
    case 'ready_to_execute': return 'ready';
    case 'executing': return 'running';
    case 'done': return 'done';
    case 'archived': return 'ignored';
    case 'deferred': return 'ignored';
    default: return 'new';
  }
}

/**
 * 加载结构化的自动化处理结果
 */
function loadAutomationResults() {
  const filePath = path.join(getOperationsRoot(), 'Ops/state/inbox_automation_results.ndjson');
  if (!fs.existsSync(filePath)) return [];
  try {
    return fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch (err) {
    console.error('Failed to load automation results:', err);
    return [];
  }
}

/**
 * 获取内部数据上下文
 */
function getInternalContext() {
  const approvalPath = getApprovalPath();
  const queuePath = getQueuePath();
  const approvalResult = readJsonSource('approval_registry', approvalPath);
  const queueResult = readJsonSource('daily_channel_queue', queuePath);

  if (!approvalResult.ok || !queueResult.ok) {
    throw new DashboardDataError('无法加载核心数据源。');
  }

  const items = buildItems(queueResult.data, approvalResult.data);
  const actionLog = loadActionLog();
  const threadActionLog = loadThreadActionLog();
  const opsActionLog = loadOpsActionLog();

  const opsSnapshot = buildOpsSnapshot(queueResult.data, buildThreadStateMap(threadActionLog));

  let operationsReview;
  try {
    operationsReview = { available: true, ...loadOperationsReviewData() };
  } catch (e) {
    operationsReview = { available: false, issues: [{ message: e.message }] };
  }

  const opsRecordStateMap = buildOpsRecordStateMap(opsActionLog);
  const operationsRecordCatalog = attachOpsStateToCatalog(
    buildOperationsRecordCatalog(operationsReview),
    opsRecordStateMap
  );

  return {
    items,
    queueData: queueResult.data,
    approvalData: approvalResult.data,
    actionLog,
    threadActionLog,
    opsActionLog,
    opsSnapshot,
    operationsReview,
    operationsRecordCatalog,
    projectBoard: loadProjectBoard()
  };
}

/**
 * GET /api/workboard
 */
function getWorkboardData() {
  const ctx = getInternalContext();
  const queue = buildDailyProcessingQueue(
    ctx.items,
    ctx.operationsReview,
    ctx.opsSnapshot,
    ctx.operationsRecordCatalog
  );

  const entries = queue.entries.map(e => ({
    ...e,
    state: mapToUnifiedState(e)
  }));

  return {
    generated_at: new Date().toISOString(),
    total_entries: entries.length,
    high_priority_count: entries.filter(e => e.priority === 'high').length,
    entries: entries
  };
}

/**
 * GET /api/inbox
 */
function getInboxData() {
  const ctx = getInternalContext();
  const automationResults = loadAutomationResults();

  const mappedAutomation = automationResults.map(res => {
    const state = mapToUnifiedState({ ...res, is_automation: true });
    return {
      id: res.id,
      title: res.title,
      platform: res.source_task?.task_type || 'automation',
      project: res.project_id || 'unassigned',
      status: res.status,
      state: state,
      action_state: res.kind === 'approval_request' ? 'needs_review' : 'missing_info',
      action_label: (res.kind || 'unknown').replace('_', ' ').toUpperCase(),
      risk: res.severity || 'medium',
      owner: 'automation',
      missing_info: res.evidence?.error_excerpt ? [res.evidence.error_excerpt] : [],
      requested_at: res.created_at,
      evidence: res.evidence,
      retry: res.retry,
      is_automation: true
    };
  });

  const allItems = [...mappedAutomation, ...ctx.items.map(i => ({ ...i, state: mapToUnifiedState(i) }))];

  return {
    generated_at: new Date().toISOString(),
    items: allItems,
    summary: {
      total: allItems.length,
      needs_review: allItems.filter(i => i.state === 'pending_approval').length,
      ready: allItems.filter(i => i.state === 'ready').length,
      blocked: allItems.filter(i => i.state === 'waiting_support' || i.state === 'blocked').length
    }
  };
}

/**
 * GET /api/issues
 */
function getIssuesData() {
  const ctx = getInternalContext();
  const feedback = ctx.opsSnapshot.modules ? ctx.opsSnapshot.modules.feedback : null;

  return {
    generated_at: new Date().toISOString(),
    records: ctx.operationsRecordCatalog.map(r => ({ ...r, state: mapToUnifiedState(r) })),
    feedback: feedback ? {
      run_date: feedback.run_date,
      total_incidents: feedback.total_incidents,
      recent_incidents: feedback.recent_incidents,
      highlights: feedback.feedback_highlights
    } : null,
    summary: {
      total_records: ctx.operationsRecordCatalog.length,
      incident_count: feedback ? feedback.total_incidents : 0
    }
  };
}

/**
 * GET /api/projects
 */
function getProjectsData() {
  const ctx = getInternalContext();
  const hub = buildProjectHub(ctx.projectBoard, ctx.items, getOperationsRoot());

  return {
    generated_at: new Date().toISOString(),
    available: hub.available,
    workspace_summary: hub.workspace_summary,
    projects: hub.projects.map(p => ({
      project: p.project,
      total_tasks: p.total_tasks,
      total_queue_items: p.total_queue_items,
      section_counts: p.section_counts,
      progress_summary: p.progress_groups.map(g => ({ id: g.id, count: g.items.length })),
      focus_cards: p.focus_cards
    }))
  };
}

/**
 * GET /api/projects/:projectId
 */
function getProjectDetailData(projectId) {
  const ctx = getInternalContext();
  const hub = buildProjectHub(ctx.projectBoard, ctx.items, getOperationsRoot());
  const project = hub.projects.find(p => p.project === projectId);

  if (!project) {
    return null;
  }

  return {
    generated_at: new Date().toISOString(),
    ...project,
    tasks_by_section: project.tasks_by_section.map(s => ({
      ...s,
      items: s.items.map(i => ({ ...i, state: mapToUnifiedState(i) }))
    }))
  };
}

/**
 * GET /api/activity
 */
function getActivityData() {
  const ctx = getInternalContext();
  const signals = buildSignalStream(ctx.actionLog, ctx.threadActionLog, ctx.opsActionLog, ctx.opsSnapshot);

  return {
    generated_at: new Date().toISOString(),
    total_entries: signals.total_entries,
    entries: signals.entries
  };
}

module.exports = {
  getWorkboardData,
  getInboxData,
  getIssuesData,
  getProjectsData,
  getProjectDetailData,
  getActivityData
};
