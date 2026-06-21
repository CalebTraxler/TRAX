'use strict';

/**
 * TRAX server — zero dependencies (Node built-ins only).
 * Serves the dashboard + a small JSON API.
 *
 *   GET /                -> dashboard
 *   GET /api/data        -> full payload (?metric=blended|input|output)
 *   GET /api/spot        -> live spot tick (?metric=...)
 *   GET /api/refresh     -> pull live prices from OpenRouter, return summary
 *
 * Run:  node server.js   (then open http://localhost:4317)
 * Auto-refresh runs on startup and every REFRESH_HOURS hours unless
 * TRAX_NO_REFRESH=1 is set.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildPayload, spot } = require('./lib/trax');
const { refresh } = require('./scripts/refresh');

const PORT = process.env.PORT || 4317;
const REFRESH_HOURS = +(process.env.REFRESH_HOURS || 6);
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const metric = url.searchParams.get('metric') || 'blended';

  try {
    if (url.pathname === '/api/data') return sendJSON(res, buildPayload(metric));
    if (url.pathname === '/api/spot') return sendJSON(res, spot(metric));
    if (url.pathname === '/api/refresh') return sendJSON(res, await refresh());
  } catch (e) {
    return sendJSON(res, { error: String(e && e.message || e) }, 500);
  }
  serveStatic(res, url.pathname);
});

// Background auto-refresh: best-effort, never blocks serving, never crashes.
function autoRefresh() {
  refresh()
    .then((r) => console.log(`  refresh: ${r.ok ? `${r.changed} change(s), ${r.matched}/${r.checked} matched` : 'skipped — ' + r.error}`))
    .catch((e) => console.log('  refresh error:', e.message));
}

server.listen(PORT, () => {
  console.log(`\n  TRAX — Real-Time AI Token Price Tracker`);
  console.log(`  ▸ http://localhost:${PORT}\n`);
  if (process.env.TRAX_NO_REFRESH !== '1') {
    autoRefresh();
    setInterval(autoRefresh, Math.max(1, REFRESH_HOURS) * 3600 * 1000);
  }
});
