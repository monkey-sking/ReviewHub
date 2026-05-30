const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function withFixtureData(approvalData, queueData, callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-dashboard-test-'));
  const approvalPath = path.join(tempDir, 'approval_registry.json');
  const queuePath = path.join(tempDir, 'daily_channel_queue.json');
  const reviewIndexPath = path.join(tempDir, 'review_index.md');
  const experimentLogPath = path.join(tempDir, 'experiment_log.md');
  const actionLogPath = path.join(tempDir, 'reviewhub_action_log.ndjson');
  const projectBoardPath = path.join(tempDir, 'PROJECT_KANBAN.md');
  const operationsRoot = path.join(tempDir, 'operations-root');
  const runsDir = path.join(tempDir, 'runs');
  const previousApprovalPath = process.env.APPROVAL_REGISTRY_PATH;
  const previousQueuePath = process.env.DAILY_CHANNEL_QUEUE_PATH;
  const previousReviewIndexPath = process.env.REVIEW_INDEX_PATH;
  const previousExperimentLogPath = process.env.EXPERIMENT_LOG_PATH;
  const previousActionLogPath = process.env.REVIEWHUB_ACTION_LOG_PATH;
  const previousProjectBoardPath = process.env.REVIEWHUB_PROJECT_KANBAN_PATH;
  const previousOperationsRoot = process.env.REVIEWHUB_OPERATIONS_ROOT;
  const previousRunsDir = process.env.OPS_RUNS_DIR;

  fs.writeFileSync(approvalPath, JSON.stringify(approvalData, null, 2));
  fs.writeFileSync(queuePath, JSON.stringify(queueData, null, 2));
  fs.writeFileSync(reviewIndexPath, '# Review Index\n\nDate: 2026-03-24\n');
  fs.writeFileSync(experimentLogPath, '# Experiment Log\n\nDate: 2026-03-24\n');
  fs.writeFileSync(actionLogPath, '');
  fs.writeFileSync(
    projectBoardPath,
    [
      '# Project Kanban',
      '',
      '## Inbox',
      '',
      '| Project | Task | Type | Next Step | Notes |',
      '|---|---|---|---|---|',
      '| Aion | 补齐素材入口 | ops | 收口资料路径 | 先把入口统一 |',
      '',
      '## Ready',
      '',
      '| Project | Task | Type | Next Step | Canonical Link |',
      '|---|---|---|---|---|',
      '| Aion | 打磨发帖文案 | content | 改首屏表达 | `Content/Marketing/aion_post.md` |',
      '',
      '## Running',
      '',
      '| Project | Task | Type | Current Step | Next Step | Canonical Link |',
      '|---|---|---|---|---|---|',
      '| Operations | 看板重构 | ops | 已搭骨架 | 继续收口视图 | `PROJECT_KANBAN.md` |',
      '',
      '## Waiting',
      '',
      '| Project | Task | Type | Blocker | Next Step |',
      '|---|---|---|---|---|',
      '| Aion | 核对旧分发链接 | analysis | 缺历史链接 | 后续补齐 |',
      '',
      '## Done',
      '',
      '| Project | Task | Type | Output |',
      '|---|---|---|---|',
      '| Aion | 建立复盘初版 | analysis | `Products/Aion/POST_ANALYSIS.md` |',
      '',
      '## Learned',
      '',
      '| Scope | Lesson |',
      '|---|---|',
      '| Cross-project | 项目资料和任务推进要分层 |'
    ].join('\n')
  );
  fs.mkdirSync(runsDir, { recursive: true });
  fs.mkdirSync(operationsRoot, { recursive: true });

  process.env.APPROVAL_REGISTRY_PATH = approvalPath;
  process.env.DAILY_CHANNEL_QUEUE_PATH = queuePath;
  process.env.REVIEW_INDEX_PATH = reviewIndexPath;
  process.env.EXPERIMENT_LOG_PATH = experimentLogPath;
  process.env.REVIEWHUB_ACTION_LOG_PATH = actionLogPath;
  process.env.REVIEWHUB_PROJECT_KANBAN_PATH = projectBoardPath;
  process.env.REVIEWHUB_OPERATIONS_ROOT = operationsRoot;
  process.env.OPS_RUNS_DIR = runsDir;

  const dashboardModulePath = path.resolve(__dirname, '..', 'lib', 'dashboard.js');
  delete require.cache[dashboardModulePath];

  try {
    const dashboardModule = require(dashboardModulePath);
    return callback(dashboardModule);
  } finally {
    if (previousApprovalPath === undefined) {
      delete process.env.APPROVAL_REGISTRY_PATH;
    } else {
      process.env.APPROVAL_REGISTRY_PATH = previousApprovalPath;
    }

    if (previousQueuePath === undefined) {
      delete process.env.DAILY_CHANNEL_QUEUE_PATH;
    } else {
      process.env.DAILY_CHANNEL_QUEUE_PATH = previousQueuePath;
    }

    if (previousReviewIndexPath === undefined) {
      delete process.env.REVIEW_INDEX_PATH;
    } else {
      process.env.REVIEW_INDEX_PATH = previousReviewIndexPath;
    }

    if (previousExperimentLogPath === undefined) {
      delete process.env.EXPERIMENT_LOG_PATH;
    } else {
      process.env.EXPERIMENT_LOG_PATH = previousExperimentLogPath;
    }

    if (previousActionLogPath === undefined) {
      delete process.env.REVIEWHUB_ACTION_LOG_PATH;
    } else {
      process.env.REVIEWHUB_ACTION_LOG_PATH = previousActionLogPath;
    }

    if (previousProjectBoardPath === undefined) {
      delete process.env.REVIEWHUB_PROJECT_KANBAN_PATH;
    } else {
      process.env.REVIEWHUB_PROJECT_KANBAN_PATH = previousProjectBoardPath;
    }

    if (previousOperationsRoot === undefined) {
      delete process.env.REVIEWHUB_OPERATIONS_ROOT;
    } else {
      process.env.REVIEWHUB_OPERATIONS_ROOT = previousOperationsRoot;
    }

    if (previousRunsDir === undefined) {
      delete process.env.OPS_RUNS_DIR;
    } else {
      process.env.OPS_RUNS_DIR = previousRunsDir;
    }

    delete require.cache[dashboardModulePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test('queued items without approval match are still ready_to_execute when owner exists', () => {
  withFixtureData(
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
          item_id: 'queue-001',
          status: 'queued',
          platform: 'Product Hunt',
          title: 'Queued item without approval mapping',
          owner: 'ops',
          source: 'Content/Marketing/queued.md',
          notes: '-',
          risk: 'manual'
        }
      ]
    },
    ({ loadDashboardData }) => {
      const dashboard = loadDashboardData();
      assert.equal(dashboard.summary.queued_items, 1);
      assert.equal(dashboard.summary.ready_to_execute_count, 1);
      assert.equal(dashboard.summary.missing_info_count, 0);
      assert.equal(dashboard.items[0].action_state, 'ready_to_execute');
      assert.deepEqual(dashboard.items[0].missing_info, []);
      assert.equal(typeof dashboard.operations_review.summary.review_count, 'number');
    }
  );
});

test('dashboard exposes recent action log entries for queue items', () => {
  withFixtureData(
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
          item_id: 'queue-log-001',
          status: 'queued',
          platform: 'Other',
          title: 'Queued item with audit trail',
          owner: 'ops',
          source: 'Content/Marketing/queued-log.md',
          notes: '-',
          risk: 'review'
        }
      ]
    },
    ({ loadDashboardData }) => {
      fs.writeFileSync(
        process.env.REVIEWHUB_ACTION_LOG_PATH,
        [
          JSON.stringify({
            timestamp_utc: '2026-03-24T08:00:00.000Z',
            actor: '@tester',
            item_id: 'queue-log-001',
            action: 'mark_missing_info',
            note: '缺少截图',
            reasons: ['缺少截图']
          }),
          JSON.stringify({
            timestamp_utc: '2026-03-24T09:00:00.000Z',
            actor: '@tester',
            item_id: 'queue-log-001',
            action: 'mark_ready',
            note: '资料已补齐',
            reasons: []
          })
        ].join('\n'),
        'utf8'
      );

      const dashboard = loadDashboardData();
      assert.equal(dashboard.action_log.available, true);
      assert.equal(dashboard.action_log.entries.length, 2);
      assert.equal(dashboard.action_log.entries[0].action, 'mark_ready');
      assert.equal(dashboard.action_log.entries[1].action, 'mark_missing_info');
      assert.equal(dashboard.metadata.action_log_available, true);
    }
  );
});

test('queued items with missing owner do not require approval match but remain missing_info', () => {
  withFixtureData(
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
          item_id: 'queue-002',
          status: 'queued',
          platform: 'Other',
          title: 'Queued item missing owner',
          owner: '-',
          source: 'Content/Marketing/queued-missing-owner.md',
          notes: '-',
          risk: 'review'
        }
      ]
    },
    ({ loadDashboardData }) => {
      const dashboard = loadDashboardData();
      assert.equal(dashboard.summary.ready_to_execute_count, 0);
      assert.equal(dashboard.summary.missing_info_count, 1);
      assert.equal(dashboard.items[0].action_state, 'missing_info');
      assert.deepEqual(dashboard.items[0].missing_info, ['owner']);
    }
  );
});

test('manual reviewhub override changes the inferred action state and preserves audit fields', () => {
  withFixtureData(
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
          item_id: 'queue-003',
          status: 'queued',
          platform: 'Other',
          title: 'Queued item with manual override',
          owner: 'ops',
          source: 'Content/Marketing/queued-override.md',
          notes: '-',
          risk: 'review',
          reviewhub: {
            manual_action_state: 'missing_info',
            missing_info_reasons: ['缺少截图'],
            action_note: '需要补截图',
            updated_by: '@reviewhub',
            updated_at_utc: '2026-03-24T08:30:00.000Z',
            last_action: 'mark_missing_info'
          }
        }
      ]
    },
    ({ loadDashboardData }) => {
      const dashboard = loadDashboardData();
      assert.equal(dashboard.summary.ready_to_execute_count, 0);
      assert.equal(dashboard.summary.missing_info_count, 1);
      assert.equal(dashboard.items[0].action_state, 'missing_info');
      assert.deepEqual(dashboard.items[0].missing_info, ['缺少截图']);
      assert.equal(dashboard.items[0].review_override, true);
      assert.equal(dashboard.items[0].review_note, '需要补截图');
      assert.equal(dashboard.items[0].review_updated_by, '@reviewhub');
    }
  );
});

test('dashboard exposes project hub profiles with separated progress and material layers', () => {
  withFixtureData(
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
          item_id: 'queue-aion-001',
          status: 'queued',
          project: 'Aion',
          platform: 'Product Hunt',
          category: 'Marketing',
          title: 'Aion launch draft',
          owner: 'ops',
          source: 'Content/Marketing/ProductHunt_Reddit_Post.md',
          notes: '-',
          risk: 'review'
        }
      ]
    },
    ({ loadDashboardData }) => {
      const dashboard = loadDashboardData();
      const aion = dashboard.project_hub.projects.find((project) => project.project === 'Aion');

      assert.ok(aion, 'Expected Aion project profile to exist');
      assert.equal(aion.section_counts.ready, 1);
      assert.equal(aion.section_counts.waiting, 1);
      assert.ok(aion.material_groups.some((group) => group.id === 'content'));
      assert.ok(aion.material_groups.some((group) => group.id === 'review'));
      assert.ok(aion.focus_cards.some((card) => card.key === 'next_steps'));
      assert.equal(aion.related_queue_items.length, 1);
      assert.equal(aion.next_steps[0].title, '打磨发帖文案');
    }
  );
});

test('missing source file throws DashboardDataError with diagnostics details', () => {
  withFixtureData(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: []
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: []
    },
    ({ DashboardDataError, loadDashboardData }) => {
      fs.rmSync(process.env.APPROVAL_REGISTRY_PATH, { force: true });

      assert.throws(
        () => loadDashboardData(),
        (error) => {
          assert.ok(error instanceof DashboardDataError);
          assert.equal(error.message, 'ReviewHub 无法读取一个或多个源文件。');
          assert.equal(typeof error.source_files, 'object');
          assert.equal(typeof error.source_files.approval_registry, 'string');
          assert.equal(typeof error.source_files.daily_channel_queue, 'string');
          assert.ok(Array.isArray(error.details));
          assert.ok(error.details.length >= 1);

          const approvalIssue = error.details.find((detail) => detail.source === 'approval_registry');
          assert.ok(approvalIssue);
          assert.equal(approvalIssue.issue, '源文件不存在。');
          assert.equal(typeof approvalIssue.path, 'string');
          assert.equal(typeof approvalIssue.hint, 'string');
          return true;
        }
      );
    }
  );
});

test('operations review loader failure is surfaced as unavailable instead of a fake healthy zero-state', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-dashboard-test-ops-unavailable-'));
  const approvalPath = path.join(tempDir, 'approval_registry.json');
  const queuePath = path.join(tempDir, 'daily_channel_queue.json');
  const previousApprovalPath = process.env.APPROVAL_REGISTRY_PATH;
  const previousQueuePath = process.env.DAILY_CHANNEL_QUEUE_PATH;
  const operationsModulePath = path.resolve(__dirname, '..', 'lib', 'operationsReview.js');
  const dashboardModulePath = path.resolve(__dirname, '..', 'lib', 'dashboard.js');

  fs.writeFileSync(
    approvalPath,
    JSON.stringify({ schema_version: 'test', updated_at_utc: '2026-03-24T00:00:00.000Z', entries: [] }, null, 2)
  );
  fs.writeFileSync(
    queuePath,
    JSON.stringify({
      schema_version: 'test',
      run_date: '2026-03-24',
      items: [],
      status_counts: {}
    }, null, 2)
  );

  process.env.APPROVAL_REGISTRY_PATH = approvalPath;
  process.env.DAILY_CHANNEL_QUEUE_PATH = queuePath;

  delete require.cache[operationsModulePath];
  const operationsModule = require(operationsModulePath);
  const originalExports = require.cache[operationsModulePath].exports;
  require.cache[operationsModulePath].exports = {
    ...operationsModule,
    loadOperationsReviewData() {
      throw new Error('ops review exploded');
    }
  };

  delete require.cache[dashboardModulePath];

  try {
    const { loadDashboardData } = require(dashboardModulePath);
    const dashboard = loadDashboardData();
    assert.equal(dashboard.operations_review.available, false);
    assert.equal(dashboard.operations_review.issues[0].message, 'ops review exploded');
    assert.equal(dashboard.operations_review.reviews.issues[0].message, 'ops review exploded');
    assert.equal(dashboard.operations_review.feedback.issues[0].message, 'ops review exploded');
  } finally {
    require.cache[operationsModulePath].exports = originalExports;
    delete require.cache[dashboardModulePath];
    delete require.cache[operationsModulePath];

    if (previousApprovalPath === undefined) {
      delete process.env.APPROVAL_REGISTRY_PATH;
    } else {
      process.env.APPROVAL_REGISTRY_PATH = previousApprovalPath;
    }

    if (previousQueuePath === undefined) {
      delete process.env.DAILY_CHANNEL_QUEUE_PATH;
    } else {
      process.env.DAILY_CHANNEL_QUEUE_PATH = previousQueuePath;
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('invalid queue schema throws DashboardDataError with schema diagnostics', () => {
  withFixtureData(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: []
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: {}
    },
    ({ DashboardDataError, loadDashboardData }) => {
      assert.throws(
        () => loadDashboardData(),
        (error) => {
          assert.ok(error instanceof DashboardDataError);
          assert.equal(error.message, 'ReviewHub 源文件不符合预期 schema。');
          assert.ok(Array.isArray(error.details));
          assert.ok(error.details.length >= 1);

          const queueIssue = error.details.find((detail) => detail.source === 'daily_channel_queue');
          assert.ok(queueIssue);
          assert.equal(queueIssue.issue, '缺少或无效的 "items" 数组。');
          assert.equal(typeof queueIssue.hint, 'string');
          return true;
        }
      );
    }
  );
});


test('dashboard extracts source preview artifacts and recent activity summary', () => {
  withFixtureData(
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
          item_id: 'queue-source-001',
          status: 'queued',
          platform: 'Other',
          title: 'Queued item with source artifacts',
          owner: 'ops',
          source: 'Content/Marketing/source-artifacts.md',
          notes: '-',
          risk: 'review'
        }
      ]
    },
    ({ loadDashboardData }) => {
      const sourcePath = path.join(process.env.REVIEWHUB_OPERATIONS_ROOT, 'Content', 'Marketing', 'source-artifacts.md');
      fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
      fs.writeFileSync(
        sourcePath,
        [
          '# Launch post',
          '',
          '![封面图](https://cdn.example.com/cover.png)',
          '',
          '<!-- 演示视频 https://cdn.example.com/demo.mp4 -->',
          '',
          '[落地页](https://example.com/launch)'
        ].join('\n')
      );
      fs.writeFileSync(
        process.env.REVIEWHUB_ACTION_LOG_PATH,
        JSON.stringify({
          timestamp_utc: '2026-03-24T10:00:00.000Z',
          actor: '@tester',
          item_id: 'queue-source-001',
          action: 'mark_ready',
          note: 'source verified'
        }) + '\n',
        'utf8'
      );

      const dashboard = loadDashboardData();
      assert.equal(dashboard.items[0].source_details.available, true);
      assert.ok(dashboard.items[0].source_details.artifact_count >= 3);
      assert.equal(dashboard.items[0].source_details.artifacts[0].kind, 'image');
      assert.equal(dashboard.recent_activity.total_entries, 1);
      assert.equal(dashboard.recent_activity.entries[0].target_id, 'queue-source-001');
      assert.match(dashboard.items[0].source_details.preview, /Launch post/);
    }
  );
});

test('dashboard exposes a daily processing lane and high-signal stream from live artifacts', () => {
  withFixtureData(
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
          item_id: 'queue-daily-001',
          status: 'queued',
          platform: 'Other',
          title: 'B站深度评测脚本',
          owner: 'ops',
          source: 'Content/Promotional/huasheng_script_deep_dive.md',
          notes: '需要补发布入口',
          risk: 'review'
        }
      ],
      status_counts: {
        queued: 1
      }
    },
    ({ loadDashboardData }) => {
      const stateDir = path.join(process.env.REVIEWHUB_OPERATIONS_ROOT, 'Ops', 'state');
      const threadActionLogPath = path.join(stateDir, 'reviewhub_thread_action_log.ndjson');
      const sourcePath = path.join(process.env.REVIEWHUB_OPERATIONS_ROOT, 'Content', 'Promotional', 'huasheng_script_deep_dive.md');
      const postsDir = path.join(process.env.OPS_RUNS_DIR, '2026-03-24', 'posts');
      const feedbackDir = path.join(process.env.OPS_RUNS_DIR, '2026-03-24', 'feedback');
      const repliesDir = path.join(process.env.OPS_RUNS_DIR, '2026-03-25', 'replies', 'reply-daily-001');

      fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
      fs.mkdirSync(stateDir, { recursive: true });
      fs.mkdirSync(postsDir, { recursive: true });
      fs.mkdirSync(feedbackDir, { recursive: true });
      fs.mkdirSync(repliesDir, { recursive: true });

      fs.writeFileSync(sourcePath, '# B站脚本\n\n首发版本。', 'utf8');
      fs.writeFileSync(
        process.env.REVIEW_INDEX_PATH,
        [
          '# Review Index',
          '',
          'Date: 2026-03-24',
          '',
          '| Date (YYYY-MM-DD) | Job | Focus | Status | Blocker/Notes | Follow-up owner |',
          '| ----------------- | --- | ----- | ------ | ------------- | --------------- |',
          '| 2026-03-24 | launch_review | 发布节奏 | watch | 等确认渠道顺序 | ops-lead |'
        ].join('\n'),
        'utf8'
      );
      fs.writeFileSync(
        path.join(postsDir, 'browser_post_queue_summary.json'),
        JSON.stringify({
          run_date: '2026-03-24',
          total_items: 1,
          ready_count: 0,
          blocked_count: 1,
          records: [
            {
              item_id: 'post-huasheng-script-deep-dive-run',
              platform: 'Other',
              source: 'Content/Promotional/huasheng_script_deep_dive.md',
              queue_status: 'queued',
              target_url: '',
              status: 'needs_target_url',
              blocked_reasons: ['missing target_url'],
              job_path: 'Ops/runs/2026-03-24/posts/Aion_B/browser_post_job.json'
            }
          ]
        }, null, 2),
        'utf8'
      );
      fs.writeFileSync(
        path.join(feedbackDir, 'lobster_feedback_report_2026-03-24.md'),
        [
          '# Lobster feedback + failure report',
          '',
          '- Generated at (UTC): **2026-03-24T10:30:35.971698Z**',
          '',
          '## Summary',
          '- Total incidents captured: **10**',
          '- Session runtime errors: **2**',
          '- Gateway errors/warnings: **3**',
          '- User feedback signals: **5**',
          '',
          '## Recent incident timeline',
          '| Time (UTC) | Kind | Session | Source | Summary |',
          '| --- | --- | --- | --- | --- |',
          '| 2026-03-24T10:30:00.254000Z | `gateway_error` | `-` | `gateway.err.log` | token missing |'
        ].join('\n'),
        'utf8'
      );
      fs.writeFileSync(
        process.env.REVIEWHUB_ACTION_LOG_PATH,
        JSON.stringify({
          timestamp_utc: '2026-03-24T11:00:00.000Z',
          actor: '@tester',
          item_id: 'queue-daily-001',
          action: 'mark_ready',
          note: '已补齐素材'
        }) + '\n',
        'utf8'
      );
      fs.writeFileSync(threadActionLogPath, '', 'utf8');
      fs.writeFileSync(
        path.join(repliesDir, 'packet.json'),
        JSON.stringify({
          packet_version: '1.0',
          reply_id: 'reply-daily-001',
          run_date: '2026-03-25',
          created_at_utc: '2026-03-25T08:00:00.000Z',
          execution_context: {
            platform: 'reddit',
            target_url: 'https://example.com/reply'
          },
          input: {
            source_kind: 'feedback'
          },
          classification: {
            bucket: 'B',
            score: 8,
            manual_required: true
          },
          reply: {
            needs_manual_review: true,
            draft_text: '需要人工决定怎么回。'
          }
        }, null, 2),
        'utf8'
      );
      fs.writeFileSync(
        path.join(repliesDir, 'browser_reply_job.json'),
        JSON.stringify({
          reply_id: 'reply-daily-001',
          gates: {
            blocked_reasons: []
          },
          handoff: {
            ready_for_human_checkpoint: true
          }
        }, null, 2),
        'utf8'
      );

      const dashboard = loadDashboardData();
      assert.ok(dashboard.daily_processing_queue.total_entries >= 3);
      assert.ok(
        dashboard.daily_processing_queue.entries.some((entry) => {
          return entry.source_kind === 'queue' && entry.handoff_status === 'needs_target_url';
        })
      );
      assert.ok(
        dashboard.daily_processing_queue.entries.some((entry) => {
          return entry.source_kind === 'thread' && entry.navigation.kind === 'thread';
        })
      );
      assert.ok(
        dashboard.daily_processing_queue.entries.some((entry) => {
          return entry.source_kind === 'review' && entry.navigation.kind === 'ops';
        })
      );
      assert.ok(
        dashboard.signal_stream.entries.some((entry) => {
          return entry.signal_kind === 'queue_action' && entry.navigation.kind === 'queue';
        })
      );
      assert.ok(
        dashboard.signal_stream.entries.some((entry) => {
          return entry.signal_kind === 'feedback_incident' && entry.severity === 'critical';
        })
      );
    }
  );
});

test('daily processing queue returns every entry instead of the 24-item truncation', () => {
  const queueItems = Array.from({ length: 30 }, (_, index) => ({
    item_id: `queue-full-${index + 1}`,
    status: 'queued',
    platform: 'Batch',
    title: `Batch entry ${index + 1}`,
    owner: 'ops',
    source: `Content/Batch/batch-${index + 1}.md`,
    risk: 'review',
    notes: '-'
  }));

  withFixtureData(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: []
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: queueItems,
      status_counts: {
        queued: queueItems.length
      }
    },
    ({ loadDashboardData }) => {
      const dashboard = loadDashboardData();
      const laneEntries = dashboard.daily_processing_queue.entries.filter((entry) => entry.source_kind === 'queue');
      assert.equal(laneEntries.length, queueItems.length);
      assert.ok(laneEntries.some((entry) => entry.id === 'queue:queue-full-1'));
    }
  );
});

test('recent activity total_entries reflects entire log', () => {
  withFixtureData(
    {
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: []
    },
    {
      schema_version: 'test',
      run_date: '2026-03-24',
      items: [],
      status_counts: {}
    },
    ({ loadDashboardData }) => {
      const actionLogPath = process.env.REVIEWHUB_ACTION_LOG_PATH;
      const serialized = Array.from({ length: 22 }, (_item, index) => JSON.stringify({
        timestamp_utc: `2026-03-24T${String(10 + index).padStart(2, '0')}:00:00.000Z`,
        actor: '@tester',
        item_id: `queue-${index}`,
        action: 'mark_ready',
        note: 'note'
      }));
      fs.writeFileSync(actionLogPath, serialized.join('\n'), 'utf8');

      const dashboard = loadDashboardData();
      assert.equal(dashboard.recent_activity.total_entries, 22);
      assert.ok(dashboard.recent_activity.entries.length <= 16);
    }
  );
});
