import { useMemo, useState, useRef, useLayoutEffect } from "react";
import type { Candle } from "@/lib/trax";

interface Props {
  candles: Candle[];
  color?: string;
  height?: number;
}

const UP = "#22c55e";
const DOWN = "#ef4444";

export function CandlestickChart({ candles, height = 420 }: Props) {
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
    const pad = (hi - lo) * 0.08 || hi * 0.05 || 0.1;
    lo = Math.max(0, lo - pad);
    hi = hi + pad;
    const ticks: number[] = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) ticks.push(lo + ((hi - lo) * i) / steps);
    return { minY: lo, maxY: hi, yTicks: ticks };
  }, [candles]);

  if (candles.length === 0) return null;

  const n = candles.length;
  const slot = innerW / n;
  const bodyW = Math.max(2, Math.min(14, slot * 0.7));

  const yScale = (v: number) =>
    padT + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;

  // x-axis tick labels: ~6 ticks
  const xTickIdx: number[] = [];
  const xCount = Math.min(7, n);
  for (let i = 0; i < xCount; i++) {
    xTickIdx.push(Math.round((i * (n - 1)) / (xCount - 1 || 1)));
  }

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        width={w}
        height={height}
        className="block"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = e.clientX - rect.left - padL;
          const idx = Math.floor(x / slot);
          if (idx < 0 || idx >= n) setHover(null);
          else setHover(idx);
        }}
      >
        {/* background */}
        <rect x={0} y={0} width={w} height={height} fill="#0b1220" />

        {/* horizontal grid + Y labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={w - padR}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="#1e293b"
              strokeDasharray="2 4"
            />
            <text
              x={padL - 6}
              y={yScale(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="#64748b"
              fontFamily="ui-monospace, SFMono-Regular, monospace"
            >
              ${t.toFixed(t < 1 ? 3 : 2)}
            </text>
          </g>
        ))}

        {/* vertical grid at x ticks */}
        {xTickIdx.map((i) => {
          const x = padL + slot * i + slot / 2;
          return (
            <line
              key={`vg-${i}`}
              x1={x}
              x2={x}
              y1={padT}
              y2={padT + innerH}
              stroke="#1e293b"
              strokeDasharray="2 4"
            />
          );
        })}

        {/* candles */}
        {candles.map((c, i) => {
          const cx = padL + slot * i + slot / 2;
          const up = c.close >= c.open;
          const color = up ? UP : DOWN;
          const yHigh = yScale(c.high);
          const yLow = yScale(c.low);
          const yOpen = yScale(c.open);
          const yClose = yScale(c.close);
          const bodyY = Math.min(yOpen, yClose);
          const bodyH = Math.max(1, Math.abs(yClose - yOpen));
          return (
            <g key={c.month}>
              <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
              <rect
                x={cx - bodyW / 2}
                y={bodyY}
                width={bodyW}
                height={bodyH}
                fill={color}
                stroke={color}
              />
            </g>
          );
        })}

        {/* X labels */}
        {xTickIdx.map((i) => {
          const x = padL + slot * i + slot / 2;
          return (
            <text
              key={`xl-${i}`}
              x={x}
              y={height - 12}
              textAnchor="middle"
              fontSize={10}
              fill="#64748b"
              fontFamily="ui-monospace, SFMono-Regular, monospace"
            >
              {candles[i].month}
            </text>
          );
        })}

        {/* crosshair */}
        {hover != null && (() => {
          const c = candles[hover];
          const cx = padL + slot * hover + slot / 2;
          const yC = yScale(c.close);
          return (
            <g pointerEvents="none">
              <line x1={cx} x2={cx} y1={padT} y2={padT + innerH} stroke="#475569" strokeDasharray="2 3" />
              <line x1={padL} x2={w - padR} y1={yC} y2={yC} stroke="#475569" strokeDasharray="2 3" />
            </g>
          );
        })()}
      </svg>

      {hover != null && (
        <div
          className="pointer-events-none absolute rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 font-mono text-[11px] text-slate-200 shadow-lg"
          style={{
            left: Math.min(
              w - 180,
              Math.max(8, padL + slot * hover + slot / 2 + 10),
            ),
            top: 12,
          }}
        >
          <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">
            {candles[hover].month}
          </div>
          <Row k="O" v={candles[hover].open} />
          <Row k="H" v={candles[hover].high} color={UP} />
          <Row k="L" v={candles[hover].low} color={DOWN} />
          <Row k="C" v={candles[hover].close} />
          <div className="mt-1 text-[10px] text-slate-400">
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
      <span className="w-3 text-slate-500">{k}</span>
      <span style={color ? { color } : undefined}>
        ${v.toFixed(v < 1 ? 4 : 3)}
      </span>
    </div>
  );
}