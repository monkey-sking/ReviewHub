const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadDashboardData } = require('./lib/dashboard');

const PORT = Number(process.env.PORT || 4310);
const HOST = process.env.HOST || '127.0.0.1';
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

function getPublicFilePath(requestPath) {
  const decodedPath = decodeURIComponent(requestPath || '/');
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const filePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  attachRequestLogger(request, response);
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
      sendJson(response, 500, {
        error: 'Failed to load ReviewHub data.',
        message: error.message
      });
    }
    return;
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  const filePath = getPublicFilePath(url.pathname);

  if (!filePath) {
    sendText(response, 400, 'Invalid path');
    return;
  }

  sendFile(response, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`ReviewHub running at http://${HOST}:${PORT}`);
  console.log(`ReviewHub health check at http://${HOST}:${PORT}/api/health`);
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});
