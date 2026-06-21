'use strict';

/**
 * TRAX live price refresh.
 * Pulls current per-token prices from the public OpenRouter models API and
 * updates data/pricing.json: for every model with an `or` slug, if the live
 * blended price differs from the latest stored point, append a point dated
 * today (or update today's point). Curated history is never overwritten.
 *
 *   node scripts/refresh.js        # one-shot
 *   require('./scripts/refresh').refresh()   # programmatic (server uses this)
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'pricing.json');
const API = 'https://openrouter.ai/api/v1/models';

const round = (n) => +n.toFixed(4);

async function refresh() {
  let data;
  try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (e) { return { ok: false, error: 'cannot read pricing.json: ' + e.message }; }

  let res;
  try { res = await fetch(API, { headers: { Accept: 'application/json' } }); }
  catch (e) { return { ok: false, error: 'network: ' + e.message }; }
  if (!res.ok) return { ok: false, error: 'HTTP ' + res.status };

  const body = await res.json();
  const live = new Map((body.data || []).map((m) => [m.id, m.pricing]));
  const today = new Date().toISOString().slice(0, 10);

  let checked = 0, matched = 0;
  const changes = [];
  for (const m of data.models) {
    if (!m.or) continue;
    checked++;
    const pr = live.get(m.or);
    if (!pr) continue;
    matched++;
    const input = round(parseFloat(pr.prompt) * 1e6);
    const output = round(parseFloat(pr.completion) * 1e6);
    if (!(input > 0) || !(output > 0)) continue; // skip free / unpriced

    const last = m.prices[m.prices.length - 1];
    const eps = 1e-3;
    if (Math.abs(last.input - input) > eps || Math.abs(last.output - output) > eps) {
      const from = `$${last.input}/$${last.output}`;
      if (last.date === today) { last.input = input; last.output = output; }
      else m.prices.push({ date: today, input, output });
      changes.push(`${m.id} (${m.or}): ${from} -> $${input}/$${output}`);
    }
  }

  data.meta.lastRefresh = new Date().toISOString();
  data.meta.source = API;
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  return { ok: true, checked, matched, changed: changes.length, changes, ts: data.meta.lastRefresh };
}

module.exports = { refresh };

if (require.main === module) {
  refresh().then((r) => {
    if (!r.ok) { console.error('refresh failed:', r.error); process.exit(1); }
    console.log(`refresh ok — ${r.matched}/${r.checked} slugs matched, ${r.changed} price change(s)`);
    r.changes.forEach((c) => console.log('  · ' + c));
    process.exit(0);
  });
}
