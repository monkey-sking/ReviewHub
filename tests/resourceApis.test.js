const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { createServer } = require('../server');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

test('Resource APIs return expected structures', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  await t.test('GET /api/workboard returns daily processing queue', async () => {
    const res = await fetchJson(`${baseUrl}/api/workboard`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.entries));
    assert.ok('total_entries' in res.body);
  });

  await t.test('GET /api/inbox returns queue items', async () => {
    const res = await fetchJson(`${baseUrl}/api/inbox`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.items));
    assert.ok(res.body.summary.total >= 0);
  });

  await t.test('GET /api/issues returns records and feedback', async () => {
    const res = await fetchJson(`${baseUrl}/api/issues`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.records));
    assert.ok('feedback' in res.body);
  });

  await t.test('GET /api/projects returns project list', async () => {
    const res = await fetchJson(`${baseUrl}/api/projects`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.projects));
    assert.ok('workspace_summary' in res.body);
  });

  await t.test('GET /api/activity returns signals', async () => {
    const res = await fetchJson(`${baseUrl}/api/activity`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.entries));
  });

  server.close();
});
