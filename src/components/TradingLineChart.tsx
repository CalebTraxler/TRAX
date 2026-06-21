import { useMemo, useState, useRef, useLayoutEffect } from "react";

export interface LinePoint {
  x: string;       // label, e.g. "2024-03"
  y: number | null;
}

export interface SeriesSpec {
  id: string;
  name: string;
  color: string;
  data: LinePoint[];
  emphasis?: boolean;  // thicker stroke + glow
}

interface Props {
  series: SeriesSpec[];
  height?: number;
  logScale?: boolean;
  yFormat?: (v: number) => string;
}

const COLORS = {
  bg: "#0b1220",
  grid: "#1e293b",
  axis: "#475569",
  text: "#94a3b8",
  cross: "#64748b",
};

export function TradingLineChart({
  series,
  height = 360,
  logScale = false,
  yFormat = (v) => (v < 1 ? v.toFixed(3) : v.toFixed(2)),
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setW(Math.max(320, Math.floor(entries[0]?.contentRect.width ?? 900)));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const padL = 52;
  const padR = 16;
  const padT = 14;
  const padB = 32;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;

  const xLabels = series[0]?.data.map((p) => p.x) ?? [];
  const n = xLabels.length;

  const { minY, maxY, yTicks } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const s of series) {
      for (const p of s.data) {
        if (p.y == null) continue;
        if (p.y < lo) lo = p.y;
        if (p.y > hi) hi = p.y;
      }
    }
    if (!isFinite(lo) || !isFinite(hi)) return { minY: 0, maxY: 1, yTicks: [] as number[] };
    if (logScale) {
      lo = Math.max(lo, 0.01);
      const lLo = Math.log10(lo);
      const lHi = Math.log10(hi);
      const pad = (lHi - lLo) * 0.05 || 0.1;
      const ticks: number[] = [];
      const steps = 5;
      for (let i = 0; i <= steps; i++) ticks.push(10 ** (lLo - pad + ((lHi - lLo + 2 * pad) * i) / steps));
      return { minY: 10 ** (lLo - pad), maxY: 10 ** (lHi + pad), yTicks: ticks };
    }
    const pad = (hi - lo) * 0.08 || hi * 0.05 || 0.1;
    lo = Math.max(0, lo - pad);
    hi = hi + pad;
    const ticks: number[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) ticks.push(lo + ((hi - lo) * i) / steps);
    return { minY: lo, maxY: hi, yTicks: ticks };
  }, [series, logScale]);

  const xScale = (i: number) => padL + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const yScale = (v: number) => {
    if (logScale) {
      const lo = Math.log10(minY), hi = Math.log10(maxY);
      const t = (Math.log10(v) - lo) / (hi - lo || 1);
      return padT + innerH - t * innerH;
    }
    return padT + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;
  };

  const xTickIdx: number[] = [];
  const xCount = Math.min(7, n);
  for (let i = 0; i < xCount; i++) xTickIdx.push(Math.round((i * (n - 1)) / (xCount - 1 || 1)));

  if (n === 0) return null;

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
          const idx = Math.round((x / innerW) * (n - 1));
          if (idx < 0 || idx >= n) setHover(null);
          else setHover(idx);
        }}
      >
        <rect x={0} y={0} width={w} height={height} fill={COLORS.bg} />

        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={w - padR}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke={COLORS.grid}
              strokeDasharray="2 4"
            />
            <text
              x={padL - 6}
              y={yScale(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill={COLORS.text}
              fontFamily="ui-monospace, SFMono-Regular, monospace"
            >
              {yFormat(t)}
            </text>
          </g>
        ))}

        {xTickIdx.map((i) => (
          <line
            key={`vg-${i}`}
            x1={xScale(i)}
            x2={xScale(i)}
            y1={padT}
            y2={padT + innerH}
            stroke={COLORS.grid}
            strokeDasharray="2 4"
          />
        ))}

        {series.map((s) => {
          let d = "";
          let inPath = false;
          for (let i = 0; i < s.data.length; i++) {
            const p = s.data[i];
            if (p.y == null) { inPath = false; continue; }
            const cmd = inPath ? "L" : "M";
            d += `${cmd}${xScale(i).toFixed(2)},${yScale(p.y).toFixed(2)} `;
            inPath = true;
          }
          return (
            <path
              key={s.id}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth={s.emphasis ? 2.25 : 1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={s.emphasis ? { filter: `drop-shadow(0 0 6px ${s.color}55)` } : undefined}
            />
          );
        })}

        {xTickIdx.map((i) => (
          <text
            key={`xl-${i}`}
            x={xScale(i)}
            y={height - 10}
            textAnchor="middle"
            fontSize={10}
            fill={COLORS.text}
            fontFamily="ui-monospace, SFMono-Regular, monospace"
          >
            {xLabels[i]}
          </text>
        ))}

        {hover != null && (
          <g pointerEvents="none">
            <line
              x1={xScale(hover)}
              x2={xScale(hover)}
              y1={padT}
              y2={padT + innerH}
              stroke={COLORS.cross}
              strokeDasharray="2 3"
            />
            {series.map((s) => {
              const v = s.data[hover]?.y;
              if (v == null) return null;
              return (
                <circle
                  key={s.id}
                  cx={xScale(hover)}
                  cy={yScale(v)}
                  r={s.emphasis ? 4 : 3}
                  fill={COLORS.bg}
                  stroke={s.color}
                  strokeWidth={2}
                />
              );
            })}
          </g>
        )}
      </svg>

      {hover != null && (
        <div
          className="pointer-events-none absolute rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 font-mono text-[11px] text-slate-200 shadow-xl"
          style={{
            left: Math.min(w - 180, Math.max(8, xScale(hover) + 10)),
            top: 12,
          }}
        >
          <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">
            {xLabels[hover]}
          </div>
          {series.map((s) => {
            const v = s.data[hover]?.y;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="w-20 truncate text-slate-400">{s.name}</span>
                <span className="ml-auto">{v == null ? "—" : yFormat(v)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}