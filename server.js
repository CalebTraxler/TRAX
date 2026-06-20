'use strict';

/**
 * TRAX server — zero dependencies (Node built-ins only).
 * Serves the dashboard + a small JSON API.
 *
 *   GET /                -> dashboard
 *   GET /api/data        -> full payload (?metric=blended|input|output)
 *   GET /api/spot        -> live spot tick (?metric=...)
 *
 * Run:  node server.js   (then open http://localhost:4317)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildPayload, spot } = require('./lib/trax');

const PORT = process.env.PORT || 4317;
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJSON(res, obj, code = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function serveStatic(res, urlPath) {
  let rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC, rel);
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const metric = url.searchParams.get('metric') || 'blended';

  try {
    if (url.pathname === '/api/data') return sendJSON(res, buildPayload(metric));
    if (url.pathname === '/api/spot') return sendJSON(res, spot(metric));
  } catch (e) {
    return sendJSON(res, { error: String(e && e.message || e) }, 500);
  }
  serveStatic(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`\n  TRAX — Real-Time AI Token Price Tracker`);
  console.log(`  ▸ http://localhost:${PORT}\n`);
});
