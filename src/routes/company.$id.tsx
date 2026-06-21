import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  buildCompanyCandles,
  fetchPricing,
  type Metric,
} from "@/lib/trax";

export const Route = createFileRoute("/company/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id.toUpperCase()} — Token Cost History · TRAX` },
      {
        name: "description",
        content: `Candlestick history of ${params.id} blended token prices ($/Mtok) across all tracked models.`,
      },
    ],
  }),
  component: CompanyPage,
});

type ChartType = "candles" | "line";

function CompanyPage() {
  const { id } = useParams({ from: "/company/$id" });
  const [metric, setMetric] = useState<Metric>("blended");
  const [chartType, setChartType] = useState<ChartType>("candles");
  const { data, isLoading, error } = useQuery({
    queryKey: ["pricing"],
    queryFn: fetchPricing,
  });

  const company = data?.companies[id];
  const candles = useMemo(
    () => (data ? buildCompanyCandles(data, id, metric) : []),
    [data, id, metric],
  );

  const models = useMemo(
    () => (data ? data.models.filter((m) => m.company === id) : []),
    [data, id],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;
    const el = containerRef.current;
    const chart = createChart(el, {
      width: el.clientWidth,
      height: 460,
      layout: {
        background: { color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.08)" },
        horzLines: { color: "rgba(148,163,184,0.12)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148,163,184,0.2)",
        mode: 1, // logarithmic
      },
      timeScale: {
        borderColor: "rgba(148,163,184,0.2)",
        timeVisible: false,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(45,212,191,0.5)", labelBackgroundColor: "#0f172a" },
        horzLine: { color: "rgba(45,212,191,0.5)", labelBackgroundColor: "#0f172a" },
      },
    });
    chartRef.current = chart;

    const toTime = (s: string): UTCTimestamp =>
      (Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 1000) as UTCTimestamp;

    let series: ISeriesApi<"Candlestick"> | ISeriesApi<"Line">;
    if (chartType === "candles") {
      series = chart.addSeries(CandlestickSeries, {
        upColor: "#ef4444", // price UP = bad (more expensive) → red
        downColor: "#10b981", // price DOWN = good (cheaper) → green
        borderUpColor: "#ef4444",
        borderDownColor: "#10b981",
        wickUpColor: "#ef4444",
        wickDownColor: "#10b981",
      });
      (series as ISeriesApi<"Candlestick">).setData(
        candles.map((c) => ({
          time: toTime(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      );
    } else {
      series = chart.addSeries(LineSeries, {
        color: company?.color ?? "#2dd4bf",
        lineWidth: 2,
      });
      (series as ISeriesApi<"Line">).setData(
        candles.map((c) => ({ time: toTime(c.time), value: c.close })),
      );
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (chartRef.current) chartRef.current.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, chartType, company?.color]);

  const last = candles[candles.length - 1];
  const first = candles[0];
  const change = last && first ? ((last.close - first.open) / first.open) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to index
      </Link>

      {isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="mt-10 text-sm text-destructive">Failed to load pricing.</p>}

      {company && (
        <>
          <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: company.color }}
                />
                <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs uppercase text-muted-foreground">
                  {id}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Tier-weighted blended token price · {models.length} tracked model
                {models.length === 1 ? "" : "s"} · basket weight{" "}
                {(company.weight * 100).toFixed(0)}%
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-border bg-card p-1 text-sm">
                {(["blended", "input", "output"] as Metric[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={
                      "rounded px-3 py-1 capitalize transition-colors " +
                      (metric === m
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="inline-flex rounded-md border border-border bg-card p-1 text-sm">
                {(["candles", "line"] as ChartType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartType(t)}
                    className={
                      "rounded px-3 py-1 capitalize transition-colors " +
                      (chartType === t
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {last && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Last close" value={`$${last.close.toFixed(3)}`} />
              <Stat
                label="Period high"
                value={`$${Math.max(...candles.map((c) => c.high)).toFixed(3)}`}
              />
              <Stat
                label="Period low"
                value={`$${Math.min(...candles.map((c) => c.low)).toFixed(3)}`}
              />
              <Stat
                label="Since launch"
                value={`${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
                tone={change < 0 ? "good" : "bad"}
              />
            </div>
          )}

          <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {chartType === "candles" ? "Monthly candles" : "Close history"} ·{" "}
                {metric} · $/Mtok (log)
              </h2>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                green = cheaper · red = more expensive
              </span>
            </div>
            <div ref={containerRef} className="mt-3 w-full" style={{ height: 460 }} />
            <p className="mt-3 text-xs text-muted-foreground">
              Open = previous month close. High/Low = dispersion across this
              provider's tracked model lineup that month. Close = tier-weighted
              blended price ($/Mtok).
            </p>
          </section>

          <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Models in this basket
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Model</th>
                    <th className="py-2 pr-4">Tier</th>
                    <th className="py-2 pr-4">Launched</th>
                    <th className="py-2 pr-4 text-right">Input</th>
                    <th className="py-2 pr-4 text-right">Output</th>
                    <th className="py-2 text-right">Latest blended</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => {
                    const latest = m.prices[m.prices.length - 1];
                    const launch = m.prices[0];
                    const blendedNow = 0.75 * latest.input + 0.25 * latest.output;
                    return (
                      <tr key={m.id} className="border-t border-border/60">
                        <td className="py-2 pr-4 font-medium">{m.label}</td>
                        <td className="py-2 pr-4 capitalize text-muted-foreground">
                          {m.tier}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {launch.date}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          ${latest.input.toFixed(2)}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          ${latest.output.toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-mono">
                          ${blendedNow.toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={
          "mt-1 font-mono text-xl font-semibold " +
          (tone === "good" ? "text-emerald-500" : tone === "bad" ? "text-rose-500" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}