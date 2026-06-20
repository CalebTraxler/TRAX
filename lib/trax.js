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
// Provider metadata: index weight (≈ usage prominence) + brand color.
// ----------------------------------------------------------------------------
const COMPANIES = {
  openai:   { name: 'OpenAI',    weight: 0.30, color: '#10a37f' },
  anthropic:{ name: 'Anthropic', weight: 0.22, color: '#d97757' },
  google:   { name: 'Google',    weight: 0.20, color: '#4285f4' },
  meta:     { name: 'Meta',      weight: 0.08, color: '#0866ff' },
  mistral:  { name: 'Mistral',   weight: 0.05, color: '#ff7000' },
  xai:      { name: 'xAI',       weight: 0.05, color: '#9ca3af' },
  deepseek: { name: 'DeepSeek',  weight: 0.05, color: '#7c3aed' },
  cohere:   { name: 'Cohere',    weight: 0.05, color: '#39c5bb' },
};

// Tier weights inside a company's basket.
const W = { flagship: 1.0, mid: 0.7, small: 0.4 };

// ----------------------------------------------------------------------------
// MODELS — each with an effective-dated price timeline.
// p(date, input$/Mtok, output$/Mtok)
// ----------------------------------------------------------------------------
const p = (date, input, output) => ({ date, input, output });

const MODELS = [
  // ----------------------------- OpenAI -----------------------------
  { id: 'gpt-3.5-turbo', company: 'openai', label: 'GPT-3.5 Turbo', tier: 'small',
    prices: [p('2023-03-01', 1.5, 2.0), p('2023-11-06', 1.0, 2.0), p('2024-01-25', 0.5, 1.5)] },
  { id: 'gpt-4', company: 'openai', label: 'GPT-4 (8k)', tier: 'flagship',
    prices: [p('2023-03-14', 30, 60)] },
  { id: 'gpt-4-turbo', company: 'openai', label: 'GPT-4 Turbo', tier: 'flagship',
    prices: [p('2023-11-06', 10, 30)] },
  { id: 'gpt-4o', company: 'openai', label: 'GPT-4o', tier: 'flagship',
    prices: [p('2024-05-13', 5, 15), p('2024-08-06', 2.5, 10)] },
  { id: 'gpt-4o-mini', company: 'openai', label: 'GPT-4o mini', tier: 'small',
    prices: [p('2024-07-18', 0.15, 0.6)] },
  { id: 'o1', company: 'openai', label: 'o1', tier: 'flagship',
    prices: [p('2024-12-05', 15, 60)] },
  { id: 'o3-mini', company: 'openai', label: 'o3-mini', tier: 'mid',
    prices: [p('2025-01-31', 1.1, 4.4)] },
  { id: 'gpt-4.1', company: 'openai', label: 'GPT-4.1', tier: 'flagship',
    prices: [p('2025-04-14', 2.0, 8.0)] },
  { id: 'gpt-4.1-mini', company: 'openai', label: 'GPT-4.1 mini', tier: 'small',
    prices: [p('2025-04-14', 0.4, 1.6)] },

  // ---------------------------- Anthropic ---------------------------
  { id: 'claude-2', company: 'anthropic', label: 'Claude 2', tier: 'flagship',
    prices: [p('2023-07-11', 8, 24)] },
  { id: 'claude-instant', company: 'anthropic', label: 'Claude Instant', tier: 'small',
    prices: [p('2023-07-11', 0.8, 2.4)] },
  { id: 'claude-3-opus', company: 'anthropic', label: 'Claude 3 Opus', tier: 'flagship',
    prices: [p('2024-03-04', 15, 75)] },
  { id: 'claude-3-sonnet', company: 'anthropic', label: 'Claude 3 Sonnet', tier: 'mid',
    prices: [p('2024-03-04', 3, 15)] },
  { id: 'claude-3-haiku', company: 'anthropic', label: 'Claude 3 Haiku', tier: 'small',
    prices: [p('2024-03-04', 0.25, 1.25)] },
  { id: 'claude-3-5-sonnet', company: 'anthropic', label: 'Claude 3.5 Sonnet', tier: 'flagship',
    prices: [p('2024-06-20', 3, 15)] },
  { id: 'claude-3-5-haiku', company: 'anthropic', label: 'Claude 3.5 Haiku', tier: 'small',
    prices: [p('2024-11-04', 0.8, 4)] },
  { id: 'claude-3-7-sonnet', company: 'anthropic', label: 'Claude 3.7 Sonnet', tier: 'flagship',
    prices: [p('2025-02-24', 3, 15)] },
  { id: 'claude-opus-4', company: 'anthropic', label: 'Claude Opus 4', tier: 'flagship',
    prices: [p('2025-05-22', 15, 75)] },
  { id: 'claude-sonnet-4', company: 'anthropic', label: 'Claude Sonnet 4', tier: 'mid',
    prices: [p('2025-05-22', 3, 15)] },

  // ----------------------------- Google -----------------------------
  { id: 'gemini-1.0-pro', company: 'google', label: 'Gemini 1.0 Pro', tier: 'flagship',
    prices: [p('2023-12-13', 0.5, 1.5)] },
  { id: 'gemini-1.5-pro', company: 'google', label: 'Gemini 1.5 Pro', tier: 'flagship',
    prices: [p('2024-05-14', 3.5, 10.5), p('2024-10-01', 1.25, 5)] },
  { id: 'gemini-1.5-flash', company: 'google', label: 'Gemini 1.5 Flash', tier: 'small',
    prices: [p('2024-05-14', 0.075, 0.3)] },
  { id: 'gemini-2.0-flash', company: 'google', label: 'Gemini 2.0 Flash', tier: 'mid',
    prices: [p('2025-02-05', 0.1, 0.4)] },
  { id: 'gemini-2.5-pro', company: 'google', label: 'Gemini 2.5 Pro', tier: 'flagship',
    prices: [p('2025-03-25', 1.25, 10)] },
  { id: 'gemini-2.5-flash', company: 'google', label: 'Gemini 2.5 Flash', tier: 'small',
    prices: [p('2025-04-17', 0.3, 2.5)] },

  // ------------------------------ Meta ------------------------------
  // Representative API-host pricing (Meta does not sell tokens directly).
  { id: 'llama-2-70b', company: 'meta', label: 'Llama 2 70B', tier: 'flagship',
    prices: [p('2023-07-18', 1.0, 1.0)] },
  { id: 'llama-3-70b', company: 'meta', label: 'Llama 3 70B', tier: 'flagship',
    prices: [p('2024-04-18', 0.9, 0.9)] },
  { id: 'llama-3-8b', company: 'meta', label: 'Llama 3 8B', tier: 'small',
    prices: [p('2024-04-18', 0.2, 0.2)] },
  { id: 'llama-3.1-405b', company: 'meta', label: 'Llama 3.1 405B', tier: 'flagship',
    prices: [p('2024-07-23', 3.0, 3.0)] },
  { id: 'llama-3.1-70b', company: 'meta', label: 'Llama 3.1 70B', tier: 'mid',
    prices: [p('2024-07-23', 0.9, 0.9)] },
  { id: 'llama-3.3-70b', company: 'meta', label: 'Llama 3.3 70B', tier: 'mid',
    prices: [p('2024-12-06', 0.6, 0.6)] },

  // ----------------------------- Mistral ----------------------------
  { id: 'mistral-7b', company: 'mistral', label: 'Mistral 7B', tier: 'small',
    prices: [p('2023-09-27', 0.25, 0.25)] },
  { id: 'mixtral-8x7b', company: 'mistral', label: 'Mixtral 8x7B', tier: 'mid',
    prices: [p('2023-12-11', 0.7, 0.7)] },
  { id: 'mistral-large', company: 'mistral', label: 'Mistral Large', tier: 'flagship',
    prices: [p('2024-02-26', 8, 24), p('2024-07-24', 3, 9), p('2024-11-18', 2, 6)] },
  { id: 'mistral-small', company: 'mistral', label: 'Mistral Small', tier: 'small',
    prices: [p('2024-02-26', 2, 6), p('2024-09-17', 1, 3), p('2025-03-17', 0.1, 0.3)] },

  // ------------------------------- xAI ------------------------------
  { id: 'grok-beta', company: 'xai', label: 'Grok Beta', tier: 'flagship',
    prices: [p('2024-11-01', 5, 15)] },
  { id: 'grok-2', company: 'xai', label: 'Grok 2', tier: 'flagship',
    prices: [p('2024-12-12', 2, 10)] },
  { id: 'grok-3', company: 'xai', label: 'Grok 3', tier: 'flagship',
    prices: [p('2025-04-09', 3, 15)] },

  // ---------------------------- DeepSeek ----------------------------
  { id: 'deepseek-v2', company: 'deepseek', label: 'DeepSeek-V2', tier: 'flagship',
    prices: [p('2024-05-06', 0.14, 0.28)] },
  { id: 'deepseek-v2.5', company: 'deepseek', label: 'DeepSeek-V2.5', tier: 'flagship',
    prices: [p('2024-09-05', 0.14, 0.28)] },
  { id: 'deepseek-v3', company: 'deepseek', label: 'DeepSeek-V3', tier: 'flagship',
    prices: [p('2024-12-26', 0.27, 1.1)] },
  { id: 'deepseek-r1', company: 'deepseek', label: 'DeepSeek-R1', tier: 'flagship',
    prices: [p('2025-01-20', 0.55, 2.19)] },

  // ----------------------------- Cohere -----------------------------
  { id: 'command', company: 'cohere', label: 'Command', tier: 'flagship',
    prices: [p('2023-09-01', 1.0, 2.0)] },
  { id: 'command-r', company: 'cohere', label: 'Command R', tier: 'mid',
    prices: [p('2024-03-11', 0.5, 1.5), p('2024-08-30', 0.15, 0.6)] },
  { id: 'command-r-plus', company: 'cohere', label: 'Command R+', tier: 'flagship',
    prices: [p('2024-04-04', 3, 15), p('2024-08-30', 2.5, 10)] },
];

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
