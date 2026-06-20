'use strict';

/* TRAX dashboard front-end. Talks to /api/data and /api/spot. */

const state = {
  metric: 'blended',
  range: 'all',
  data: null,
  sort: { key: 'blended', dir: 1 },
  search: '',
};

const $ = (s) => document.querySelector(s);
const fmt = (n, d = 2) => n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n) => n == null ? '—' : '$' + fmt(n, n < 1 ? 3 : 2);
const signed = (n) => (n > 0 ? '+' : '') + fmt(n, 1) + '%';
const cls = (n) => n < -0.05 ? 'down' : n > 0.05 ? 'up' : 'flat';

let indexChart, companyChart;

// ---------------------------------------------------------------- data load
async function load() {
  const res = await fetch(`/api/data?metric=${state.metric}`);
  state.data = await res.json();
  renderAll();
}

function rangeSlice(arr) {
  if (state.range === 'all') return { arr, months: state.data.months };
  const n = parseInt(state.range, 10);
  return { arr: arr.slice(-n), months: state.data.months.slice(-n) };
}

// ---------------------------------------------------------------- KPIs
function renderKPIs() {
  const d = state.data;
  const s = d.indexStats;
  const cheapest = d.modelTable[0];
  const flagshipDrop = d.companies.reduce((acc, c) => Math.min(acc, c.allTimeChange), 0);
  const cards = [
    { label: 'TRAX Index', value: fmt(s.level, 1), sub: `<span class="${cls(s.changeAllTime)}">${signed(s.changeAllTime)}</span> since Mar 2023` },
    { label: '12-Month Change', value: signed(s.changeYoY), sub: `range ${fmt(s.low,1)}–${fmt(s.high,1)}`, raw: s.changeYoY },
    { label: 'Providers Tracked', value: d.companies.length, sub: `${d.modelTable.length} live models` },
    { label: 'Cheapest Blended', value: money(cheapest.blended), sub: `${cheapest.label} · ${cheapest.company}` },
  ];
  $('#kpis').innerHTML = cards.map((c) => {
    let val = c.value;
    if (c.raw != null) val = `<span class="${cls(c.raw)}">${c.value}</span>`;
    return `<div class="kpi"><div class="k-label">${c.label}</div>
      <div class="k-value">${val}</div><div class="k-sub">${c.sub}</div></div>`;
  }).join('');
}

// ---------------------------------------------------------------- index chart
function gradient(ctx, area, color) {
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, color + '55');
  g.addColorStop(1, color + '00');
  return g;
}

function renderIndexChart() {
  const { arr, months } = rangeSlice(state.data.index);
  const ctx = $('#indexChart').getContext('2d');
  const color = '#2dd4bf';
  const cfg = {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'TRAX Index', data: arr, borderColor: color, borderWidth: 2.5,
        tension: 0.25, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: color,
        fill: true,
        backgroundColor: (c) => { const a = c.chart.chartArea; return a ? gradient(c.chart.ctx, a, color) : color + '22'; },
      }],
    },
    options: baseLineOpts((v) => fmt(v, 1)),
  };
  if (indexChart) { indexChart.data = cfg.data; indexChart.options = cfg.options; indexChart.update(); }
  else indexChart = new Chart(ctx, cfg);
}

function renderCompanyChart() {
  const ctx = $('#companyChart').getContext('2d');
  const months = state.range === 'all' ? state.data.months : state.data.months.slice(-parseInt(state.range, 10));
  const datasets = state.data.companies.map((c) => ({
    label: c.name, borderColor: c.color, backgroundColor: c.color,
    data: state.range === 'all' ? c.series : c.series.slice(-parseInt(state.range, 10)),
    borderWidth: 1.8, tension: 0.25, pointRadius: 0, pointHoverRadius: 4, spanGaps: true, fill: false,
  }));
  const cfg = {
    type: 'line',
    data: { labels: months, datasets },
    options: {
      ...baseLineOpts((v) => '$' + fmt(v, v < 1 ? 2 : 1)),
      scales: {
        ...baseLineOpts(() => '').scales,
        y: { ...baseLineOpts(() => '').scales.y, type: 'logarithmic',
             ticks: { color: '#5d6880', callback: (v) => '$' + v } },
      },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: '#8a96ad', boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', font: { size: 11 } } },
        tooltip: tooltipCfg((v) => '$' + fmt(v, v < 1 ? 3 : 2) + ' /Mtok'),
      },
    },
  };
  if (companyChart) { companyChart.data = cfg.data; companyChart.options = cfg.options; companyChart.update(); }
  else companyChart = new Chart(ctx, cfg);
}

function tooltipCfg(fmtVal) {
  return {
    backgroundColor: '#0c1018', borderColor: '#283246', borderWidth: 1, padding: 12,
    titleColor: '#e6ebf4', bodyColor: '#8a96ad', usePointStyle: true,
    callbacks: { label: (c) => `  ${c.dataset.label}: ${c.parsed.y == null ? '—' : fmtVal(c.parsed.y)}` },
  };
}

function baseLineOpts(fmtVal) {
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: tooltipCfg(fmtVal),
    },
    scales: {
      x: { grid: { color: 'rgba(40,50,70,.35)' }, ticks: { color: '#5d6880', maxTicksLimit: 10, autoSkip: true } },
      y: { grid: { color: 'rgba(40,50,70,.35)' }, ticks: { color: '#5d6880', callback: fmtVal } },
    },
  };
}

// ---------------------------------------------------------------- company list
function renderCompanyList() {
  const rows = [...state.data.companies].sort((a, b) => (b.current || 0) - (a.current || 0));
  $('#companyList').innerHTML = rows.map((c) => `
    <div class="crow">
      <span class="cdot" style="background:${c.color}"></span>
      <div><div class="cname">${c.name}</div><div class="cmeta">${c.models} models · ${(c.weight*100).toFixed(0)}% weight</div></div>
      <div class="cprice">${money(c.current)}<br><small>/Mtok</small></div>
      <div class="cchg ${cls(c.allTimeChange)}">${signed(c.allTimeChange)}</div>
    </div>`).join('');
}

// ---------------------------------------------------------------- model table
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
      <td class="num" style="color:var(--muted)">${m.launched}</td>
    </tr>`).join('');
}

// ---------------------------------------------------------------- ticker
function renderTicker() {
  const items = [...state.data.companies]
    .map((c) => `<span class="tk"><span class="dot" style="background:${c.color}"></span><b>${c.name}</b>
      <span class="px">${money(c.current)}</span>
      <span class="chg ${c.allTimeChange < 0 ? 'dn' : 'up'}">${signed(c.allTimeChange)}</span></span>`);
  // duplicate for seamless loop
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
  renderKPIs(); renderIndexChart(); renderCompanyChart();
  renderCompanyList(); renderTable(); renderTicker(); renderMeta();
}

// ---------------------------------------------------------------- live spot
let lastSpot = null;
async function pollSpot() {
  try {
    const s = await (await fetch(`/api/spot?metric=${state.metric}`)).json();
    const chg = lastSpot == null ? 0 : ((s.level - lastSpot) / lastSpot) * 100;
    lastSpot = s.level;
    $('#spotValue').textContent = fmt(s.level, 2);
    const fromBase = s.level - 100;
    const el = $('#spotChange');
    el.textContent = `${signed(s.drift)} · ${fromBase >= 0 ? '+' : ''}${fmt(fromBase,1)} vs base`;
    el.className = 'spot-change ' + (s.drift < 0 ? 'down' : 'up');
    el.style.color = s.drift < 0 ? 'var(--down)' : 'var(--up)';
    $('#spotMeta').textContent = `real ${fmt(s.real,2)} · live drift · base 100 = Mar 2023`;
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

// ---------------------------------------------------------------- boot
load().then(() => { pollSpot(); setInterval(pollSpot, 2000); });
