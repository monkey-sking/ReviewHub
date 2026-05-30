const path = require('path');
const http = require('http');
const fs = require('fs');

// PRODUCTION PATH CONFIGURATION
const OPS_BASE = '/Volumes/SSD/Projects/Operations';
const PUBLIC_DIR = path.resolve(__dirname, 'dist');

const paths = {
  OPERATIONS_ROOT: process.env.OPERATIONS_ROOT || OPS_BASE,
  REVIEWHUB_OPERATIONS_ROOT: process.env.OPERATIONS_ROOT || OPS_BASE,
  APPROVAL_REGISTRY_PATH: path.join(process.env.OPERATIONS_ROOT || OPS_BASE, 'Ops/state/approval_registry.json'),
  DAILY_CHANNEL_QUEUE_PATH: path.join(process.env.OPERATIONS_ROOT || OPS_BASE, 'Ops/state/daily_channel_queue.json'),
  PROJECT_KANBAN_PATH: path.join(process.env.OPERATIONS_ROOT || OPS_BASE, 'PROJECT_KANBAN.md'),
  OPS_RUNS_ROOT: path.join(process.env.OPERATIONS_ROOT || OPS_BASE, 'Ops/runs'),
  REVIEWHUB_OPS_RUNS_ROOT: path.join(process.env.OPERATIONS_ROOT || OPS_BASE, 'Ops/runs')
};

// Inject current paths into process.env for all required modules
for (const [key, value] of Object.entries(paths)) {
  process.env[key] = value;
}

const { DashboardDataError, loadDashboardData } = require('./lib/dashboard');
const {
  getWorkboardData,
  getInboxData,
  getIssuesData,
  getProjectsData,
  getProjectDetailData,
  getActivityData
} = require('./lib/resourceApis');
const { getRecapData } = require('./lib/recapApis');
const { QueueActionError, applyQueueAction, applyQueueActionsBatch } = require('./lib/queueActions');
const { ThreadActionError, applyThreadAction } = require('./lib/threadActions');
const { OpsActionError, applyOpsAction } = require('./lib/operationsActions');
const { ProjectBoardActionError, applyProjectBoardAction } = require('./lib/projectBoardActions');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
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
  if (
    error instanceof QueueActionError
    || error instanceof ThreadActionError
    || error instanceof OpsActionError
    || error instanceof ProjectBoardActionError
  ) {
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
  let filePath = path.resolve(publicDir, relativePath);
  const relativeToPublic = path.relative(publicDir, filePath);

  if (relativeToPublic.startsWith('..') || path.isAbsolute(relativeToPublic)) {
    return null;
  }

  // SPA fallback: if file doesn't exist AND it's not an API call, serve index.html
  if (!fs.existsSync(filePath) && !decodedPath.startsWith('/api/')) {
    return path.join(publicDir, 'index.html');
  }

  return filePath;
}

function createServer() {
  return http.createServer((request, response) => {
    attachRequestLogger(request, response);

    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, {
          ok: true,
          service: 'ReviewHub',
          generated_at: new Date().toISOString()
        });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/workboard') {
        try {
          sendJson(response, 200, getWorkboardData());
        } catch (error) {
          sendJson(response, 500, { error: '加载看板数据失败。', message: error.message });
        }
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/inbox') {
        try {
          sendJson(response, 200, getInboxData());
        } catch (error) {
          sendJson(response, 500, { error: '加载收件箱失败。', message: error.message });
        }
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/recap') {
        try {
          const targetDate = url.searchParams.get('date');
          sendJson(response, 200, getRecapData(targetDate));
        } catch (error) {
          sendJson(response, 500, { error: '生成复盘数据失败。', message: error.message });
        }
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/issues') {
        try {
          sendJson(response, 200, getIssuesData());
        } catch (error) {
          sendJson(response, 500, { error: '加载问题记录失败。', message: error.message });
        }
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/projects') {
        try {
          sendJson(response, 200, getProjectsData());
        } catch (error) {
          sendJson(response, 500, { error: '加载项目列表失败。', message: error.message });
        }
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/projects/')) {
        try {
          const projectId = decodeActionSegment(response, url.pathname.slice('/api/projects/'.length));
          if (!projectId) return;
          const data = getProjectDetailData(projectId);
          if (!data) {
            sendJson(response, 404, { error: '未找到该项目。' });
          } else {
            sendJson(response, 200, data);
          }
        } catch (error) {
          sendJson(response, 500, { error: '加载项目详情失败。', message: error.message });
        }
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/activity') {
        try {
          sendJson(response, 200, getActivityData());
        } catch (error) {
          sendJson(response, 500, { error: '加载活动记录失败。', message: error.message });
        }
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/queue/actions') {
        readJsonBody(request)
          .then((body) => {
            const result = applyQueueActionsBatch({
              itemIds: body.item_ids,
              action: body.action,
              note: body.note,
              actor: body.actor
            });
            sendJson(response, 200, result);
          })
          .catch((error) => sendActionError(response, error));
        return;
      }

      if (request.method === 'POST' && url.pathname.startsWith('/api/queue/')) {
        const parts = url.pathname.split('/');
        if (parts.length === 5 && parts[4] === 'action') {
          const itemId = decodeActionSegment(response, parts[3]);
          if (!itemId) return;

          readJsonBody(request)
            .then((body) => {
              const result = applyQueueAction({
                itemId,
                action: body.action,
                note: body.note,
                actor: body.actor
              });
              sendJson(response, 200, result);
            })
            .catch((error) => sendActionError(response, error));
          return;
        }
      }

      if (request.method === 'POST' && url.pathname.startsWith('/api/ops/')) {
        const parts = url.pathname.split('/');
        if (parts.length === 5 && parts[4] === 'action') {
          const actionId = decodeActionSegment(response, parts[3]);
          if (!actionId) return;

          readJsonBody(request)
            .then((body) => {
              const result = applyOpsAction({
                actionId,
                action: body.action,
                actor: body.actor,
                note: body.note,
                extra: body
              });
              sendJson(response, 200, result);
            })
            .catch((error) => sendActionError(response, error));
          return;
        }
      }

      if (request.method === 'POST' && url.pathname.startsWith('/api/project-board/')) {
        const parts = url.pathname.split('/');
        if (parts.length === 5 && parts[4] === 'action') {
          const itemId = decodeActionSegment(response, parts[3]);
          if (!itemId) return;

          readJsonBody(request)
            .then((body) => {
              const result = applyProjectBoardAction({
                itemId,
                action: body.action,
                sectionId: body.section_id,
                fields: body.fields
              });
              sendJson(response, 200, result);
            })
            .catch((error) => sendActionError(response, error));
          return;
        }
      }

      if (request.method === 'GET' && url.pathname === '/favicon.ico') {
        response.writeHead(204, {
          'Cache-Control': 'no-store'
        });
        response.end();
        return;
      }

      const filePath = getPublicFilePath(url.pathname);
      if (!filePath) {
        sendText(response, 403, 'Forbidden');
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

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      console.error(`ReviewHub 启动失败：${host}:${port} 已被占用。`);
      process.exitCode = 1;
      return;
    }
    console.error('ReviewHub 启动失败。', error);
    process.exitCode = 1;
  });

  server.listen(port, host, () => {
    console.log(`ReviewHub running at http://${host}:${port}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createServer,
  getPublicFilePath,
  startServer
};
