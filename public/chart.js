'use strict';

/* TraxChart — a lightweight TradingView-style candlestick/area engine on canvas.
   View-only: crosshair, pan (drag), zoom (wheel), log scale, volume pane.
   No trading, no orders — this renders TRAX analytics data only. */

const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMonth = (t) => { const [y, m] = t.split('-'); return `${MN[+m - 1]} '${y.slice(2)}`; };

function niceTicks(lo, hi, n) {
  const span = hi - lo || 1;
  const raw = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const start = Math.ceil(lo / step) * step;
  const out = [];
  for (let v = start; v <= hi + step * 0.001; v += step) out.push(+v.toFixed(6));
  return out;
}

class TraxChart {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = [];
    this.type = 'candles';
    this.log = false;
    this.crosshair = true;
    this.priceFmt = (v) => v.toFixed(2);
    // TradingView-like palette
    this.C = {
      up: '#26a69a', down: '#ef5350', area: '#2962ff', areaFill: 'rgba(41,98,255,0.18)',
      bg: '#131722', grid: '#1e222d', gridX: '#1e222d', axis: '#787b86', axisHi: '#d1d4dc',
      cross: '#758696', tagBg: '#363a45', wickUp: '#26a69a', wickDown: '#ef5350',
    };
    this.padR = 66; this.padB = 26; this.padT = 12; this.volFrac = 0.16;
    this.i0 = 0; this.i1 = 0; this.mouse = null; this.drag = null; this.hoverCb = null;
    this._bind();
    this.ro = new ResizeObserver(() => this._resize());
    this.ro.observe(canvas.parentElement || canvas);
  }

  onHover(cb) { this.hoverCb = cb; }

  setSeries(data, opts = {}) {
    this.data = data.filter((d) => d);
    if (opts.priceFmt) this.priceFmt = opts.priceFmt;
    if (opts.type) this.type = opts.type;
    this.label = opts.label || '';
    this.fitAll();
  }
  setType(t) { this.type = t; this.draw(); this._emit(); }
  setRange(n) { const len = this.data.length; this.i0 = (!n || n >= len) ? 0 : len - n; this.i1 = len - 1; this.draw(); this._emit(); }
  toggleLog() { this.log = !this.log; this.draw(); return this.log; }
  toggleCrosshair() { this.crosshair = !this.crosshair; this.draw(); return this.crosshair; }
  fitAll() { this.i0 = 0; this.i1 = Math.max(0, this.data.length - 1); this._resize(); }
  reset() { this.fitAll(); this._emit(); }
  snapshot() { const a = document.createElement('a'); a.download = 'trax-chart.png'; a.href = this.cv.toDataURL('image/png'); a.click(); }

  // ---- geometry ----
  get plotW() { return this.W - this.padR; }
  get plotH() { return this.H - this.padB - this.padT; }
  get count() { return this.i1 - this.i0 + 1; }
  get slotW() { return this.plotW / Math.max(1, this.count); }
  xCenter(i) { return (i - this.i0 + 0.5) * this.slotW; }
  yOf(p) {
    const { lo, hi } = this._pr;
    if (this.log) { const a = Math.log10(lo), b = Math.log10(hi); return this.padT + (b - Math.log10(p)) / (b - a) * this.plotH; }
    return this.padT + (hi - p) / (hi - lo) * this.plotH;
  }
  priceAt(y) {
    const { lo, hi } = this._pr;
    if (this.log) { const a = Math.log10(lo), b = Math.log10(hi); return Math.pow(10, b - (y - this.padT) / this.plotH * (b - a)); }
    return hi - (y - this.padT) / this.plotH * (hi - lo);
  }

  _resize() {
    const host = this.cv.parentElement || this.cv;
    const r = host.getBoundingClientRect();
    this.W = r.width; this.H = r.height;
    const dpr = window.devicePixelRatio || 1;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  _range() {
    const vis = this.data.slice(this.i0, this.i1 + 1);
    if (!vis.length) return { lo: 0, hi: 1 };
    let lo = Infinity, hi = -Infinity;
    for (const d of vis) {
      if (this.type === 'area') { lo = Math.min(lo, d.c); hi = Math.max(hi, d.c); }
      else { lo = Math.min(lo, d.l); hi = Math.max(hi, d.h); }
    }
    if (this.log && lo <= 0) lo = Math.max(1e-4, hi / 1000);
    const pad = (hi - lo) * 0.08 || hi * 0.08 || 1;
    return { lo: Math.max(this.log ? lo * 0.9 : lo - pad, this.log ? 1e-4 : -1e9), hi: hi + pad };
  }

  draw() {
    if (!this.W || !this.data.length) return;
    const ctx = this.ctx, C = this.C;
    this._pr = this._range();
    ctx.clearRect(0, 0, this.W, this.H);

    // grid — horizontal price lines
    const ticks = niceTicks(this._pr.lo, this._pr.hi, 6);
    ctx.lineWidth = 1; ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textBaseline = 'middle';
    for (const t of ticks) {
      const y = Math.round(this.yOf(t)) + 0.5;
      if (y < this.padT || y > this.padT + this.plotH) continue;
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.plotW, y); ctx.stroke();
      ctx.fillStyle = C.axis; ctx.textAlign = 'left';
      ctx.fillText(this.priceFmt(t), this.plotW + 8, y);
    }
    // grid — vertical time lines + labels
    const step = Math.max(1, Math.ceil(this.count / 8));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = this.i1; i >= this.i0; i -= step) {
      const x = Math.round(this.xCenter(i)) + 0.5;
      ctx.strokeStyle = C.gridX; ctx.beginPath(); ctx.moveTo(x, this.padT); ctx.lineTo(x, this.padT + this.plotH); ctx.stroke();
      ctx.fillStyle = C.axis; ctx.fillText(fmtMonth(this.data[i].t), x, this.padT + this.plotH + 7);
    }

    // volume pane
    const maxV = Math.max(1, ...this.data.slice(this.i0, this.i1 + 1).map((d) => d.v));
    const volH = this.plotH * this.volFrac, volBase = this.padT + this.plotH;
    const bw = Math.max(1, this.slotW * 0.66);
    for (let i = this.i0; i <= this.i1; i++) {
      const d = this.data[i]; if (!d.v) continue;
      const x = this.xCenter(i), h = (d.v / maxV) * volH;
      ctx.fillStyle = (d.c >= d.o ? 'rgba(38,166,154,0.45)' : 'rgba(239,83,80,0.45)');
      ctx.fillRect(x - bw / 2, volBase - h, bw, h);
    }

    // series
    if (this.type === 'area') this._drawArea(); else this._drawCandles();

    // axis frames
    ctx.strokeStyle = C.grid; ctx.beginPath();
    ctx.moveTo(this.plotW + 0.5, this.padT); ctx.lineTo(this.plotW + 0.5, this.padT + this.plotH); ctx.stroke();

    // last price tag
    this._lastTag();
    // crosshair
    if (this.crosshair && this.mouse) this._drawCross();
    this._emit();
  }

  _drawCandles() {
    const ctx = this.ctx;
    const bw = Math.max(1, this.slotW * 0.66);
    for (let i = this.i0; i <= this.i1; i++) {
      const d = this.data[i]; const up = d.c >= d.o;
      const col = up ? this.C.up : this.C.down;
      const x = Math.round(this.xCenter(i)) + 0.5;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      // wick
      ctx.beginPath(); ctx.moveTo(x, this.yOf(d.h)); ctx.lineTo(x, this.yOf(d.l)); ctx.stroke();
      // body
      const yo = this.yOf(d.o), yc = this.yOf(d.c);
      const top = Math.min(yo, yc), hgt = Math.max(1, Math.abs(yc - yo));
      ctx.fillRect(Math.round(x - bw / 2), Math.round(top), Math.round(bw), Math.round(hgt));
    }
  }

  _drawArea() {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = this.i0; i <= this.i1; i++) {
      const x = this.xCenter(i), y = this.yOf(this.data[i].c);
      i === this.i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = this.C.area; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(this.xCenter(this.i1), this.padT + this.plotH);
    ctx.lineTo(this.xCenter(this.i0), this.padT + this.plotH);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, this.padT, 0, this.padT + this.plotH);
    g.addColorStop(0, 'rgba(41,98,255,0.28)'); g.addColorStop(1, 'rgba(41,98,255,0)');
    ctx.fillStyle = g; ctx.fill();
  }

  _lastTag() {
    const ctx = this.ctx, d = this.data[this.i1]; if (!d) return;
    const y = this.yOf(d.c), up = d.c >= d.o, col = up ? this.C.up : this.C.down;
    ctx.setLineDash([2, 3]); ctx.strokeStyle = col; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(this.plotW, Math.round(y) + 0.5); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = col; ctx.fillRect(this.plotW, y - 9, this.padR, 18);
    ctx.fillStyle = '#fff'; ctx.font = "600 11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(this.priceFmt(d.c), this.plotW + 6, y);
  }

  _drawCross() {
    const ctx = this.ctx, C = this.C;
    const hi = this._hoverIndex();
    const x = Math.round(this.xCenter(hi)) + 0.5;
    const my = this.mouse.y;
    ctx.setLineDash([3, 3]); ctx.strokeStyle = C.cross; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, this.padT); ctx.lineTo(x, this.padT + this.plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, Math.round(my) + 0.5); ctx.lineTo(this.plotW, Math.round(my) + 0.5); ctx.stroke();
    ctx.setLineDash([]);
    // price tag (right)
    const pv = this.priceFmt(this.priceAt(my));
    ctx.fillStyle = C.tagBg; ctx.fillRect(this.plotW, my - 9, this.padR, 18);
    ctx.fillStyle = C.axisHi; ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(pv, this.plotW + 6, my);
    // time tag (bottom)
    const lbl = fmtMonth(this.data[hi].t);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(lbl).width + 14;
    ctx.fillStyle = C.tagBg; ctx.fillRect(x - tw / 2, this.padT + this.plotH + 1, tw, 18);
    ctx.fillStyle = C.axisHi; ctx.fillText(lbl, x, this.padT + this.plotH + 10);
  }

  _hoverIndex() {
    if (!this.mouse) return this.i1;
    const k = Math.floor(this.mouse.x / this.slotW);
    return Math.max(this.i0, Math.min(this.i1, this.i0 + k));
  }
  _emit() { if (this.hoverCb) this.hoverCb(this.data[this._hoverIndex()], this.mouse != null); }

  _bind() {
    const cv = this.cv;
    cv.addEventListener('mousemove', (e) => {
      const r = cv.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
      if (this.drag) {
        const di = Math.round((this.drag.x - mx) / this.slotW);
        const cnt = this.drag.i1 - this.drag.i0 + 1, len = this.data.length;
        let ni0 = Math.max(0, Math.min(len - cnt, this.drag.i0 + di));
        this.i0 = ni0; this.i1 = ni0 + cnt - 1; this.draw(); return;
      }
      this.mouse = (mx <= this.plotW && my <= this.padT + this.plotH) ? { x: mx, y: my } : null;
      this.draw();
    });
    cv.addEventListener('mouseleave', () => { this.mouse = null; this.draw(); });
    cv.addEventListener('mousedown', (e) => {
      const r = cv.getBoundingClientRect();
      this.drag = { x: e.clientX - r.left, i0: this.i0, i1: this.i1 }; cv.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => { if (this.drag) { this.drag = null; cv.style.cursor = 'crosshair'; } });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect(); const mx = e.clientX - r.left;
      const frac = Math.max(0, Math.min(1, mx / this.plotW));
      const len = this.data.length, cnt = this.count;
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      let nc = Math.max(8, Math.min(len, Math.round(cnt * factor)));
      const anchor = this.i0 + frac * cnt;
      let ni0 = Math.round(anchor - frac * nc);
      ni0 = Math.max(0, Math.min(len - nc, ni0));
      this.i0 = ni0; this.i1 = ni0 + nc - 1; this.draw();
    }, { passive: false });
    cv.style.cursor = 'crosshair';
  }
}

window.TraxChart = TraxChart;
