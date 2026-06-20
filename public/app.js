'use strict';

/* TRAX terminal front-end. View-only analytics — no trading. */

const state = {
  metric: 'blended',
  range: 'all',
  selected: 'TRX',          // TRX = index, else companyId
  data: null,
  sort: { key: 'blended', dir: 1 },
  search: '',
};

const METRIC_LABEL = { blended: 'Blended', input: 'Input', output: 'Output' };
const $ = (s) => document.querySelector(s);
const fmt = (n, d = 2) => n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n) => n == null ? '—' : '$' + fmt(n, n < 1 ? 3 : 2);
const signed = (n) => (n > 0 ? '+' : '') + fmt(n, 1) + '%';
const ud = (n) => n > 0.05 ? 'up' : n < -0.05 ? 'down' : 'flat';

let chart;

const idxFmt = (v) => fmt(v, 2);
const usdFmt = (v) => '$' + fmt(v, v < 1 ? 3 : 2);

// ---------------------------------------------------------------- data
async function load() {
  state.data = await (await fetch(`/api/data?metric=${state.metric}`)).json();
  if (!chart) {
    chart = new TraxChart($('#tvCanvas'));
    chart.onHover(updateLegend);
  }
  selectSymbol(state.selected, true);
  renderWatchlist(); renderTable(); renderTicker(); renderMeta();
}

// ---------------------------------------------------------------- chart symbol
function currentSeries() {
  if (state.selected === 'TRX') return { candles: state.data.candles.index, fmt: idxFmt, fmtKind: 'idx' };
  return { candles: state.data.candles.companies[state.selected], fmt: usdFmt, fmtKind: 'usd' };
}

function selectSymbol(sym, keepRange) {
  state.selected = sym;
  const ser = currentSeries();
  const meta = symMeta(sym);
  $('#symTicker').textContent = meta.ticker;
  $('#symName').textContent = meta.name;
  $('#symBadge').textContent = meta.badge;
  chart.setSeries(ser.candles, { priceFmt: ser.fmt, type: chart.type, label: meta.name });
  if (keepRange) applyRange();
  renderQuote();
}

function symMeta(sym) {
  if (sym === 'TRX') return { ticker: 'TRX', name: 'TRAX Cost Index', badge: 'INDEX' };
  const c = state.data.companies.find((x) => x.id === sym);
  return { ticker: c.name.toUpperCase().slice(0, 6), name: `${c.name} · basket $/Mtok`, badge: 'PROVIDER' };
}

function renderQuote() {
  const ser = currentSeries();
  const c = ser.candles.filter((x) => x);
  const last = c[c.length - 1], first = c[0];
  const chgAbs = last.c - first.c, chgPct = (chgAbs / first.c) * 100;
  $('#symLast').textContent = ser.fmt(last.c);
  const el = $('#symChg');
  el.textContent = `${chgAbs >= 0 ? '+' : ''}${ser.fmt(Math.abs(chgAbs)).replace('$', '')} (${signed(chgPct)})`;
  el.className = 'sym-chg ' + ud(chgPct);
  updateLegend(last, false);
}

function updateLegend(d, hovering) {
  if (!d) return;
  const ser = currentSeries();
  const dir = d.c >= d.o ? 'up' : 'down';
  const ch = d.c - d.o, chp = d.o ? (ch / d.o) * 100 : 0;
  const f = ser.fmt;
  $('#legend').innerHTML =
    `<span class="lg-title">${symMeta(state.selected).ticker}</span>` +
    `<span class="lg-item">${d.t}</span>` +
    `<span class="lg-item">O<b class="lg-v ${dir}"> ${f(d.o)}</b></span>` +
    `<span class="lg-item">H<b class="lg-v ${dir}"> ${f(d.h)}</b></span>` +
    `<span class="lg-item">L<b class="lg-v ${dir}"> ${f(d.l)}</b></span>` +
    `<span class="lg-item">C<b class="lg-v ${dir}"> ${f(d.c)}</b></span>` +
    `<span class="lg-v ${ud(chp)}">${ch >= 0 ? '+' : ''}${f(Math.abs(ch)).replace('$', '')} (${signed(chp)})</span>` +
    `<span class="lg-item">Vol <b class="lg-v">${d.v}</b></span>`;
}

function applyRange() {
  const n = state.range === 'all' ? null : parseInt(state.range, 10);
  chart.setRange(n);
}

// ---------------------------------------------------------------- watchlist
function renderWatchlist() {
  const rows = [];
  rows.push({ id: 'TRX', dot: '#2962ff', tk: 'TRX', nm: 'TRAX Cost Index', last: idxFmt(state.data.indexStats.level), chg: state.data.indexStats.changeAllTime });
  [...state.data.companies].sort((a, b) => (b.current || 0) - (a.current || 0)).forEach((c) => {
    rows.push({ id: c.id, dot: c.color, tk: c.name.toUpperCase().slice(0, 6), nm: c.name, last: usdFmt(c.current), chg: c.allTimeChange });
  });
  $('#watchList').innerHTML = rows.map((r) => `
    <div class="wrow ${r.id === state.selected ? 'active' : ''}" data-sym="${r.id}">
      <div class="w-sym"><span class="w-dot" style="background:${r.dot}"></span>
        <div><div class="w-tk">${r.tk}</div><div class="w-nm">${r.nm}</div></div></div>
      <div class="w-last">${r.last}</div>
      <div class="w-chg ${ud(r.chg)}">${signed(r.chg)}</div>
    </div>`).join('');
  $('#watchFoot').textContent = `${state.data.companies.length} providers · ${state.data.modelTable.length} models · Chg = all-time`;
}

// ---------------------------------------------------------------- table
function renderTable() {
  const { key, dir } = state.sort;
  let rows = state.data.modelTable.filter((m) => !state.search || (m.label + ' ' + m.company).toLowerCase().includes(state.search));
  rows.sort((a, b) => { let x = a[key], y = b[key]; return typeof x === 'string' ? x.localeCompare(y) * dir : (x - y) * dir; });
  $('#modelBody').innerHTML = rows.map((m) => `
    <tr>
      <td class="m-name">${m.label}<span class="tier">${m.tier}</span></td>
      <td><span class="pill"><span class="w-dot" style="background:${m.color}"></span>${m.company}</span></td>
      <td class="num">${money(m.input)}</td>
      <td class="num">${money(m.output)}</td>
      <td class="num">${money(m.blended)}</td>
      <td class="num chg-cell ${ud(m.changeSinceLaunch)}">${m.changeSinceLaunch === 0 ? '—' : signed(m.changeSinceLaunch)}</td>
      <td class="num" style="color:var(--faint)">${m.launched}</td>
    </tr>`).join('');
}

// ---------------------------------------------------------------- ticker + meta
function renderTicker() {
  const items = state.data.companies.map((c) =>
    `<span class="tk"><span class="dot" style="background:${c.color}"></span><b>${c.name}</b>
      <span class="px">${money(c.current)}</span><span class="chg ${c.allTimeChange < 0 ? 'dn' : 'up'}">${signed(c.allTimeChange)}</span></span>`);
  $('#ticker').innerHTML = items.concat(items).join('');
}
function renderMeta() {
  $('#methodology').textContent = state.data.meta.methodology;
  $('#asOf').textContent = state.data.meta.asOf;
}

// ---------------------------------------------------------------- live spot
async function pollSpot() {
  try {
    if (state.selected !== 'TRX') return;
    const s = await (await fetch(`/api/spot?metric=${state.metric}`)).json();
    const dir = s.drift < 0 ? 'down' : s.drift > 0 ? 'up' : 'flat';
    $('#symLast').textContent = fmt(s.level, 2);
    const fromBase = s.level - 100;
    const el = $('#symChg');
    el.textContent = `${fromBase >= 0 ? '+' : ''}${fmt(fromBase, 2)} (${signed(((s.level - 100) / 100) * 100)})`;
    el.className = 'sym-chg ' + dir;
  } catch (_) {}
}

// ---------------------------------------------------------------- events
$('#metricSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  state.metric = b.dataset.metric;
  [...e.currentTarget.children].forEach((c) => c.classList.toggle('active', c === b));
  load();
});
$('#intervalSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  state.range = b.dataset.range;
  [...e.currentTarget.children].forEach((c) => c.classList.toggle('active', c === b));
  applyRange();
});
$('#typeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  setType(b.dataset.type);
});
function setType(t) {
  chart.setType(t);
  [...$('#typeSeg').children].forEach((c) => c.classList.toggle('active', c.dataset.type === t));
  $$('#tools [data-tool="candles"],#tools [data-tool="area"]').forEach((el) => el.classList.toggle('active', el.dataset.tool === t));
}
const $$ = (s) => document.querySelectorAll(s);

$('#watchList').addEventListener('click', (e) => {
  const row = e.target.closest('.wrow'); if (!row) return;
  selectSymbol(row.dataset.sym, false);
  [...$('#watchList').children].forEach((r) => r.classList.toggle('active', r.dataset.sym === row.dataset.sym));
  applyRange();
});

$('#tools').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const t = b.dataset.tool;
  if (t === 'cross') b.classList.toggle('active', chart.toggleCrosshair());
  else if (t === 'candles') setType('candles');
  else if (t === 'area') setType('area');
  else if (t === 'log') b.classList.toggle('active', chart.toggleLog());
  else if (t === 'reset') chart.reset();
  else if (t === 'snapshot') chart.snapshot();
  else if (t === 'full') { const el = $('#chartPane'); document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen(); }
});

$('#modelSearch').addEventListener('input', (e) => { state.search = e.target.value.toLowerCase(); renderTable(); });
$$('.model-table th').forEach((th) => th.addEventListener('click', () => {
  const k = th.dataset.sort;
  state.sort.dir = state.sort.key === k ? -state.sort.dir : 1;
  state.sort.key = k; renderTable();
}));

// ---------------------------------------------------------------- boot
load().then(() => { pollSpot(); setInterval(pollSpot, 2000); });
