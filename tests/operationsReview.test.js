const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function withOperationsFixtures(setup, callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-ops-review-test-'));
  const stateDir = path.join(tempDir, 'state');
  const runsDir = path.join(tempDir, 'runs');
  const previousReviewIndexPath = process.env.REVIEW_INDEX_PATH;
  const previousExperimentLogPath = process.env.EXPERIMENT_LOG_PATH;
  const previousRunsDir = process.env.OPS_RUNS_DIR;

  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(runsDir, { recursive: true });
  setup({ tempDir, stateDir, runsDir });

  process.env.REVIEW_INDEX_PATH = path.join(stateDir, 'review_index.md');
  process.env.EXPERIMENT_LOG_PATH = path.join(stateDir, 'experiment_log.md');
  process.env.OPS_RUNS_DIR = runsDir;

  const modulePath = path.resolve(__dirname, '..', 'lib', 'operationsReview.js');
  delete require.cache[modulePath];

  try {
    const module = require(modulePath);
    return callback(module);
  } finally {
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

    if (previousRunsDir === undefined) {
      delete process.env.OPS_RUNS_DIR;
    } else {
      process.env.OPS_RUNS_DIR = previousRunsDir;
    }

    delete require.cache[modulePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test('loadOperationsReviewData aggregates review, experiment, feedback, and handoff data', () => {
  withOperationsFixtures(({ stateDir, runsDir }) => {
    fs.writeFileSync(
      path.join(stateDir, 'review_index.md'),
      [
        '# Review Index',
        '',
        'Date: 2026-03-24',
        '',
        '| Date (YYYY-MM-DD) | Job | Focus | Status | Blocker/Notes | Follow-up owner |',
        '| ----------------- | --- | ----- | ------ | ------------- | --------------- |',
        '| 2026-03-24 | message_house_review | CTA alignment | watch | Needs policy check | ops-lead |'
      ].join('\n')
    );

    fs.writeFileSync(
      path.join(stateDir, 'experiment_log.md'),
      [
        '# Experiment Log',
        '',
        'Date: 2026-03-24',
        '',
        '| Started | Job | Experiment | Hypothesis | Signal Metric | Status | Next Step |',
        '| ------- | --- | ---------- | ---------- | ------------- | ------ | --------- |',
        '| 2026-03-24 | weekly_ops_review | CTA timing | Later CTA improves activation | activation_rate | planned | compare next run |'
      ].join('\n')
    );

    const feedbackDir = path.join(runsDir, '2026-03-24', 'feedback');
    const postsDir = path.join(runsDir, '2026-03-24', 'posts');
    fs.mkdirSync(feedbackDir, { recursive: true });
    fs.mkdirSync(postsDir, { recursive: true });

    fs.writeFileSync(
      path.join(feedbackDir, 'lobster_feedback_report_2026-03-24.md'),
      [
        '# Lobster feedback + failure report',
        '',
        '- Generated at (UTC): **2026-03-24T10:30:35.971698Z**',
        '',
        '## Summary',
        '- Total incidents captured: **1470**',
        '- Session runtime errors: **382**',
        '- Gateway errors/warnings: **999**',
        '- User feedback signals: **89**',
        '',
        '## Root cause buckets',
        '- **Provider quota exhausted**: 465 incidents (~32%). Example: quota burst',
        '- **Model fallback instability**: 329 incidents (~22%). Example: fallback drift',
        '- **Other gateway/runtime failures**: 322 incidents (~22%). Example: websocket closed'
      ].join('\n')
    );

    fs.writeFileSync(
      path.join(postsDir, 'browser_post_queue_summary.json'),
      JSON.stringify({
        run_date: '2026-03-24',
        total_items: 3,
        ready_count: 1,
        blocked_count: 2,
        records: [
          {
            item_id: 'post-001',
            platform: 'Product Hunt',
            queue_status: 'queued',
            status: 'ready_for_browser_review',
            target_url: 'https://www.producthunt.com/posts/new',
            blocked_reasons: [],
            source: 'Content/Marketing/a.md'
          },
          {
            item_id: 'post-002',
            platform: 'Appinn',
            queue_status: 'queued',
            status: 'needs_target_url',
            target_url: '',
            blocked_reasons: ['missing target_url'],
            source: 'Content/Marketing/b.md'
          }
        ]
      }, null, 2)
    );
  }, ({ loadOperationsReviewData }) => {
    const data = loadOperationsReviewData();

    assert.equal(data.summary.review_count, 1);
    assert.equal(data.summary.attention_count, 1);
    assert.equal(data.summary.experiment_count, 1);
    assert.equal(data.summary.active_experiment_count, 1);
    assert.equal(data.summary.feedback_incidents, 1470);
    assert.equal(data.summary.browser_ready_count, 1);
    assert.equal(data.summary.browser_blocked_count, 2);
    assert.equal(data.feedback.generated_at, '2026-03-24T10:30:35.971698Z');
    assert.equal(data.feedback.root_causes.length, 3);
    assert.equal(data.post_handoffs.records[0].status, 'ready_for_browser_review');
    assert.equal(data.post_handoffs.records[1].blocked_reasons[0], 'missing target_url');
  });
});

test('loadOperationsReviewData degrades gracefully when optional files are missing', () => {
  withOperationsFixtures(({ stateDir }) => {
    fs.writeFileSync(path.join(stateDir, 'review_index.md'), '# Review Index\n\nDate: 2026-03-24\n');
    fs.writeFileSync(path.join(stateDir, 'experiment_log.md'), '# Experiment Log\n\nDate: 2026-03-24\n');
  }, ({ loadOperationsReviewData }) => {
    const data = loadOperationsReviewData();

    assert.equal(data.summary.feedback_incidents, 0);
    assert.equal(data.summary.browser_ready_count, 0);
    assert.ok(Array.isArray(data.issues));
    assert.ok(data.issues.length >= 2);
    assert.ok(data.issues.some((issue) => issue.source === 'feedback'));
    assert.ok(data.issues.some((issue) => issue.source === 'post_handoffs'));
  });
});
