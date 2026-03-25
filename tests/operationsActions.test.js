const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function writeReviewIndex(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    [
      '# Review Index',
      '',
      'Date: 2026-03-25',
      '',
      '| date_yyyy_mm_dd_ | job | focus | status | follow_up_owner | blocker_notes |',
      '| --- | --- | --- | --- | --- | --- |',
      '| 2026-03-25 | Review pricing page | Messaging | red | ops | Needs manual fix |'
    ].join('\n')
  );
}

function withOpsActionFixtures(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-ops-actions-test-'));
  const approvalPath = path.join(tempDir, 'approval_registry.json');
  const queuePath = path.join(tempDir, 'daily_channel_queue.json');
  const operationsRoot = path.join(tempDir, 'ops-root');
  const stateDir = path.join(operationsRoot, 'Ops', 'state');
  const runsRoot = path.join(operationsRoot, 'Ops', 'runs');
  const reviewIndexPath = path.join(stateDir, 'review_index.md');
  const experimentLogPath = path.join(stateDir, 'experiment_log.md');
  const opsActionLogPath = path.join(stateDir, 'reviewhub_ops_action_log.ndjson');
  const previousEnv = {
    APPROVAL_REGISTRY_PATH: process.env.APPROVAL_REGISTRY_PATH,
    DAILY_CHANNEL_QUEUE_PATH: process.env.DAILY_CHANNEL_QUEUE_PATH,
    REVIEWHUB_OPERATIONS_ROOT: process.env.REVIEWHUB_OPERATIONS_ROOT,
    REVIEWHUB_OPS_RUNS_ROOT: process.env.REVIEWHUB_OPS_RUNS_ROOT,
    REVIEW_INDEX_PATH: process.env.REVIEW_INDEX_PATH,
    EXPERIMENT_LOG_PATH: process.env.EXPERIMENT_LOG_PATH,
    REVIEWHUB_OPS_ACTION_LOG_PATH: process.env.REVIEWHUB_OPS_ACTION_LOG_PATH
  };
  const dashboardModulePath = path.resolve(__dirname, '..', 'lib', 'dashboard.js');
  const operationsActionsModulePath = path.resolve(__dirname, '..', 'lib', 'operationsActions.js');

  writeJson(approvalPath, {
    schema_version: 'test',
    updated_at_utc: '2026-03-25T00:00:00.000Z',
    entries: []
  });
  writeJson(queuePath, {
    schema_version: 'test',
    run_date: '2026-03-25',
    items: [],
    status_counts: {}
  });
  writeReviewIndex(reviewIndexPath);
  fs.writeFileSync(experimentLogPath, '# Experiment Log\n\nDate: 2026-03-25\n');
  fs.mkdirSync(runsRoot, { recursive: true });
  fs.writeFileSync(opsActionLogPath, '');

  process.env.APPROVAL_REGISTRY_PATH = approvalPath;
  process.env.DAILY_CHANNEL_QUEUE_PATH = queuePath;
  process.env.REVIEWHUB_OPERATIONS_ROOT = operationsRoot;
  process.env.REVIEWHUB_OPS_RUNS_ROOT = runsRoot;
  process.env.REVIEW_INDEX_PATH = reviewIndexPath;
  process.env.EXPERIMENT_LOG_PATH = experimentLogPath;
  process.env.REVIEWHUB_OPS_ACTION_LOG_PATH = opsActionLogPath;

  delete require.cache[dashboardModulePath];
  delete require.cache[operationsActionsModulePath];

  try {
    const dashboardModule = require(dashboardModulePath);
    const operationsActionsModule = require(operationsActionsModulePath);
    return callback({
      dashboardModule,
      operationsActionsModule,
      opsActionLogPath
    });
  } finally {
    Object.entries(previousEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });

    delete require.cache[dashboardModulePath];
    delete require.cache[operationsActionsModulePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test('ops action marks review records done and removes them from the processing lane', () => {
  withOpsActionFixtures(({ dashboardModule, operationsActionsModule, opsActionLogPath }) => {
    const initialDashboard = dashboardModule.loadDashboardData();
    const reviewRecord = initialDashboard.operations_record_catalog.find((record) => record.ui_id === 'review:0');
    assert.ok(reviewRecord);
    assert.equal(
      initialDashboard.daily_processing_queue.entries.some((entry) => entry.id === 'review:0'),
      true
    );

    const result = operationsActionsModule.applyOpsAction({
      actionId: reviewRecord.action_id,
      action: 'mark_done',
      actor: '@tester',
      note: '已完成跟进'
    });

    assert.equal(result.ok, true);
    assert.equal(result.record.review_state, 'done');
    assert.match(fs.readFileSync(opsActionLogPath, 'utf8'), /"action":"mark_done"/);

    const updatedDashboard = dashboardModule.loadDashboardData();
    const updatedRecord = updatedDashboard.operations_record_catalog.find((record) => record.ui_id === 'review:0');
    assert.equal(updatedRecord.review_state, 'done');
    assert.equal(updatedDashboard.recent_activity.entries[0].kind, 'ops');
    assert.equal(updatedDashboard.signal_stream.entries.some((entry) => entry.signal_kind === 'ops_action'), true);
    assert.equal(
      updatedDashboard.daily_processing_queue.entries.some((entry) => entry.id === 'review:0'),
      false
    );
  });
});

test('ops defer action persists defer_until and can be restored back to automatic state', () => {
  withOpsActionFixtures(({ dashboardModule, operationsActionsModule }) => {
    const reviewRecord = dashboardModule.loadDashboardData().operations_record_catalog.find((record) => record.ui_id === 'review:0');
    const deferUntilUtc = '2026-03-30T03:00:00.000Z';

    operationsActionsModule.applyOpsAction({
      actionId: reviewRecord.action_id,
      action: 'mark_defer',
      actor: '@tester',
      note: '月底再处理',
      deferUntilUtc
    });

    let dashboard = dashboardModule.loadDashboardData();
    let updatedRecord = dashboard.operations_record_catalog.find((record) => record.ui_id === 'review:0');
    assert.equal(updatedRecord.review_state, 'defer');
    assert.equal(updatedRecord.review_defer_until, deferUntilUtc);
    assert.equal(
      dashboard.daily_processing_queue.entries.some((entry) => entry.id === 'review:0'),
      false
    );

    operationsActionsModule.applyOpsAction({
      actionId: reviewRecord.action_id,
      action: 'restore_auto',
      actor: '@tester',
      note: '恢复原始状态'
    });

    dashboard = dashboardModule.loadDashboardData();
    updatedRecord = dashboard.operations_record_catalog.find((record) => record.ui_id === 'review:0');
    assert.equal(updatedRecord.review_state, '');
    assert.equal(updatedRecord.review_override, false);
    assert.equal(updatedRecord.review_defer_until, '');
  });
});
