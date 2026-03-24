const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function writePacket(runsRoot, runDate, replyId, overrides = {}) {
  const packetDir = path.join(runsRoot, runDate, 'replies', replyId);
  fs.mkdirSync(packetDir, { recursive: true });
  writeJson(path.join(packetDir, 'packet.json'), {
    packet_version: '1.0',
    created_at_utc: `${runDate}T00:00:00Z`,
    run_date: runDate,
    reply_id: replyId,
    execution_context: {
      platform: overrides.platform || 'reddit',
      target_url: overrides.target_url || 'https://example.com/thread',
      approval_ticket: overrides.approval_ticket || `${replyId}-ticket`
    },
    classification: {
      bucket: overrides.bucket || 'B',
      score: overrides.score || 5,
      manual_required: overrides.manual_required || false
    },
    reply: {
      needs_manual_review: overrides.needs_manual_review || false,
      draft_text: overrides.draft_text || 'Thread update.'
    }
  });
  return packetDir;
}

function writeJob(packetDir, overrides = {}) {
  writeJson(path.join(packetDir, 'browser_reply_job.json'), {
    job_version: 'lobster.browser.reply.fill.v1',
    reply_id: overrides.reply_id || 'reply',
    selectors: overrides.selectors || { ready: ['body'], composer: ['textarea'], submit: ['button'] },
    gates: overrides.gates || { publish_ready: true, blocked_reasons: [] }
  });
}

function withThreadActionFixtures(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-thread-actions-test-'));
  const approvalPath = path.join(tempDir, 'approval_registry.json');
  const queuePath = path.join(tempDir, 'daily_channel_queue.json');
  const operationsRoot = path.join(tempDir, 'ops-root');
  const runsRoot = path.join(operationsRoot, 'Ops', 'runs');
  const reviewIndexPath = path.join(operationsRoot, 'Ops', 'state', 'review_index.md');
  const experimentLogPath = path.join(operationsRoot, 'Ops', 'state', 'experiment_log.md');
  const threadActionLogPath = path.join(operationsRoot, 'Ops', 'state', 'reviewhub_thread_action_log.ndjson');
  const previousEnv = {
    APPROVAL_REGISTRY_PATH: process.env.APPROVAL_REGISTRY_PATH,
    DAILY_CHANNEL_QUEUE_PATH: process.env.DAILY_CHANNEL_QUEUE_PATH,
    REVIEWHUB_OPERATIONS_ROOT: process.env.REVIEWHUB_OPERATIONS_ROOT,
    REVIEWHUB_OPS_RUNS_ROOT: process.env.REVIEWHUB_OPS_RUNS_ROOT,
    REVIEW_INDEX_PATH: process.env.REVIEW_INDEX_PATH,
    EXPERIMENT_LOG_PATH: process.env.EXPERIMENT_LOG_PATH,
    REVIEWHUB_THREAD_ACTION_LOG_PATH: process.env.REVIEWHUB_THREAD_ACTION_LOG_PATH
  };
  const dashboardModulePath = path.resolve(__dirname, '..', 'lib', 'dashboard.js');
  const threadActionsModulePath = path.resolve(__dirname, '..', 'lib', 'threadActions.js');

  writeJson(approvalPath, {
    schema_version: 'test',
    updated_at_utc: '2026-03-24T00:00:00.000Z',
    entries: []
  });
  writeJson(queuePath, {
    schema_version: 'test',
    run_date: '2026-03-24',
    items: [],
    status_counts: {}
  });
  fs.mkdirSync(path.dirname(reviewIndexPath), { recursive: true });
  fs.writeFileSync(reviewIndexPath, '# Review Index\n\nDate: 2026-03-24\n');
  fs.writeFileSync(experimentLogPath, '# Experiment Log\n\nDate: 2026-03-24\n');
  fs.writeFileSync(threadActionLogPath, '');

  const packetDir = writePacket(runsRoot, '2026-03-25', 'thread-action-001', {
    manual_required: true,
    draft_text: 'Need operator review.'
  });
  writeJob(packetDir, { reply_id: 'thread-action-001' });

  process.env.APPROVAL_REGISTRY_PATH = approvalPath;
  process.env.DAILY_CHANNEL_QUEUE_PATH = queuePath;
  process.env.REVIEWHUB_OPERATIONS_ROOT = operationsRoot;
  process.env.REVIEWHUB_OPS_RUNS_ROOT = runsRoot;
  process.env.REVIEW_INDEX_PATH = reviewIndexPath;
  process.env.EXPERIMENT_LOG_PATH = experimentLogPath;
  process.env.REVIEWHUB_THREAD_ACTION_LOG_PATH = threadActionLogPath;

  delete require.cache[dashboardModulePath];
  delete require.cache[threadActionsModulePath];

  try {
    const dashboardModule = require(dashboardModulePath);
    const threadActionsModule = require(threadActionsModulePath);
    return callback({
      dashboardModule,
      threadActionsModule,
      threadActionLogPath
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
    delete require.cache[threadActionsModulePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test('thread action marks a thread done and exposes updated review state', () => {
  withThreadActionFixtures(({ threadActionsModule, threadActionLogPath }) => {
    const result = threadActionsModule.applyThreadAction({
      replyId: 'thread-action-001',
      action: 'mark_done',
      actor: '@tester',
      note: '已人工处理'
    });

    assert.equal(result.ok, true);
    assert.equal(result.thread.reply_id, 'thread-action-001');
    assert.equal(result.thread.review_state, 'done');
    assert.equal(result.thread.review_note, '已人工处理');
    assert.match(fs.readFileSync(threadActionLogPath, 'utf8'), /"action":"mark_done"/);
  });
});

test('restore_auto clears the manual thread review state back to inferred state', () => {
  withThreadActionFixtures(({ threadActionsModule }) => {
    threadActionsModule.applyThreadAction({
      replyId: 'thread-action-001',
      action: 'mark_follow_up',
      actor: '@tester',
      note: '稍后继续'
    });

    let result = threadActionsModule.applyThreadAction({
      replyId: 'thread-action-001',
      action: 'restore_auto',
      actor: '@tester',
      note: '恢复系统判断'
    });

    assert.equal(result.ok, true);
    assert.equal(result.thread.review_state, 'needs_reply');
    assert.equal(result.thread.review_override, false);
  });
});
