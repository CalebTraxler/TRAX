import { useMemo, useState, useRef, useLayoutEffect } from "react";
import type { Candle } from "@/lib/trax";

interface Props {
  candles: Candle[];
  color?: string;
  height?: number;
  logScale?: boolean;
}

const UP = "var(--up)";
const DOWN = "var(--down)";
const GRID = "var(--chart-grid)";
const AXIS = "var(--chart-axis)";
const CHART_BG = "var(--chart-bg)";

export function CandlestickChart({ candles, height = 420, logScale = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width ?? 900;
      setW(Math.max(320, Math.floor(cw)));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;

  const { minY, maxY, yTicks } = useMemo(() => {
    if (candles.length === 0) return { minY: 0, maxY: 1, yTicks: [] as number[] };
    let lo = Infinity, hi = -Infinity;
    for (const c of candles) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
    }
    if (logScale) {
      lo = Math.max(lo, 0.001);
      const lLo = Math.log10(lo), lHi = Math.log10(hi);
      const pad = (lHi - lLo) * 0.06 || 0.1;
      const ticks: number[] = [];
      const steps = 6;
      for (let i = 0; i <= steps; i++) ticks.push(10 ** (lLo - pad + ((lHi - lLo + 2 * pad) * i) / steps));
      return { minY: 10 ** (lLo - pad), maxY: 10 ** (lHi + pad), yTicks: ticks };
    }
    const pad = (hi - lo) * 0.08 || hi * 0.05 || 0.1;
    lo = Math.max(0, lo - pad);
    hi = hi + pad;
    const ticks: number[] = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) ticks.push(lo + ((hi - lo) * i) / steps);
    return { minY: lo, maxY: hi, yTicks: ticks };
  }, [candles, logScale]);

  if (candles.length === 0) return null;

  const n = candles.length;
  const slot = innerW / n;
  const bodyW = Math.max(2, Math.min(14, slot * 0.7));

  const yScale = (v: number) => {
    if (logScale) {
      const lo = Math.log10(minY), hi = Math.log10(maxY);
      const t = (Math.log10(Math.max(v, 0.0001)) - lo) / (hi - lo || 1);
      return padT + innerH - t * innerH;
    }
    return padT + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;
  };

  const xTickIdx: number[] = [];
  const xCount = Math.min(7, n);
  for (let i = 0; i < xCount; i++) xTickIdx.push(Math.round((i * (n - 1)) / (xCount - 1 || 1)));

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        width={w}
        height={height}
        className="block"
        role="img"
        aria-label="Candlestick price chart"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = e.clientX - rect.left - padL;
          const idx = Math.floor(x / slot);
          if (idx < 0 || idx >= n) setHover(null);
          else setHover(idx);
        }}
      >
        <rect x={0} y={0} width={w} height={height} style={{ fill: CHART_BG }} />

        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={yScale(t)} y2={yScale(t)} style={{ stroke: GRID }} strokeDasharray="2 4" />
            <text x={padL - 6} y={yScale(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} style={{ fill: AXIS }} fontFamily="var(--font-mono)">
              ${t.toFixed(t < 1 ? 3 : 2)}
            </text>
          </g>
        ))}

        {xTickIdx.map((i) => {
          const x = padL + slot * i + slot / 2;
          return <line key={`vg-${i}`} x1={x} x2={x} y1={padT} y2={padT + innerH} style={{ stroke: GRID }} strokeDasharray="2 4" />;
        })}

        {candles.map((c, i) => {
          const cx = padL + slot * i + slot / 2;
          const up = c.close >= c.open;
          const color = up ? UP : DOWN;
          const bodyY = Math.min(yScale(c.open), yScale(c.close));
          const bodyH = Math.max(1, Math.abs(yScale(c.close) - yScale(c.open)));
          return (
            <g key={c.month}>
              <line x1={cx} x2={cx} y1={yScale(c.high)} y2={yScale(c.low)} style={{ stroke: color }} strokeWidth={1} />
              <rect x={cx - bodyW / 2} y={bodyY} width={bodyW} height={bodyH} style={{ fill: color, stroke: color }} />
            </g>
          );
        })}

        {xTickIdx.map((i) => {
          const x = padL + slot * i + slot / 2;
          return (
            <text key={`xl-${i}`} x={x} y={height - 12} textAnchor="middle" fontSize={10} style={{ fill: AXIS }} fontFamily="var(--font-mono)">
              {candles[i].month}
            </text>
          );
        })}

        {hover != null && (() => {
          const c = candles[hover];
          const cx = padL + slot * hover + slot / 2;
          const yC = yScale(c.close);
          return (
            <g pointerEvents="none">
              <line x1={cx} x2={cx} y1={padT} y2={padT + innerH} style={{ stroke: AXIS }} strokeDasharray="2 3" />
              <line x1={padL} x2={w - padR} y1={yC} y2={yC} style={{ stroke: AXIS }} strokeDasharray="2 3" />
            </g>
          );
        })()}
      </svg>

      {hover != null && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover/95 px-3 py-2 font-mono text-[11px] text-popover-foreground shadow-lg backdrop-blur"
          style={{ left: Math.min(w - 180, Math.max(8, padL + slot * hover + slot / 2 + 10)), top: 12 }}
        >
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{candles[hover].month}</div>
          <Row k="O" v={candles[hover].open} />
          <Row k="H" v={candles[hover].high} color={UP} />
          <Row k="L" v={candles[hover].low} color={DOWN} />
          <Row k="C" v={candles[hover].close} />
          <div className="mt-1 text-[10px] text-muted-foreground">
            {candles[hover].events} repricing{candles[hover].events === 1 ? "" : "s"}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, color }: { k: string; v: number; color?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-3 text-muted-foreground">{k}</span>
      <span style={color ? { color } : undefined}>${v.toFixed(v < 1 ? 4 : 3)}</span>
    </div>
  );
}
