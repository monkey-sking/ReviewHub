const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const { once } = require('node:events');
const { spawn } = require('node:child_process');

async function getFreePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  server.close();
  await once(server, 'close');
  return port;
}

function request(host, port, requestPath, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path: requestPath,
        method: options.method || 'GET',
        headers: options.headers || {}
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode || 0,
            body
          });
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function startServerWithEnv(envOverrides) {
  const port = await getFreePort();
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      ...envOverrides
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for server startup.\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    }, 5_000);

    const onData = () => {
      if (stdout.includes('ReviewHub running at')) {
        clearTimeout(timeout);
        child.stdout.off('data', onData);
        resolve();
      }
    };

    child.stdout.on('data', onData);
    onData();
  });

  return { child, port };
}

async function stopServer(child) {
  if (!child.killed) {
    child.kill('SIGINT');
  }

  try {
    await once(child, 'exit');
  } catch (_error) {
    // Best-effort cleanup only.
  }
}

test('malformed encoded static path returns 400 and server remains healthy', async (t) => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-server-test-'));
  const approvalPath = path.join(fixtureDir, 'approval_registry.json');
  const queuePath = path.join(fixtureDir, 'daily_channel_queue.json');
  const port = await getFreePort();

  fs.writeFileSync(
    approvalPath,
    JSON.stringify({ schema_version: 'test', updated_at_utc: '2026-03-24T00:00:00.000Z', entries: [] })
  );
  fs.writeFileSync(
    queuePath,
    JSON.stringify({ schema_version: 'test', run_date: '2026-03-24', items: [], status_counts: {} })
  );

  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      APPROVAL_REGISTRY_PATH: approvalPath,
      DAILY_CHANNEL_QUEUE_PATH: queuePath
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timed out waiting for server startup.\nstdout:\n${stdout}\nstderr:\n${stderr}`));
      }, 5_000);

      const onData = () => {
        if (stdout.includes('ReviewHub running at')) {
          clearTimeout(timeout);
          child.stdout.off('data', onData);
          resolve();
        }
      };

      child.stdout.on('data', onData);
      onData();
    });

    const malformedResponse = await request('127.0.0.1', port, '/%E0%A4%A');
    assert.equal(
      malformedResponse.statusCode,
      400,
      `Expected 400 for malformed URI. Received ${malformedResponse.statusCode}. body=${malformedResponse.body}`
    );

    const healthResponse = await request('127.0.0.1', port, '/api/health');
    assert.equal(
      healthResponse.statusCode,
      200,
      `Server did not remain healthy after malformed URI. body=${healthResponse.body}`
    );
  } finally {
    if (!child.killed) {
      child.kill('SIGINT');
    }

    try {
      await once(child, 'exit');
    } catch (_error) {
      // Best-effort cleanup only.
    }

    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }

  t.diagnostic('Server handled malformed static path without crashing');
});

test('dashboard returns diagnosable 500 when source file is missing', async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-server-test-missing-'));
  const queuePath = path.join(fixtureDir, 'daily_channel_queue.json');
  const missingApprovalPath = path.join(fixtureDir, 'approval_registry_missing.json');

  fs.writeFileSync(
    queuePath,
    JSON.stringify({ schema_version: 'test', run_date: '2026-03-24', items: [], status_counts: {} })
  );

  const { child, port } = await startServerWithEnv({
    APPROVAL_REGISTRY_PATH: missingApprovalPath,
    DAILY_CHANNEL_QUEUE_PATH: queuePath
  });

  try {
    const dashboardResponse = await request('127.0.0.1', port, '/api/dashboard');
    assert.equal(dashboardResponse.statusCode, 500);
    const payload = JSON.parse(dashboardResponse.body);
    assert.equal(payload.error, '加载 ReviewHub 数据失败。');
    assert.equal(payload.message, 'ReviewHub 无法读取一个或多个源文件。');
    assert.ok(!Object.hasOwn(payload, 'stack'));
    assert.ok(Array.isArray(payload.details));
    assert.ok(payload.details.length >= 1);
    assert.equal(payload.details[0].source, 'approval_registry');
    assert.equal(payload.details[0].issue, '源文件不存在。');
    assert.equal(typeof payload.source_files, 'object');
    assert.equal(payload.source_files.approval_registry, missingApprovalPath);
    assert.equal(payload.source_files.daily_channel_queue, queuePath);

    const healthResponse = await request('127.0.0.1', port, '/api/health');
    assert.equal(healthResponse.statusCode, 200);
  } finally {
    await stopServer(child);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('dashboard returns 500 for invalid JSON and server remains healthy', async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-server-test-json-'));
  const approvalPath = path.join(fixtureDir, 'approval_registry.json');
  const queuePath = path.join(fixtureDir, 'daily_channel_queue.json');

  fs.writeFileSync(approvalPath, '{ invalid json');
  fs.writeFileSync(
    queuePath,
    JSON.stringify({ schema_version: 'test', run_date: '2026-03-24', items: [], status_counts: {} })
  );

  const { child, port } = await startServerWithEnv({
    APPROVAL_REGISTRY_PATH: approvalPath,
    DAILY_CHANNEL_QUEUE_PATH: queuePath
  });

  try {
    const dashboardResponse = await request('127.0.0.1', port, '/api/dashboard');
    assert.equal(dashboardResponse.statusCode, 500);
    const payload = JSON.parse(dashboardResponse.body);
    assert.equal(payload.error, '加载 ReviewHub 数据失败。');
    assert.equal(payload.message, 'ReviewHub 无法读取一个或多个源文件。');
    assert.ok(!Object.hasOwn(payload, 'stack'));
    assert.ok(Array.isArray(payload.details));
    assert.ok(payload.details.length >= 1);
    assert.equal(payload.details[0].source, 'approval_registry');
    assert.equal(payload.details[0].issue, 'JSON 内容无效。');
    assert.equal(typeof payload.details[0].hint, 'string');
    assert.equal(typeof payload.source_files, 'object');
    assert.equal(payload.source_files.approval_registry, approvalPath);
    assert.equal(payload.source_files.daily_channel_queue, queuePath);

    const healthResponse = await request('127.0.0.1', port, '/api/health');
    assert.equal(healthResponse.statusCode, 200);
  } finally {
    await stopServer(child);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('queue action endpoint approves items and persists the new state', async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-server-test-action-'));
  const approvalPath = path.join(fixtureDir, 'approval_registry.json');
  const queuePath = path.join(fixtureDir, 'daily_channel_queue.json');
  const actionLogPath = path.join(fixtureDir, 'reviewhub_action_log.ndjson');

  fs.writeFileSync(
    approvalPath,
    JSON.stringify({
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
    }, null, 2)
  );
  fs.writeFileSync(
    queuePath,
    JSON.stringify({
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
    }, null, 2)
  );

  const { child, port } = await startServerWithEnv({
    APPROVAL_REGISTRY_PATH: approvalPath,
    DAILY_CHANNEL_QUEUE_PATH: queuePath,
    REVIEWHUB_ACTION_LOG_PATH: actionLogPath,
    REVIEWHUB_OPERATIONS_ROOT: fixtureDir
  });

  try {
    const actionResponse = await request('127.0.0.1', port, '/api/queue/queue-approve-001/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        action: 'approve',
        note: 'approved in test'
      })
    });

    assert.equal(actionResponse.statusCode, 200, actionResponse.body);
    const payload = JSON.parse(actionResponse.body);
    assert.equal(payload.ok, true);
    assert.equal(payload.item.status, 'queued');
    assert.equal(payload.item.action_state, 'ready_to_execute');

    const persistedQueue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    const persistedApproval = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));
    assert.equal(persistedQueue.items[0].status, 'queued');
    assert.equal(persistedQueue.status_counts.queued, 1);
    assert.equal(persistedApproval.entries[0].status, 'approved');
    assert.match(fs.readFileSync(actionLogPath, 'utf8'), /queue-approve-001/);
  } finally {
    await stopServer(child);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('queue action rejects malformed encoded id with 400', async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-server-test-malformed-'));
  const approvalPath = path.join(fixtureDir, 'approval_registry.json');
  const queuePath = path.join(fixtureDir, 'daily_channel_queue.json');

  fs.writeFileSync(
    approvalPath,
    JSON.stringify({ schema_version: 'test', updated_at_utc: '2026-03-24T00:00:00.000Z', entries: [] })
  );
  fs.writeFileSync(
    queuePath,
    JSON.stringify({ schema_version: 'test', run_date: '2026-03-24', items: [], status_counts: {} })
  );

  const { child, port } = await startServerWithEnv({
    APPROVAL_REGISTRY_PATH: approvalPath,
    DAILY_CHANNEL_QUEUE_PATH: queuePath
  });

  try {
    const response = await request('127.0.0.1', port, '/api/queue/%E0%A4%A/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ action: 'mark_ready' })
    });

    assert.equal(response.statusCode, 400);
    const payload = JSON.parse(response.body);
    assert.equal(payload.error, '路径编码无效。');
  } finally {
    await stopServer(child);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('queue batch action endpoint updates multiple items and persists the new state', async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-server-test-batch-action-'));
  const approvalPath = path.join(fixtureDir, 'approval_registry.json');
  const queuePath = path.join(fixtureDir, 'daily_channel_queue.json');
  const actionLogPath = path.join(fixtureDir, 'reviewhub_action_log.ndjson');

  fs.writeFileSync(
    approvalPath,
    JSON.stringify({
      schema_version: 'test',
      updated_at_utc: '2026-03-24T00:00:00.000Z',
      entries: []
    }, null, 2)
  );
  fs.writeFileSync(
    queuePath,
    JSON.stringify({
      schema_version: 'test',
      run_date: '2026-03-24',
      items: [
        {
          item_id: 'queue-batch-001',
          status: 'queued',
          platform: 'Product Hunt',
          title: 'Batch checklist one',
          owner: 'ops',
          source: 'Content/Marketing/post-1.md',
          risk: 'review',
          notes: '-'
        },
        {
          item_id: 'queue-batch-002',
          status: 'queued',
          platform: 'Product Hunt',
          title: 'Batch checklist two',
          owner: 'ops',
          source: 'Content/Marketing/post-2.md',
          risk: 'review',
          notes: '-'
        }
      ],
      status_counts: {
        queued: 2
      }
    }, null, 2)
  );

  const { child, port } = await startServerWithEnv({
    APPROVAL_REGISTRY_PATH: approvalPath,
    DAILY_CHANNEL_QUEUE_PATH: queuePath,
    REVIEWHUB_ACTION_LOG_PATH: actionLogPath,
    REVIEWHUB_OPERATIONS_ROOT: fixtureDir
  });

  try {
    const actionResponse = await request('127.0.0.1', port, '/api/queue/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        item_ids: ['queue-batch-001', 'queue-batch-002'],
        action: 'mark_missing_info',
        note: '缺少截图, 缺少链接',
        reasons: ['缺少截图', '缺少链接']
      })
    });

    assert.equal(actionResponse.statusCode, 200, actionResponse.body);
    const payload = JSON.parse(actionResponse.body);
    assert.equal(payload.ok, true);
    assert.equal(payload.updated_count, 2);
    assert.deepEqual(payload.item_ids, ['queue-batch-001', 'queue-batch-002']);

    const persistedQueue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.equal(persistedQueue.items[0].reviewhub.manual_action_state, 'missing_info');
    assert.equal(persistedQueue.items[1].reviewhub.manual_action_state, 'missing_info');

    const logEntries = fs.readFileSync(actionLogPath, 'utf8').trim().split('\n');
    assert.equal(logEntries.length, 2);
  } finally {
    await stopServer(child);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('thread action endpoint persists local review state for reply tasks', async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-server-test-thread-action-'));
  const approvalPath = path.join(fixtureDir, 'approval_registry.json');
  const queuePath = path.join(fixtureDir, 'daily_channel_queue.json');
  const operationsRoot = path.join(fixtureDir, 'ops-root');
  const runsRoot = path.join(operationsRoot, 'Ops', 'runs');
  const stateDir = path.join(operationsRoot, 'Ops', 'state');
  const threadActionLogPath = path.join(stateDir, 'reviewhub_thread_action_log.ndjson');
  const packetDir = path.join(runsRoot, '2026-03-25', 'replies', 'thread-server-001');

  fs.mkdirSync(packetDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'review_index.md'), '# Review Index\n\nDate: 2026-03-24\n');
  fs.writeFileSync(path.join(stateDir, 'experiment_log.md'), '# Experiment Log\n\nDate: 2026-03-24\n');
  fs.writeFileSync(threadActionLogPath, '');
  fs.writeFileSync(
    path.join(packetDir, 'packet.json'),
    JSON.stringify({
      packet_version: '1.0',
      created_at_utc: '2026-03-25T00:00:00Z',
      run_date: '2026-03-25',
      reply_id: 'thread-server-001',
      execution_context: {
        platform: 'reddit',
        target_url: 'https://example.com/thread',
        approval_ticket: 'thread-server-ticket'
      },
      classification: {
        bucket: 'B',
        score: 9,
        manual_required: true
      },
      reply: {
        needs_manual_review: true,
        draft_text: 'Need operator review.'
      }
    }, null, 2)
  );
  fs.writeFileSync(
    path.join(packetDir, 'browser_reply_job.json'),
    JSON.stringify({
      job_version: 'lobster.browser.reply.fill.v1',
      reply_id: 'thread-server-001',
      selectors: { ready: ['body'], composer: ['textarea'], submit: ['button'] },
      gates: { publish_ready: true, blocked_reasons: [] }
    }, null, 2)
  );
  fs.writeFileSync(
    approvalPath,
    JSON.stringify({ schema_version: 'test', updated_at_utc: '2026-03-24T00:00:00.000Z', entries: [] }, null, 2)
  );
  fs.writeFileSync(
    queuePath,
    JSON.stringify({ schema_version: 'test', run_date: '2026-03-24', items: [], status_counts: {} }, null, 2)
  );

  const { child, port } = await startServerWithEnv({
    APPROVAL_REGISTRY_PATH: approvalPath,
    DAILY_CHANNEL_QUEUE_PATH: queuePath,
    REVIEWHUB_OPERATIONS_ROOT: operationsRoot,
    REVIEWHUB_OPS_RUNS_ROOT: runsRoot,
    REVIEW_INDEX_PATH: path.join(stateDir, 'review_index.md'),
    EXPERIMENT_LOG_PATH: path.join(stateDir, 'experiment_log.md'),
    REVIEWHUB_THREAD_ACTION_LOG_PATH: threadActionLogPath
  });

  try {
    const actionResponse = await request('127.0.0.1', port, '/api/thread/thread-server-001/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        action: 'mark_done',
        note: '已处理'
      })
    });

    assert.equal(actionResponse.statusCode, 200, actionResponse.body);
    const payload = JSON.parse(actionResponse.body);
    assert.equal(payload.ok, true);
    assert.equal(payload.thread.reply_id, 'thread-server-001');
    assert.equal(payload.thread.review_state, 'done');
    assert.match(fs.readFileSync(threadActionLogPath, 'utf8'), /thread-server-001/);
  } finally {
    await stopServer(child);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('ops action endpoint persists local follow-up state for review records', async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-server-test-ops-action-'));
  const approvalPath = path.join(fixtureDir, 'approval_registry.json');
  const queuePath = path.join(fixtureDir, 'daily_channel_queue.json');
  const operationsRoot = path.join(fixtureDir, 'ops-root');
  const stateDir = path.join(operationsRoot, 'Ops', 'state');
  const runsRoot = path.join(operationsRoot, 'Ops', 'runs');
  const reviewIndexPath = path.join(stateDir, 'review_index.md');
  const experimentLogPath = path.join(stateDir, 'experiment_log.md');
  const opsActionLogPath = path.join(stateDir, 'reviewhub_ops_action_log.ndjson');

  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(runsRoot, { recursive: true });
  fs.writeFileSync(
    reviewIndexPath,
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
  fs.writeFileSync(experimentLogPath, '# Experiment Log\n\nDate: 2026-03-25\n');
  fs.writeFileSync(opsActionLogPath, '');
  fs.writeFileSync(
    approvalPath,
    JSON.stringify({ schema_version: 'test', updated_at_utc: '2026-03-25T00:00:00.000Z', entries: [] }, null, 2)
  );
  fs.writeFileSync(
    queuePath,
    JSON.stringify({ schema_version: 'test', run_date: '2026-03-25', items: [], status_counts: {} }, null, 2)
  );

  const { child, port } = await startServerWithEnv({
    APPROVAL_REGISTRY_PATH: approvalPath,
    DAILY_CHANNEL_QUEUE_PATH: queuePath,
    REVIEWHUB_OPERATIONS_ROOT: operationsRoot,
    REVIEWHUB_OPS_RUNS_ROOT: runsRoot,
    REVIEW_INDEX_PATH: reviewIndexPath,
    EXPERIMENT_LOG_PATH: experimentLogPath,
    REVIEWHUB_OPS_ACTION_LOG_PATH: opsActionLogPath
  });

  try {
    const dashboardResponse = await request('127.0.0.1', port, '/api/dashboard');
    assert.equal(dashboardResponse.statusCode, 200, dashboardResponse.body);
    const dashboardPayload = JSON.parse(dashboardResponse.body);
    const reviewRecord = dashboardPayload.operations_record_catalog.find((record) => record.ui_id === 'review:0');
    assert.ok(reviewRecord);

    const actionResponse = await request('127.0.0.1', port, `/api/ops/${encodeURIComponent(reviewRecord.action_id)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        action: 'mark_execute',
        note: '推进处理'
      })
    });

    assert.equal(actionResponse.statusCode, 200, actionResponse.body);
    const payload = JSON.parse(actionResponse.body);
    assert.equal(payload.ok, true);
    assert.equal(payload.record.review_state, 'execute');
    assert.match(fs.readFileSync(opsActionLogPath, 'utf8'), /"action":"mark_execute"/);
  } finally {
    await stopServer(child);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('favicon requests return 204 without console-noise 404 fallback', async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-server-test-favicon-'));
  const approvalPath = path.join(fixtureDir, 'approval_registry.json');
  const queuePath = path.join(fixtureDir, 'daily_channel_queue.json');

  fs.writeFileSync(
    approvalPath,
    JSON.stringify({ schema_version: 'test', updated_at_utc: '2026-03-24T00:00:00.000Z', entries: [] })
  );
  fs.writeFileSync(
    queuePath,
    JSON.stringify({ schema_version: 'test', run_date: '2026-03-24', items: [], status_counts: {} })
  );

  const { child, port } = await startServerWithEnv({
    APPROVAL_REGISTRY_PATH: approvalPath,
    DAILY_CHANNEL_QUEUE_PATH: queuePath
  });

  try {
    const faviconResponse = await request('127.0.0.1', port, '/favicon.ico');
    assert.equal(faviconResponse.statusCode, 204);

    const healthResponse = await request('127.0.0.1', port, '/api/health');
    assert.equal(healthResponse.statusCode, 200);
  } finally {
    await stopServer(child);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});


test('homepage exposes recent activity, daily processing, signal stream, and source preview sections', async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-server-test-home-'));
  const approvalPath = path.join(fixtureDir, 'approval_registry.json');
  const queuePath = path.join(fixtureDir, 'daily_channel_queue.json');

  fs.writeFileSync(
    approvalPath,
    JSON.stringify({ schema_version: 'test', updated_at_utc: '2026-03-24T00:00:00.000Z', entries: [] })
  );
  fs.writeFileSync(
    queuePath,
    JSON.stringify({ schema_version: 'test', run_date: '2026-03-24', items: [], status_counts: {} })
  );

  const { child, port } = await startServerWithEnv({
    APPROVAL_REGISTRY_PATH: approvalPath,
    DAILY_CHANNEL_QUEUE_PATH: queuePath
  });

  try {
    const homeResponse = await request('127.0.0.1', port, '/');
    assert.equal(homeResponse.statusCode, 200);
    assert.match(homeResponse.body, /recentActivityList/);
    assert.match(homeResponse.body, /processingLaneList/);
    assert.match(homeResponse.body, /signalStreamList/);
    assert.match(homeResponse.body, /sourcePreviewPanel/);

    const dashboardResponse = await request('127.0.0.1', port, '/api/dashboard');
    assert.equal(dashboardResponse.statusCode, 200);
    const payload = JSON.parse(dashboardResponse.body);
    assert.equal(typeof payload.recent_activity, 'object');
    assert.equal(Array.isArray(payload.recent_activity.entries), true);
    assert.equal(typeof payload.daily_processing_queue, 'object');
    assert.equal(Array.isArray(payload.daily_processing_queue.entries), true);
    assert.equal(typeof payload.signal_stream, 'object');
    assert.equal(Array.isArray(payload.signal_stream.entries), true);
  } finally {
    await stopServer(child);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});
