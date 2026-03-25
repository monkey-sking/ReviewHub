const http = require('http');
const fs = require('fs');
const path = require('path');
const { DashboardDataError, loadDashboardData } = require('./lib/dashboard');
const { QueueActionError, applyQueueAction, applyQueueActionsBatch } = require('./lib/queueActions');
const { ThreadActionError, applyThreadAction } = require('./lib/threadActions');
const { OpsActionError, applyOpsAction } = require('./lib/operationsActions');

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload, null, 2));
}

function attachRequestLogger(request, response) {
  const startedAt = Date.now();
  response.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const url = request.url || '/';
    console.log(`[${new Date().toISOString()}] ${request.method} ${url} -> ${response.statusCode} (${durationMs}ms)`);
  });
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8'
  });
  response.end(text);
}

function decodeActionSegment(response, segment) {
  try {
    return decodeURIComponent(segment);
  } catch (_error) {
    sendJson(response, 400, { error: '路径编码无效。', details: null });
    return null;
  }
}

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(response, 404, 'Not found');
      return;
    }

    const extname = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentType
    });
    response.end(content);
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;

      if (Buffer.byteLength(body, 'utf8') > 1024 * 1024) {
        reject(new QueueActionError('请求体过大。', { statusCode: 413 }));
      }
    });
    request.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (_error) {
        reject(new QueueActionError('请求体必须是合法 JSON。'));
      }
    });
    request.on('error', reject);
  });
}

function sendActionError(response, error) {
  if (error instanceof QueueActionError || error instanceof ThreadActionError || error instanceof OpsActionError) {
    sendJson(response, error.statusCode, {
      error: error.message,
      details: error.details || null
    });
    return;
  }

  console.error(`[${new Date().toISOString()}] Queue action failed`, error);
  sendJson(response, 500, { error: '处理队列动作时发生内部错误。' });
}

function getPublicFilePath(requestPath, publicDir = PUBLIC_DIR) {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(requestPath || '/');
  } catch (_error) {
    return null;
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const filePath = path.resolve(publicDir, relativePath);
  const relativeToPublic = path.relative(publicDir, filePath);

  if (relativeToPublic.startsWith('..') || path.isAbsolute(relativeToPublic)) {
    return null;
  }

  return filePath;
}

function createServer() {
  return http.createServer((request, response) => {
    attachRequestLogger(request, response);

    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, {
          ok: true,
          service: 'ReviewHub',
          generated_at: new Date().toISOString()
        });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/dashboard') {
        try {
          sendJson(response, 200, loadDashboardData());
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Failed to load dashboard data`, error);
          const payload = {
            error: '加载 ReviewHub 数据失败。',
            message: error.message
          };

          if (error instanceof DashboardDataError) {
            payload.details = error.details;
            payload.source_files = error.source_files;
          }

          sendJson(response, 500, payload);
        }
        return;
      }

      if (request.method === 'GET' && url.pathname === '/favicon.ico') {
        response.writeHead(204, {
          'Cache-Control': 'no-store'
        });
        response.end();
        return;
      }

      const queueActionMatch = url.pathname.match(/^\/api\/queue\/([^/]+)\/action$/);
      const threadActionMatch = url.pathname.match(/^\/api\/thread\/([^/]+)\/action$/);
      const opsActionMatch = url.pathname.match(/^\/api\/ops\/([^/]+)\/action$/);

      if (request.method === 'POST' && url.pathname === '/api/queue/actions') {
        readJsonBody(request)
          .then((payload) => {
            const result = applyQueueActionsBatch({
              itemIds: payload && payload.item_ids,
              action: payload && payload.action,
              note: payload && payload.note,
              actor: payload && payload.actor,
              reasons: payload && payload.reasons,
              deferUntilUtc: payload && payload.defer_until_utc
            });
            sendJson(response, 200, result);
          })
          .catch((error) => {
            sendActionError(response, error);
          });
        return;
      }

      if (request.method === 'POST' && queueActionMatch) {
        const itemId = decodeActionSegment(response, queueActionMatch[1]);

        if (!itemId) {
          return;
        }

        readJsonBody(request)
          .then((payload) => {
            const result = applyQueueAction({
              itemId,
              action: payload && payload.action,
              note: payload && payload.note,
              actor: payload && payload.actor,
              reasons: payload && payload.reasons,
              deferUntilUtc: payload && payload.defer_until_utc
            });
            sendJson(response, 200, result);
          })
          .catch((error) => {
            sendActionError(response, error);
          });
        return;
      }

      if (request.method === 'POST' && threadActionMatch) {
        const replyId = decodeActionSegment(response, threadActionMatch[1]);

        if (!replyId) {
          return;
        }

        readJsonBody(request)
          .then((payload) => {
            const result = applyThreadAction({
              replyId,
              action: payload && payload.action,
              note: payload && payload.note,
              actor: payload && payload.actor
            });
            sendJson(response, 200, result);
          })
          .catch((error) => {
            sendActionError(response, error);
          });
        return;
      }

      if (request.method === 'POST' && opsActionMatch) {
        const actionId = decodeActionSegment(response, opsActionMatch[1]);

        if (!actionId) {
          return;
        }

        readJsonBody(request)
          .then((payload) => {
            const result = applyOpsAction({
              actionId,
              action: payload && payload.action,
              actor: payload && payload.actor,
              note: payload && payload.note,
              deferUntilUtc: payload && payload.defer_until_utc
            });
            sendJson(response, 200, result);
          })
          .catch((error) => {
            sendActionError(response, error);
          });
        return;
      }

      if (request.method !== 'GET') {
        sendJson(response, 405, { error: '不支持该请求方法。' });
        return;
      }

      const filePath = getPublicFilePath(url.pathname);

      if (!filePath) {
        sendText(response, 400, '路径无效');
        return;
      }

      sendFile(response, filePath);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Unhandled request error`, error);

      if (!response.headersSent) {
        sendJson(response, 500, { error: '服务器内部错误。' });
      } else {
        response.end();
      }
    }
  });
}

function startServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 4310);
  const host = options.host ?? process.env.HOST ?? '127.0.0.1';
  const server = createServer();

  server.listen(port, host, () => {
    console.log(`ReviewHub running at http://${host}:${port}`);
    console.log(`ReviewHub health check at http://${host}:${port}/api/health`);
  });

  return server;
}

if (require.main === module) {
  const server = startServer();

  process.on('SIGINT', () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

module.exports = {
  createServer,
  getPublicFilePath,
  startServer
};
