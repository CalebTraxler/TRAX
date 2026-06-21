'use strict';

/**
 * TRAX — Real-Time AI Token Price Tracker
 * -------------------------------------------------------------
 * Core dataset + index computation.
 *
 * DATA: Per-million-token list prices (USD) for major AI providers,
 * sourced from public pricing announcements. Each model carries a
 * timeline of effective-dated price points so we can reconstruct how
 * inference cost has moved over time. Prices are curated/approximate
 * and trivially editable below.
 *
 * ALGORITHM (the "TRAX Index"):
 *   blended(model, t)   = 0.75*input + 0.25*output      (typical usage mix)
 *   price(company, t)   = Σ w_model * blended / Σ w_model   (active models only)
 *   TRAX(t)             = 100 * V(t) / V(base)
 *       where V(t)      = Σ w_company * price(company,t) / Σ w_company
 *
 * A model/company is "active" from its first price point onward; its
 * most-recent price point as of month t is used (step function), which
 * is exactly how list pricing behaves in reality.
 *
 * The index is a COST index: lower = cheaper tokens. Its decline tells
 * the real story of the last few years — inference cost has collapsed.
 */

// ----------------------------------------------------------------------------
// DATA — loaded from data/pricing.json: curated historical price points plus
// live prices pulled from OpenRouter by scripts/refresh.js. Re-read on each
// build so a refresh takes effect without restarting the server.
// ----------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");
const DATA_FILE = path.join(__dirname, "..", "data", "pricing.json");

let COMPANIES = {};
let MODELS = [];
let META = {};
function loadData() {
  const d = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  COMPANIES = d.companies;
  MODELS = d.models;
  META = d.meta || {};
}
loadData();

// Tier weights inside a company basket.
const W = { flagship: 1.0, mid: 0.7, small: 0.4 };

// ----------------------------------------------------------------------------
// Time helpers
// ----------------------------------------------------------------------------
const BASE_MONTH = '2023-03';

function monthsBetween(start, end) {
  const out = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Most-recent price point for a model as of month `ym` (step function).
function priceAsOf(model, ym) {
  let chosen = null;
  for (const pt of model.prices) {
    if (pt.date.slice(0, 7) <= ym) chosen = pt;
    else break;
  }
  return chosen; // null => model not yet launched
}

const blended = (pt) => 0.75 * pt.input + 0.25 * pt.output;

// ----------------------------------------------------------------------------
// Core series builders
// ----------------------------------------------------------------------------

// metric: 'blended' | 'input' | 'output'
function metricValue(pt, metric) {
  if (metric === 'input') return pt.input;
  if (metric === 'output') return pt.output;
  return blended(pt);
}

// Weighted basket price for one company at month ym (or null if no active models).
function companyPriceAt(companyId, ym, metric) {
  let num = 0, den = 0;
  for (const model of MODELS) {
    if (model.company !== companyId) continue;
    const pt = priceAsOf(model, ym);
    if (!pt) continue;
    const w = W[model.tier];
    num += w * metricValue(pt, metric);
    den += w;
  }
  return den === 0 ? null : num / den;
}

// Raw index level V(t) across active companies.
function indexLevelAt(ym, metric) {
  let num = 0, den = 0;
  for (const id of Object.keys(COMPANIES)) {
    const cp = companyPriceAt(id, ym, metric);
    if (cp == null) continue;
    const w = COMPANIES[id].weight;
    num += w * cp;
    den += w;
  }
  return den === 0 ? null : num / den;
}

// ----------------------------------------------------------------------------
// OHLC candles — derived from the index's intramonth REPRICING EVENTS.
// We evaluate the index at the exact date of every provider price change, so
// each monthly candle's open/high/low/close and "volume" (number of repricing
// events) are real quantities, not synthetic noise.
// ----------------------------------------------------------------------------

// Full-date variant of priceAsOf (YYYY-MM-DD lexicographic compare).
function priceAsOfDate(model, date) {
  let chosen = null;
  for (const pt of model.prices) {
    if (pt.date <= date) chosen = pt; else break;
  }
  return chosen;
}
function companyRawAtDate(companyId, date, metric) {
  let num = 0, den = 0;
  for (const m of MODELS) {
    if (m.company !== companyId) continue;
    const pt = priceAsOfDate(m, date);
    if (!pt) continue;
    const w = W[m.tier];
    num += w * metricValue(pt, metric); den += w;
  }
  return den === 0 ? null : num / den;
}
function indexRawAtDate(date, metric) {
  let num = 0, den = 0;
  for (const id of Object.keys(COMPANIES)) {
    const cp = companyRawAtDate(id, date, metric);
    if (cp == null) continue;
    num += COMPANIES[id].weight * cp; den += COMPANIES[id].weight;
  }
  return den === 0 ? null : num / den;
}
const eom = (ym) => `${ym}-31`; // end-of-month sentinel for lexicographic compare

function buildOHLC(months, levelFn, eventDates, norm) {
  const out = [];
  let prev = null;
  for (const ym of months) {
    const close = levelFn(eom(ym));
    if (close == null) { out.push(null); continue; }
    // First active candle has no prior close and an incomplete constituent set
    // mid-month (normalization base artifact) — emit it flat.
    if (prev == null) {
      out.push({ t: ym, o: +(close * norm).toFixed(4), h: +(close * norm).toFixed(4),
        l: +(close * norm).toFixed(4), c: +(close * norm).toFixed(4), v: 0 });
      prev = close; continue;
    }
    const open = prev;
    const inMonth = eventDates.filter((d) => d.slice(0, 7) === ym);
    const samples = [open, close, ...inMonth.map((d) => levelFn(d)).filter((v) => v != null)];
    out.push({
      t: ym,
      o: +(open * norm).toFixed(4),
      h: +(Math.max(...samples) * norm).toFixed(4),
      l: +(Math.min(...samples) * norm).toFixed(4),
      c: +(close * norm).toFixed(4),
      v: inMonth.length,
    });
    prev = close;
  }
  return out;
}

function buildCandles(metric = 'blended') {
  const months = monthsBetween(BASE_MONTH, currentMonth());
  const baseVal = months.map((ym) => indexRawAtDate(eom(ym), metric)).find((v) => v != null) || 1;
  const allDates = [...new Set(MODELS.flatMap((m) => m.prices.map((p) => p.date)))].sort();
  const index = buildOHLC(months, (d) => indexRawAtDate(d, metric), allDates, 100 / baseVal);
  const companies = {};
  for (const id of Object.keys(COMPANIES)) {
    const dates = [...new Set(MODELS.filter((m) => m.company === id).flatMap((m) => m.prices.map((p) => p.date)))].sort();
    companies[id] = buildOHLC(months, (d) => companyRawAtDate(id, d, metric), dates, 1);
  }
  return { index, companies };
}

function buildPayload(metric = 'blended') {
  loadData(); // pick up any live refresh written to disk
  const months = monthsBetween(BASE_MONTH, currentMonth());

  // Raw index levels, then normalize to base = 100.
  const rawIndex = months.map((ym) => indexLevelAt(ym, metric));
  const baseVal = rawIndex.find((v) => v != null) || 1;
  const index = rawIndex.map((v) => (v == null ? null : +(100 * v / baseVal).toFixed(2)));

  // Per-company basket series (raw $/Mtok).
  const companies = Object.keys(COMPANIES).map((id) => {
    const series = months.map((ym) => {
      const v = companyPriceAt(id, ym, metric);
      return v == null ? null : +v.toFixed(3);
    });
    const present = series.filter((v) => v != null);
    const current = present.length ? present[present.length - 1] : null;
    const first = present.length ? present[0] : null;
    const allTimeChange = first ? +(((current - first) / first) * 100).toFixed(1) : 0;
    return {
      id, name: COMPANIES[id].name, color: COMPANIES[id].color,
      weight: COMPANIES[id].weight, series, current, first, allTimeChange,
      models: MODELS.filter((m) => m.company === id).length,
    };
  });

  // Current model snapshot table.
  const nowMonth = months[months.length - 1];
  const modelTable = MODELS.map((m) => {
    const pt = priceAsOf(m, nowMonth);
    if (!pt) return null;
    const firstPt = m.prices[0];
    const launchBlend = blended(firstPt);
    const nowBlend = blended(pt);
    return {
      id: m.id, label: m.label, company: COMPANIES[m.company].name,
      companyId: m.company, color: COMPANIES[m.company].color, tier: m.tier,
      input: pt.input, output: pt.output, blended: +nowBlend.toFixed(3),
      launched: firstPt.date,
      changeSinceLaunch: +(((nowBlend - launchBlend) / launchBlend) * 100).toFixed(1),
    };
  }).filter(Boolean).sort((a, b) => a.blended - b.blended);

  // Index headline stats.
  const lastIdx = index[index.length - 1];
  const firstIdx = index.find((v) => v != null);
  const idx12 = index.length > 12 ? index[index.length - 13] : firstIdx;
  return {
    meta: {
      base: BASE_MONTH, asOf: nowMonth, metric,
      generated: new Date().toISOString(),
      methodology: 'TRAX = 100 × V(t)/V(base); V = company-weighted mean of tier-weighted blended (0.75·in + 0.25·out) $/Mtok. Lower = cheaper.',
      lastRefresh: META.lastRefresh || null,
      source: META.source || null,
    },
    months,
    index,
    indexStats: {
      level: lastIdx,
      changeYoY: idx12 ? +(((lastIdx - idx12) / idx12) * 100).toFixed(1) : 0,
      changeAllTime: firstIdx ? +(((lastIdx - firstIdx) / firstIdx) * 100).toFixed(1) : 0,
      high: Math.max(...index.filter((v) => v != null)),
      low: Math.min(...index.filter((v) => v != null)),
    },
    companies,
    modelTable,
    candles: buildCandles(metric),
    weights: { usageMix: '0.75 input / 0.25 output', tiers: W, companies: COMPANIES },
  };
}

// Live "spot": real latest index level plus small simulated microstructure noise.
// Clearly labeled in the UI as a demo of intraday movement around the real spot.
let _walk = 0;
function spot(metric = 'blended') {
  loadData();
  const months = monthsBetween(BASE_MONTH, currentMonth());
  const raw = months.map((ym) => indexLevelAt(ym, metric));
  const baseVal = raw.find((v) => v != null) || 1;
  const level = 100 * raw[raw.length - 1] / baseVal;
  // Bounded random walk: ±0.25% band.
  _walk += (Math.random() - 0.5) * 0.0006;
  _walk = Math.max(-0.0025, Math.min(0.0025, _walk));
  const tick = level * (1 + _walk);
  return {
    metric,
    level: +tick.toFixed(3),
    real: +level.toFixed(3),
    drift: +(_walk * 100).toFixed(3),
    ts: Date.now(),
  };
}

module.exports = { buildPayload, buildCandles, spot, COMPANIES, MODELS };
