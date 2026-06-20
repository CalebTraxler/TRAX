'use strict';

/* TRAX dashboard front-end. Talks to /api/data and /api/spot. */

const state = {
  metric: 'blended',
  range: 'all',
  data: null,
  sort: { key: 'blended', dir: 1 },
  search: '',
};

const METRIC_LABEL = { blended: 'Blended', input: 'Input', output: 'Output' };

const $ = (s) => document.querySelector(s);
const fmt = (n, d = 2) => n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n) => n == null ? '—' : '$' + fmt(n, n < 1 ? 3 : 2);
const signed = (n) => (n > 0 ? '+' : '') + fmt(n, 1) + '%';
const cls = (n) => n < -0.05 ? 'down' : n > 0.05 ? 'up' : 'flat';
const posneg = (n) => n < -0.05 ? 'pos' : n > 0.05 ? 'neg' : '';

let indexChart, companyChart, heroSpark;

// ---------------------------------------------------------------- data load
async function load() {
  const res = await fetch(`/api/data?metric=${state.metric}`);
  state.data = await res.json();
  renderAll();
}

function rangeN() { return state.range === 'all' ? null : parseInt(state.range, 10); }
function sliceTail(arr) { const n = rangeN(); return n ? arr.slice(-n) : arr; }

// ---------------------------------------------------------------- hero
function renderHero() {
  const d = state.data, s = d.indexStats;
  $('#metricTag').textContent = METRIC_LABEL[state.metric];
  const stats = [
    { l: 'All-Time', v: signed(s.changeAllTime), c: posneg(s.changeAllTime) },
    { l: '12-Month', v: signed(s.changeYoY), c: posneg(s.changeYoY) },
    { l: 'Range', v: `${fmt(s.low, 1)} – ${fmt(s.high, 1)}`, c: '' },
  ];
  $('#heroStats').innerHTML = stats.map((x) =>
    `<div class="qstat"><span class="ql">${x.l}</span><span class="qv ${x.c}">${x.v}</span></div>`).join('');
  renderHeroSpark();
}

function renderHeroSpark() {
  const arr = state.data.index;
  const ctx = $('#heroSpark').getContext('2d');
  const cfg = {
    type: 'line',
    data: { labels: arr.map((_, i) => i), datasets: [{
      data: arr, borderColor: '#2fd6ac', borderWidth: 1.6, tension: 0.3,
      pointRadius: 0, fill: true,
      backgroundColor: (c) => { const a = c.chart.chartArea; if (!a) return 'transparent';
        const g = c.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
        g.addColorStop(0, 'rgba(47,214,172,.35)'); g.addColorStop(1, 'rgba(47,214,172,0)'); return g; },
    }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } }, animation: false },
  };
  if (heroSpark) { heroSpark.data = cfg.data; heroSpark.update(); } else heroSpark = new Chart(ctx, cfg);
}

// ---------------------------------------------------------------- KPIs (market breadth)
function renderKPIs() {
  const d = state.data;
  const blends = d.modelTable.map((m) => m.blended).sort((a, b) => a - b);
  const median = blends.length % 2 ? blends[(blends.length - 1) / 2]
    : (blends[blends.length / 2 - 1] + blends[blends.length / 2]) / 2;
  const cheap = d.modelTable[0];
  const dear = d.modelTable[d.modelTable.length - 1];
  const cards = [
    { l: 'Constituents', v: d.companies.length, s: `${d.modelTable.length} live models` },
    { l: 'Cheapest Blended', v: money(cheap.blended), s: `${cheap.label} · ${cheap.company}` },
    { l: 'Priciest Blended', v: money(dear.blended), s: `${dear.label} · ${dear.company}` },
    { l: 'Median Blended', v: money(median), s: `${(dear.blended / cheap.blended).toFixed(0)}× cheapest-to-priciest spread` },
  ];
  $('#kpis').innerHTML = cards.map((c) =>
    `<div class="kpi"><div class="kpi-l">${c.l}</div><div class="kpi-v">${c.v}</div><div class="kpi-s">${c.s}</div></div>`).join('');
}

// ---------------------------------------------------------------- charts
function tooltipCfg(fmtVal) {
  return {
    backgroundColor: '#0d1015', borderColor: '#262e3a', borderWidth: 1, padding: 11,
    titleColor: '#e9edf3', bodyColor: '#9aa4b3', usePointStyle: true, cornerRadius: 8,
    titleFont: { family: "'Inter'", weight: '600' }, bodyFont: { family: "'JetBrains Mono'" },
    filter: (item) => item.dataset.label !== 'Base 100',
    callbacks: { label: (c) => `  ${c.dataset.label}: ${c.parsed.y == null ? '—' : fmtVal(c.parsed.y)}` },
  };
}
function baseLineOpts(fmtVal) {
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: tooltipCfg(fmtVal) },
    scales: {
      x: { grid: { color: 'rgba(38,46,58,.4)', drawTicks: false }, border: { display: false },
           ticks: { color: '#616b7a', maxTicksLimit: 9, autoSkip: true, font: { family: "'JetBrains Mono'", size: 10 } } },
      y: { grid: { color: 'rgba(38,46,58,.4)', drawTicks: false }, border: { display: false },
           ticks: { color: '#616b7a', font: { family: "'JetBrains Mono'", size: 10 }, callback: fmtVal } },
    },
  };
}

function renderIndexChart() {
  const months = sliceTail(state.data.months);
  const data = sliceTail(state.data.index);
  const ctx = $('#indexChart').getContext('2d');
  const color = '#2fd6ac';
  const cfg = {
    type: 'line',
    data: { labels: months, datasets: [
      { label: 'TRAX Index', data, borderColor: color, borderWidth: 2.4, tension: 0.25,
        pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: color, pointHoverBorderColor: '#fff', pointHoverBorderWidth: 1.5,
        fill: true, backgroundColor: (c) => { const a = c.chart.chartArea; if (!a) return 'transparent';
          const g = c.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
          g.addColorStop(0, 'rgba(47,214,172,.28)'); g.addColorStop(1, 'rgba(47,214,172,0)'); return g; } },
      { label: 'Base 100', data: months.map(() => 100), borderColor: 'rgba(154,164,179,.35)',
        borderWidth: 1, borderDash: [4, 4], pointRadius: 0, fill: false, tension: 0 },
    ] },
    options: baseLineOpts((v) => fmt(v, 1)),
  };
  if (indexChart) { indexChart.data = cfg.data; indexChart.options = cfg.options; indexChart.update(); }
  else indexChart = new Chart(ctx, cfg);
}

function renderCompanyChart() {
  const ctx = $('#companyChart').getContext('2d');
  const months = sliceTail(state.data.months);
  const datasets = state.data.companies.map((c) => ({
    label: c.name, borderColor: c.color, backgroundColor: c.color,
    data: sliceTail(c.series), borderWidth: 1.7, tension: 0.25,
    pointRadius: 0, pointHoverRadius: 4, spanGaps: true, fill: false,
  }));
  const opts = baseLineOpts((v) => '$' + fmt(v, v < 1 ? 2 : 1));
  opts.scales.y = { ...opts.scales.y, type: 'logarithmic',
    ticks: { color: '#616b7a', font: { family: "'JetBrains Mono'", size: 10 }, callback: (v) => '$' + v } };
  opts.plugins.legend = { display: true, position: 'bottom',
    labels: { color: '#9aa4b3', boxWidth: 9, boxHeight: 9, usePointStyle: true, pointStyle: 'rectRounded', padding: 12, font: { family: "'Inter'", size: 11 } } };
  opts.plugins.tooltip = tooltipCfg((v) => '$' + fmt(v, v < 1 ? 3 : 2) + ' /Mtok');
  const cfg = { type: 'line', data: { labels: months, datasets }, options: opts };
  if (companyChart) { companyChart.data = cfg.data; companyChart.options = cfg.options; companyChart.update(); }
  else companyChart = new Chart(ctx, cfg);
}

// ---------------------------------------------------------------- provider list
function renderCompanyList() {
  const rows = [...state.data.companies].sort((a, b) => (b.current || 0) - (a.current || 0));
  $('#companyList').innerHTML = rows.map((c) => `
    <div class="crow">
      <span class="cdot" style="background:${c.color}"></span>
      <div><div class="cname">${c.name}</div><div class="cmeta">${c.models} models · ${(c.weight*100).toFixed(0)}% weight</div></div>
      <div class="cprice">${money(c.current)} <small>/Mtok</small></div>
      <div class="cchg ${cls(c.allTimeChange)}">${signed(c.allTimeChange)}</div>
    </div>`).join('');
}

// ---------------------------------------------------------------- table
function renderTable() {
  const { key, dir } = state.sort;
  let rows = state.data.modelTable.filter((m) =>
    !state.search || (m.label + ' ' + m.company).toLowerCase().includes(state.search));
  rows.sort((a, b) => {
    let x = a[key], y = b[key];
    if (typeof x === 'string') return x.localeCompare(y) * dir;
    return (x - y) * dir;
  });
  $('#modelBody').innerHTML = rows.map((m) => `
    <tr>
      <td class="m-name">${m.label}<span class="tier">${m.tier}</span></td>
      <td><span class="pill"><span class="cdot" style="background:${m.color}"></span>${m.company}</span></td>
      <td class="num">${money(m.input)}</td>
      <td class="num">${money(m.output)}</td>
      <td class="num">${money(m.blended)}</td>
      <td class="num chg-cell ${cls(m.changeSinceLaunch)}">${m.changeSinceLaunch === 0 ? '—' : signed(m.changeSinceLaunch)}</td>
      <td class="num" style="color:var(--text-faint)">${m.launched}</td>
    </tr>`).join('');
}

// ---------------------------------------------------------------- ticker
function renderTicker() {
  const items = state.data.companies.map((c) =>
    `<span class="tk"><span class="dot" style="background:${c.color}"></span><b>${c.name}</b>
      <span class="px">${money(c.current)}</span>
      <span class="chg ${c.allTimeChange < 0 ? 'dn' : 'up'}">${signed(c.allTimeChange)}</span></span>`);
  $('#ticker').innerHTML = items.concat(items).join('');
}

// ---------------------------------------------------------------- meta
function renderMeta() {
  $('#methodology').textContent = state.data.meta.methodology;
  $('#asOf').textContent = state.data.meta.asOf;
  const labels = { blended: 'Blended token cost', input: 'Input token cost', output: 'Output token cost' };
  $('#indexSubtitle').textContent = `${labels[state.metric]} across all providers · indexed to 100`;
}

function renderAll() {
  renderHero(); renderKPIs(); renderIndexChart(); renderCompanyChart();
  renderCompanyList(); renderTable(); renderTicker(); renderMeta();
}

// ---------------------------------------------------------------- live spot
let lastSpot = null;
async function pollSpot() {
  try {
    const s = await (await fetch(`/api/spot?metric=${state.metric}`)).json();
    lastSpot = s.level;
    const dirClass = s.drift < 0 ? 'down' : s.drift > 0 ? 'up' : 'flat';
    const colorVar = s.drift < 0 ? 'var(--pos)' : s.drift > 0 ? 'var(--neg)' : 'var(--text-dim)';
    const arrow = s.drift < 0 ? '▼' : s.drift > 0 ? '▲' : '·';

    $('#spotValue').textContent = fmt(s.level, 2);
    const fromBase = s.level - 100;
    const sc = $('#spotChange');
    sc.textContent = `${arrow} ${signed(s.drift)}  ·  ${fromBase >= 0 ? '+' : ''}${fmt(fromBase, 1)} vs base`;
    sc.style.color = colorVar;
    $('#spotMeta').textContent = `real ${fmt(s.real, 2)} · live drift · base 100 = March 2023`;

    $('#navValue').textContent = fmt(s.level, 2);
    const nc = $('#navChange');
    nc.textContent = `${arrow} ${signed(s.drift)}`;
    nc.style.color = colorVar;
  } catch (_) {}
}

// ---------------------------------------------------------------- events
$('#metricSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  state.metric = b.dataset.metric;
  [...e.currentTarget.children].forEach((c) => c.classList.toggle('active', c === b));
  load();
});
$('#rangeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  state.range = b.dataset.range;
  [...e.currentTarget.children].forEach((c) => c.classList.toggle('active', c === b));
  renderIndexChart(); renderCompanyChart();
});
$('#modelSearch').addEventListener('input', (e) => { state.search = e.target.value.toLowerCase(); renderTable(); });
document.querySelectorAll('.model-table th').forEach((th) => th.addEventListener('click', () => {
  const k = th.dataset.sort;
  state.sort.dir = state.sort.key === k ? -state.sort.dir : 1;
  state.sort.key = k;
  renderTable();
}));

// nav scroll-spy
const sections = ['overview', 'providers', 'models', 'about'];
const navLinks = [...document.querySelectorAll('.nav-links a')];
const spy = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) {
      const id = en.target.id;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

// ---------------------------------------------------------------- boot
load().then(() => { pollSpot(); setInterval(pollSpot, 2000); });
