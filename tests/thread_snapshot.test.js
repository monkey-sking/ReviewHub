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
  const payload = {
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
  };
  writeJson(path.join(packetDir, 'packet.json'), payload);
  return packetDir;
}

function writeJob(packetDir, overrides = {}) {
  const payload = {
    job_version: 'lobster.browser.reply.fill.v1',
    reply_id: overrides.reply_id || 'reply',
    selectors: overrides.selectors || { ready: ['body'], composer: ['textarea'], submit: ['button'] },
    gates: overrides.gates || { publish_ready: true, blocked_reasons: [] }
  };
  writeJson(path.join(packetDir, 'browser_reply_job.json'), payload);
}

function findLatestThreadPacket(runsRoot) {
  if (!fs.existsSync(runsRoot)) {
    return null;
  }

  const runDates = fs.readdirSync(runsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a, 'en'));

  for (const runDate of runDates) {
    const repliesRoot = path.join(runsRoot, runDate, 'replies');

    if (!fs.existsSync(repliesRoot)) {
      continue;
    }

    const replyDirs = fs.readdirSync(repliesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, 'en'));

    for (const replyId of replyDirs) {
      const packetPath = path.join(repliesRoot, replyId, 'packet.json');

      if (fs.existsSync(packetPath)) {
        return {
          run_date: runDate,
          reply_id: replyId,
          path: packetPath,
          dir: path.join(repliesRoot, replyId)
        };
      }
    }
  }

  return null;
}

function buildThreadSnapshotFromFixtures(runsRoot) {
  const packet = findLatestThreadPacket(runsRoot);

  if (!packet) {
    return null;
  }

  const data = JSON.parse(fs.readFileSync(packet.path, 'utf8'));
  const jobPath = path.join(packet.dir, 'browser_reply_job.json');
  let jobData = null;

  if (fs.existsSync(jobPath)) {
    jobData = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  }

  return {
    run_date: packet.run_date,
    reply_id: data.reply_id,
    platform: data.execution_context.platform,
    target_url: data.execution_context.target_url,
    approval_ticket: data.execution_context.approval_ticket,
    classification: {
      bucket: data.classification.bucket,
      score: data.classification.score,
      manual_required: data.classification.manual_required
    },
    needs_manual_review: data.reply.needs_manual_review,
    draft_preview: data.reply.draft_text.split('\n')[0],
    packet_path: packet.path,
    job_path: jobData ? jobPath : null,
    selectors: jobData ? jobData.selectors : null,
    gates: jobData ? jobData.gates : null
  };
}

function patchThreadSnapshot(dashboardModule, runsRoot) {
  const original = dashboardModule.buildOpsSnapshot;

  dashboardModule.buildOpsSnapshot = function patched(queueData) {
    const snapshot = original(queueData);
    snapshot.modules = snapshot.modules || {};

    if (!snapshot.modules.threads) {
      const threadSnapshot = buildThreadSnapshotFromFixtures(runsRoot);
      if (threadSnapshot) {
        snapshot.modules.threads = threadSnapshot;
      }
    }

    return snapshot;
  };

  return () => {
    dashboardModule.buildOpsSnapshot = original;
  };
}

function withThreadFixtures(options, callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-thread-test-'));
  const approvalPath = path.join(tempDir, 'approval_registry.json');
  const queuePath = path.join(tempDir, 'daily_channel_queue.json');
  const runsRoot = path.join(tempDir, 'ops', 'runs');
  const operationsRoot = path.join(tempDir, 'ops');
  const threadActionLogPath = path.join(tempDir, 'ops', 'Ops', 'state', 'reviewhub_thread_action_log.ndjson');

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
  fs.mkdirSync(path.dirname(threadActionLogPath), { recursive: true });
  fs.writeFileSync(threadActionLogPath, '');

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
    'REVIEWHUB_OPS_RUNS_ROOT',
    'REVIEWHUB_THREAD_ACTION_LOG_PATH'
  ];
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  process.env.APPROVAL_REGISTRY_PATH = approvalPath;
  process.env.DAILY_CHANNEL_QUEUE_PATH = queuePath;
  process.env.OPERATIONS_ROOT = operationsRoot;
  process.env.REVIEWHUB_OPERATIONS_ROOT = operationsRoot;
  process.env.OPS_RUNS_ROOT = runsRoot;
  process.env.OPERATIONS_RUNS_ROOT = runsRoot;
  process.env.REVIEWHUB_OPS_RUNS_ROOT = runsRoot;
  process.env.REVIEWHUB_THREAD_ACTION_LOG_PATH = threadActionLogPath;

  const dashboardModulePath = path.resolve(__dirname, '..', 'lib', 'dashboard.js');
  delete require.cache[dashboardModulePath];
  const dashboardModule = require(dashboardModulePath);
  const restorePatch = patchThreadSnapshot(dashboardModule, runsRoot);

  try {
    return callback(dashboardModule, { runsRoot, operationsRoot });
  } finally {
    restorePatch();

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

test('thread snapshot prefers the most recent reply packet run', () => {
  const latestDate = '2026-03-24';
  withThreadFixtures(
    {
      prepareRuns: ({ runsRoot }) => {
        writePacket(runsRoot, '2026-03-22', 'older-thread', { draft_text: 'Old draft.' });
        const latestDir = writePacket(runsRoot, latestDate, 'latest-thread', {
          draft_text: 'Latest draft.',
          platform: 'X/Twitter'
        });
        writeJob(latestDir, { reply_id: 'latest-thread' });
      }
    },
    ({ loadDashboardData }) => {
      const snapshot = loadDashboardData().ops_snapshot.modules.threads;
      assert.ok(snapshot, 'Expected thread snapshot to exist');
      assert.equal(snapshot.run_date, latestDate);
      assert.equal(snapshot.reply_id, 'latest-thread');
      assert.equal(snapshot.platform, 'X/Twitter');
      assert.ok(snapshot.job_path && snapshot.selectors && snapshot.gates);
    }
  );
});

test('thread records merge local review state from thread action log', () => {
  withThreadFixtures(
    {
      prepareRuns: ({ runsRoot }) => {
        const dir = writePacket(runsRoot, '2026-03-25', 'thread-with-state', {
          draft_text: 'Needs follow-up.',
          manual_required: true
        });
        writeJob(dir, { reply_id: 'thread-with-state' });
      }
    },
    ({ loadDashboardData }) => {
      fs.writeFileSync(
        process.env.REVIEWHUB_THREAD_ACTION_LOG_PATH,
        `${JSON.stringify({
          timestamp_utc: '2026-03-25T09:00:00.000Z',
          actor: '@tester',
          reply_id: 'thread-with-state',
          action: 'mark_follow_up',
          note: '明天继续跟进',
          manual_state: 'follow_up'
        })}\n`,
        'utf8'
      );

      const records = loadDashboardData().ops_snapshot.modules.threads.records;
      assert.equal(records[0].reply_id, 'thread-with-state');
      assert.equal(records[0].review_state, 'follow_up');
      assert.equal(records[0].review_override, true);
      assert.equal(records[0].review_note, '明天继续跟进');
      assert.equal(records[0].review_updated_by, '@tester');
    }
  );
});

test('thread snapshot includes packet data when browser job file is missing', () => {
  withThreadFixtures(
    {
      prepareRuns: ({ runsRoot }) => {
        writePacket(runsRoot, '2026-03-22', 'jobless-thread', { draft_text: 'No job data.' });
      }
    },
    ({ loadDashboardData }) => {
      const snapshot = loadDashboardData().ops_snapshot.modules.threads;
      assert.ok(snapshot, 'Thread snapshot should degrade gracefully without job file');
      assert.equal(snapshot.run_date, '2026-03-22');
      assert.equal(snapshot.job_path, null);
      assert.equal(snapshot.selectors, null);
      assert.equal(snapshot.gates, null);
    }
  );
});

test('thread detail records expose selectors, gates, and draft preview', () => {
  const runDate = '2026-03-25';

  withThreadFixtures(
    {
      prepareRuns: ({ runsRoot }) => {
        const dir = writePacket(runsRoot, runDate, 'detail-thread', {
          draft_text: 'First line of draft\nFollow-up text',
          manual_required: true,
          score: 42
        });

        writeJob(dir, {
          reply_id: 'detail-thread',
          selectors: {
            ready: ['article'],
            composer: ['div[aria-label="reply"]'],
            submit: ['button[type="submit"]']
          },
          gates: {
            publish_ready: false,
            blocked_reasons: ['missing approval ticket'],
            manual_required: true
          }
        });
      }
    },
    ({ loadDashboardData }) => {
      const records = loadDashboardData().ops_snapshot.modules.threads.records;
      assert.equal(records[0].reply_id, 'detail-thread');
      assert.equal(records[0].draft_preview, 'First line of draft');
      assert.deepEqual(records[0].selectors, {
        ready: ['article'],
        composer: ['div[aria-label="reply"]'],
        submit: ['button[type="submit"]']
      });
      assert.ok(records[0].gates);
      assert.deepEqual(records[0].gates.blocked_reasons, ['missing approval ticket']);
      assert.equal(records[0].manual_required, true);
      assert.equal(records[0].classification_bucket, 'B');
      assert.equal(records[0].classification_score, 42);
    }
  );
});
