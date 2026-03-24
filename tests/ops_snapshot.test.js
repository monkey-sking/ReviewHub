const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function withDashboardFixtures(options, callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-ops-snapshot-test-'));
  const approvalPath = path.join(tempDir, 'approval_registry.json');
  const queuePath = path.join(tempDir, 'daily_channel_queue.json');
  const runsRoot = path.join(tempDir, 'ops', 'runs');
  const operationsRoot = path.join(tempDir, 'ops');

  writeJson(approvalPath, options.approvalData);
  writeJson(queuePath, options.queueData);

  if (typeof options.prepareRuns === 'function') {
    options.prepareRuns({ runsRoot, operationsRoot });
  }

  const envKeys = [
    'APPROVAL_REGISTRY_PATH',
    'DAILY_CHANNEL_QUEUE_PATH',
    'OPERATIONS_ROOT',
    'REVIEWHUB_OPERATIONS_ROOT',
    'OPS_RUNS_ROOT',
    'OPERATIONS_RUNS_ROOT',
    'REVIEWHUB_OPS_RUNS_ROOT'
  ];
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  process.env.APPROVAL_REGISTRY_PATH = approvalPath;
  process.env.DAILY_CHANNEL_QUEUE_PATH = queuePath;
  process.env.OPERATIONS_ROOT = operationsRoot;
  process.env.REVIEWHUB_OPERATIONS_ROOT = operationsRoot;
  process.env.OPS_RUNS_ROOT = runsRoot;
  process.env.OPERATIONS_RUNS_ROOT = runsRoot;
  process.env.REVIEWHUB_OPS_RUNS_ROOT = runsRoot;

  const dashboardModulePath = path.resolve(__dirname, '..', 'lib', 'dashboard.js');
  delete require.cache[dashboardModulePath];

  try {
    const dashboardModule = require(dashboardModulePath);
    return callback(dashboardModule, { runsRoot, operationsRoot });
  } finally {
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousEnv[key];
      }
    }
    delete require.cache[dashboardModulePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function getOpsSnapshot(payload) {
  return payload.ops_snapshot || payload.opsSnapshot || payload.operations_snapshot || null;
}

function makeBaseQueueItem() {
  return {
    item_id: 'queue-ops-snapshot-001',
    status: 'queued',
    platform: 'Other',
    title: 'Ops snapshot baseline item',
    owner: 'ops',
    source: 'Content/Marketing/ops_snapshot.md',
    notes: '-',
    risk: 'manual'
  };
}

function makeBaseApprovalData() {
  return {
    schema_version: 'test',
    updated_at_utc: '2026-03-24T00:00:00.000Z',
    entries: []
  };
}

function makeBaseQueueData() {
  return {
    schema_version: 'test',
    run_date: '2026-03-24',
    items: [makeBaseQueueItem()],
    status_counts: { queued: 1 }
  };
}

test('ops snapshot is exposed and prefers latest artifact run when available', () => {
  withDashboardFixtures(
    {
      approvalData: makeBaseApprovalData(),
      queueData: makeBaseQueueData(),
      prepareRuns: ({ runsRoot }) => {
        writeJson(
          path.join(runsRoot, '2026-03-22', 'posts', 'browser_post_queue_summary.json'),
          {
            schema_version: 'lobster.browser.post.queue.v1',
            run_date: '2026-03-22',
            mode: 'survey',
            total_items: 2,
            ready_count: 1,
            blocked_count: 1,
            generated_count: 0,
            existing_count: 0,
            errors: [],
            records: []
          }
        );

        writeJson(
          path.join(runsRoot, '2026-03-24', 'posts', 'browser_post_queue_summary.json'),
          {
            schema_version: 'lobster.browser.post.queue.v1',
            run_date: '2026-03-24',
            mode: 'survey',
            total_items: 14,
            ready_count: 9,
            blocked_count: 5,
            generated_count: 0,
            existing_count: 0,
            errors: [],
            records: [
              {
                item_id: 'queue-ops-snapshot-001',
                platform: 'Other',
                queue_status: 'queued',
                status: 'ready_for_browser_review',
                target_url: 'https://example.com/post',
                blocked_reasons: [],
                source: 'Content/Marketing/ops_snapshot.md'
              }
            ]
          }
        );

        writeJson(
          path.join(runsRoot, '2026-03-23', 'metrics', 'metrics_summary_2026-03-23.json'),
          {
            schema_version: 'lobster.metrics.summary.v1',
            run_date: '2026-03-23',
            status: { overall: 'warning', kv: 'ok', paddle: 'warning', analytics: 'ok' },
            configured_trackers: {},
            kv: { status: 'ok' },
            paddle: { status: 'warning' },
            analytics: { status: 'ok' }
          }
        );

        writeJson(
          path.join(runsRoot, '2026-03-23', 'supervisor', 'supervisor_run_summary_2026-03-23.json'),
          {
            schema_version: 'lobster.supervisor.run.v2',
            run_status: 'ok',
            run_date: '2026-03-23',
            steps: [],
            artifacts: {}
          }
        );

        const feedbackPath = path.join(
          runsRoot,
          '2026-03-24',
          'feedback',
          'lobster_feedback_report_2026-03-24.md'
        );
        fs.mkdirSync(path.dirname(feedbackPath), { recursive: true });
        fs.writeFileSync(
          feedbackPath,
          '# Lobster feedback + failure report\n\n- Total incidents captured: **7**\n',
          'utf8'
        );
      }
    },
    ({ loadDashboardData }) => {
      const dashboard = loadDashboardData();
      const opsSnapshot = getOpsSnapshot(dashboard);

      assert.equal(dashboard.summary.total_items, 1);
      assert.ok(opsSnapshot && typeof opsSnapshot === 'object', 'Expected ops snapshot object to be present');

      const snapshotText = JSON.stringify(opsSnapshot);
      assert.match(snapshotText, /2026-03-24/);
      assert.match(snapshotText, /browser_post_queue_summary\.json|post/i);
      assert.match(snapshotText, /metrics_summary_2026-03-23\.json|metrics/i);
      assert.equal(
        opsSnapshot.modules.posts.records[0].title,
        'Ops snapshot baseline item',
        'Expected post snapshot rows to reuse queue titles when item ids match'
      );
    }
  );
});

test('optional ops artifacts parse failures do not break dashboard load', () => {
  withDashboardFixtures(
    {
      approvalData: makeBaseApprovalData(),
      queueData: makeBaseQueueData(),
      prepareRuns: ({ runsRoot }) => {
        writeJson(
          path.join(runsRoot, '2026-03-24', 'posts', 'browser_post_queue_summary.json'),
          {
            schema_version: 'lobster.browser.post.queue.v1',
            run_date: '2026-03-24',
            mode: 'survey',
            total_items: 1,
            ready_count: 1,
            blocked_count: 0,
            generated_count: 0,
            existing_count: 0,
            errors: [],
            records: []
          }
        );

        const badMetricsPath = path.join(runsRoot, '2026-03-24', 'metrics', 'metrics_summary_2026-03-24.json');
        fs.mkdirSync(path.dirname(badMetricsPath), { recursive: true });
        fs.writeFileSync(badMetricsPath, '{ invalid json', 'utf8');
      }
    },
    ({ loadDashboardData }) => {
      const dashboard = loadDashboardData();
      const opsSnapshot = getOpsSnapshot(dashboard);

      assert.equal(dashboard.summary.total_items, 1);
      assert.equal(dashboard.summary.queued_items, 1);
      assert.ok(opsSnapshot && typeof opsSnapshot === 'object', 'Expected ops snapshot object to be present');
    }
  );
});

test('missing ops runs root is tolerated and does not break dashboard load', () => {
  withDashboardFixtures(
    {
      approvalData: makeBaseApprovalData(),
      queueData: makeBaseQueueData(),
      prepareRuns: () => {}
    },
    ({ loadDashboardData }, { runsRoot }) => {
      fs.rmSync(runsRoot, { recursive: true, force: true });

      const dashboard = loadDashboardData();
      assert.equal(dashboard.summary.total_items, 1);

      const opsSnapshot = getOpsSnapshot(dashboard);
      assert.ok(
        opsSnapshot === null || typeof opsSnapshot === 'object',
        'Expected ops snapshot to be null/object when runs root is missing'
      );
    }
  );
});
