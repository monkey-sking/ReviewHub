const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function withActionFixtures(approvalData, queueData, callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-queue-actions-test-'));
  const approvalPath = path.join(tempDir, 'approval_registry.json');
  const queuePath = path.join(tempDir, 'daily_channel_queue.json');
  const actionLogPath = path.join(tempDir, 'reviewhub_action_log.ndjson');
  const reviewIndexPath = path.join(tempDir, 'review_index.md');
  const experimentLogPath = path.join(tempDir, 'experiment_log.md');
  const runsDir = path.join(tempDir, 'runs');
  const previousEnv = {
    APPROVAL_REGISTRY_PATH: process.env.APPROVAL_REGISTRY_PATH,
    DAILY_CHANNEL_QUEUE_PATH: process.env.DAILY_CHANNEL_QUEUE_PATH,
    REVIEWHUB_ACTION_LOG_PATH: process.env.REVIEWHUB_ACTION_LOG_PATH,
    REVIEWHUB_OPERATIONS_ROOT: process.env.REVIEWHUB_OPERATIONS_ROOT,
    REVIEW_INDEX_PATH: process.env.REVIEW_INDEX_PATH,
    EXPERIMENT_LOG_PATH: process.env.EXPERIMENT_LOG_PATH,
    OPS_RUNS_DIR: process.env.OPS_RUNS_DIR
  };
  const dashboardModulePath = path.resolve(__dirname, '..', 'lib', 'dashboard.js');
  const queueActionsModulePath = path.resolve(__dirname, '..', 'lib', 'queueActions.js');

  fs.writeFileSync(approvalPath, JSON.stringify(approvalData, null, 2));
  fs.writeFileSync(queuePath, JSON.stringify(queueData, null, 2));
  fs.writeFileSync(reviewIndexPath, '# Review Index\n\nDate: 2026-03-24\n');
  fs.writeFileSync(experimentLogPath, '# Experiment Log\n\nDate: 2026-03-24\n');
  fs.mkdirSync(runsDir, { recursive: true });

  process.env.APPROVAL_REGISTRY_PATH = approvalPath;
  process.env.DAILY_CHANNEL_QUEUE_PATH = queuePath;
  process.env.REVIEWHUB_ACTION_LOG_PATH = actionLogPath;
  process.env.REVIEWHUB_OPERATIONS_ROOT = tempDir;
  process.env.REVIEW_INDEX_PATH = reviewIndexPath;
  process.env.EXPERIMENT_LOG_PATH = experimentLogPath;
  process.env.OPS_RUNS_DIR = runsDir;

  delete require.cache[dashboardModulePath];
  delete require.cache[queueActionsModulePath];

  try {
    const dashboardModule = require(dashboardModulePath);
    const queueActionsModule = require(queueActionsModulePath);

    return callback({
      dashboardModule,
      queueActionsModule,
      actionLogPath,
      approvalPath,
      queuePath
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
    delete require.cache[queueActionsModulePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test('approve action updates queue, approval, and dashboard summary', () => {
  withActionFixtures(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: [
        {
          entry_id: 'approval-001',
          status: 'pending',
          source: 'Content/Marketing/post.md',
          platform: 'Product Hunt',
          reason: 'Needs explicit approval',
          approval_ticket: 'TICKET-001',
          requested_by: 'ops',
          requested_at_utc: '2026-03-24T00:00:00.000Z'
        }
      ]
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: [
        {
          item_id: 'queue-approve-001',
          status: 'approval_pending',
          platform: 'Product Hunt',
          title: 'Launch checklist',
          owner: 'ops',
          source: 'Content/Marketing/post.md',
          risk: 'manual_review',
          notes: 'approval_status=pending'
        }
      ],
      status_counts: {
        approval_pending: 1
      }
    },
    ({ queueActionsModule, queuePath, approvalPath, actionLogPath }) => {
      const result = queueActionsModule.applyQueueAction({
        itemId: 'queue-approve-001',
        action: 'approve',
        actor: '@tester',
        note: 'approved in test'
      });

      assert.equal(result.ok, true);
      assert.equal(result.item.status, 'queued');
      assert.equal(result.item.action_state, 'ready_to_execute');

      const queueData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      const approvalData = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));
      assert.equal(queueData.items[0].status, 'queued');
      assert.equal(queueData.status_counts.queued, 1);
      assert.equal(approvalData.entries[0].status, 'approved');
      assert.match(fs.readFileSync(actionLogPath, 'utf8'), /"action":"approve"/);
    }
  );
});

test('manual missing-info override can be restored back to automatic inference', () => {
  withActionFixtures(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: []
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: [
        {
          item_id: 'queue-restore-001',
          status: 'queued',
          platform: 'Other',
          title: 'Queued item to restore',
          owner: 'ops',
          source: 'Content/Marketing/post.md',
          risk: 'review',
          notes: '-'
        }
      ],
      status_counts: {
        queued: 1
      }
    },
    ({ dashboardModule, queueActionsModule, queuePath }) => {
      queueActionsModule.applyQueueAction({
        itemId: 'queue-restore-001',
        action: 'mark_missing_info',
        actor: '@tester',
        note: '缺少截图, 缺少链接',
        reasons: ['缺少截图', '缺少链接']
      });

      let dashboard = dashboardModule.loadDashboardData();
      assert.equal(dashboard.items[0].action_state, 'missing_info');
      assert.deepEqual(dashboard.items[0].missing_info, ['缺少截图', '缺少链接']);

      queueActionsModule.applyQueueAction({
        itemId: 'queue-restore-001',
        action: 'restore_auto',
        actor: '@tester',
        note: 'restored'
      });

      dashboard = dashboardModule.loadDashboardData();
      assert.equal(dashboard.items[0].action_state, 'ready_to_execute');
      assert.equal(dashboard.items[0].review_override, false);

      const queueData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      assert.ok(!queueData.items[0].reviewhub || !queueData.items[0].reviewhub.manual_action_state);
    }
  );
});

test('batch missing-info action updates multiple items and writes one audit line per item', () => {
  withActionFixtures(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: []
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: [
        {
          item_id: 'queue-batch-001',
          status: 'queued',
          platform: 'Product Hunt',
          title: 'Batch item one',
          owner: 'ops',
          source: 'Content/Marketing/post-1.md',
          risk: 'review',
          notes: '-'
        },
        {
          item_id: 'queue-batch-002',
          status: 'queued',
          platform: 'Product Hunt',
          title: 'Batch item two',
          owner: 'ops',
          source: 'Content/Marketing/post-2.md',
          risk: 'review',
          notes: '-'
        }
      ],
      status_counts: {
        queued: 2
      }
    },
    ({ queueActionsModule, queuePath, actionLogPath }) => {
      const result = queueActionsModule.applyQueueActionsBatch({
        itemIds: ['queue-batch-001', 'queue-batch-002'],
        action: 'mark_missing_info',
        actor: '@tester',
        note: '缺少截图, 缺少链接',
        reasons: ['缺少截图', '缺少链接']
      });

      assert.equal(result.ok, true);
      assert.deepEqual(result.item_ids, ['queue-batch-001', 'queue-batch-002']);
      assert.equal(result.updated_count, 2);

      const queueData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      assert.equal(queueData.items[0].reviewhub.manual_action_state, 'missing_info');
      assert.equal(queueData.items[1].reviewhub.manual_action_state, 'missing_info');

      const logEntries = fs.readFileSync(actionLogPath, 'utf8').trim().split('\n');
      assert.equal(logEntries.length, 2);
      assert.match(logEntries[0], /queue-batch-001/);
      assert.match(logEntries[1], /queue-batch-002/);
    }
  );
});

test('approve action rejects when queue item already queued', () => {
  withActionFixtures(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: [
        {
          entry_id: 'approval-001',
          status: 'pending',
          source: 'Content/Marketing/post.md',
          platform: 'Product Hunt',
          reason: 'Needs explicit approval',
          approval_ticket: 'TICKET-001',
          requested_by: 'ops',
          requested_at_utc: '2026-03-24T00:00:00.000Z'
        }
      ]
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: [
        {
          item_id: 'queue-approve-002',
          status: 'queued',
          platform: 'Product Hunt',
          title: 'Already queued item',
          owner: 'ops',
          source: 'Content/Marketing/post.md',
          risk: 'manual_review',
          notes: 'approval_status=pending'
        }
      ],
      status_counts: {
        queued: 1
      }
    },
    ({ queueActionsModule }) => {
      assert.throws(() => {
        queueActionsModule.applyQueueAction({
          itemId: 'queue-approve-002',
          action: 'approve',
          actor: '@tester',
          note: 'should fail'
        });
      }, /该动作只能用于审核待定/);
    }
  );
});

test('mark_missing_info does not rewrite approval metadata', () => {
  withActionFixtures(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: []
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: [
        {
          item_id: 'queue-no-appr-001',
          status: 'queued',
          platform: 'Product Hunt',
          title: 'Reviewed item',
          owner: 'ops',
          source: 'Content/Marketing/post.md',
          risk: 'review',
          notes: '-'
        }
      ],
      status_counts: {
        queued: 1
      }
    },
    ({ queuePath, approvalPath, queueActionsModule }) => {
      queueActionsModule.applyQueueAction({
        itemId: 'queue-no-appr-001',
        action: 'mark_missing_info',
        actor: '@tester',
        note: 'missing info'
      });

      const approvalData = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));
      assert.equal(approvalData.updated_at_utc, '2026-03-24T00:00:00.000Z');
      const queueData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      assert.equal(queueData.items[0].reviewhub.manual_action_state, 'missing_info');
    }
  );
});

test('defer action stores defer_until and changes dashboard state to deferred', () => {
  withActionFixtures(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: []
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: [
        {
          item_id: 'queue-defer-001',
          status: 'queued',
          platform: 'Other',
          title: 'Queued item to defer',
          owner: 'ops',
          source: 'Content/Marketing/post.md',
          risk: 'review',
          notes: '-'
        }
      ],
      status_counts: {
        queued: 1
      }
    },
    ({ dashboardModule, queueActionsModule, queuePath, actionLogPath }) => {
      const deferUntilUtc = '2099-03-28T04:00:00.000Z';
      const result = queueActionsModule.applyQueueAction({
        itemId: 'queue-defer-001',
        action: 'mark_deferred',
        actor: '@tester',
        note: '等新素材',
        deferUntilUtc
      });

      assert.equal(result.ok, true);
      assert.equal(result.item.action_state, 'deferred');
      assert.equal(result.item.review_defer_until, deferUntilUtc);

      const dashboard = dashboardModule.loadDashboardData();
      assert.equal(dashboard.summary.deferred_count, 1);
      assert.equal(dashboard.items[0].action_state, 'deferred');
      assert.equal(dashboard.items[0].review_defer_until, deferUntilUtc);
      assert.equal(
        dashboard.daily_processing_queue.entries.some((entry) => entry.id === 'queue:queue-defer-001'),
        false
      );

      const queueData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      assert.equal(queueData.items[0].reviewhub.manual_action_state, 'deferred');
      assert.equal(queueData.items[0].reviewhub.defer_until_utc, deferUntilUtc);
      assert.match(fs.readFileSync(actionLogPath, 'utf8'), /"defer_until_utc":"2099-03-28T04:00:00.000Z"/);
    }
  );
});

test('mark_blocked moves an item into blocked state without requiring defer_until', () => {
  withActionFixtures(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: []
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: [
        {
          item_id: 'queue-blocked-001',
          status: 'queued',
          platform: 'Other',
          title: 'Queued item to block',
          owner: 'ops',
          source: 'Content/Marketing/post.md',
          risk: 'review',
          notes: '-'
        }
      ],
      status_counts: {
        queued: 1
      }
    },
    ({ dashboardModule, queueActionsModule, queuePath, actionLogPath }) => {
      const result = queueActionsModule.applyQueueAction({
        itemId: 'queue-blocked-001',
        action: 'mark_blocked',
        actor: '@tester',
        note: '等待外部依赖'
      });

      assert.equal(result.ok, true);
      assert.equal(result.item.action_state, 'deferred');
      assert.equal(result.item.review_defer_until, '');

      const dashboard = dashboardModule.loadDashboardData();
      assert.equal(dashboard.summary.deferred_count, 1);
      assert.equal(dashboard.items[0].action_state, 'deferred');
      const blockedEntry = dashboard.daily_processing_queue.entries.find((entry) => entry.id === 'queue:queue-blocked-001');
      assert.ok(blockedEntry);
      assert.equal(blockedEntry.lane_status, 'deferred');
      assert.equal(blockedEntry.priority, 'low');

      const queueData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      assert.equal(queueData.items[0].reviewhub.last_action, 'mark_blocked');
      assert.equal(queueData.items[0].reviewhub.manual_action_state, 'deferred');
      assert.ok(!Object.hasOwn(queueData.items[0].reviewhub, 'defer_until_utc'));
      assert.match(fs.readFileSync(actionLogPath, 'utf8'), /"action":"mark_blocked"/);
    }
  );
});
