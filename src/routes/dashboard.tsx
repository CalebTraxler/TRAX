import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildPayload, fetchPricing, type Metric } from "@/lib/trax";
import { TradingLineChart, type SeriesSpec } from "@/components/TradingLineChart";
import {
  ChartPanel,
  StatCard,
  Delta,
  LivePill,
  ChartSkeleton,
  StatRowSkeleton,
  ErrorState,
  DataFreshness,
} from "@/components/trax-ui";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "TRAX Index — Live Dashboard" },
      {
        name: "description",
        content:
          "The TRAX Cost Index, per-provider baskets and intra-month repricing events for the major AI providers.",
      },
    ],
  }),
  component: Dashboard,
});

const METRICS: Metric[] = ["blended", "input", "output"];

function Dashboard() {
  const [metric, setMetric] = useState<Metric>("blended");
  const [logScale, setLogScale] = useState(true);
  const { data, isLoading, error } = useQuery({ queryKey: ["pricing"], queryFn: fetchPricing, staleTime: 5 * 60_000 });

  const payload = useMemo(() => (data ? buildPayload(data, metric) : null), [data, metric]);

  const indexSeries: SeriesSpec[] = useMemo(() => {
    if (!payload) return [];
    return [{ id: "trax", name: "TRAX", color: "var(--brand)", emphasis: true, data: payload.months.map((x, i) => ({ x, y: payload.index[i] })) }];
  }, [payload]);

  const providerSeries: SeriesSpec[] = useMemo(() => {
    if (!payload) return [];
    return payload.companies.map((c) => ({ id: c.id, name: c.name, color: c.color, data: payload.months.map((x, i) => ({ x, y: c.series[i] })) }));
  }, [payload]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <LivePill note="Streaming from the pricing database" />
          <h1 className="mt-2 text-3xl font-bold tracking-tight">TRAX Cost Index</h1>
          <p className="mt-1 text-sm text-muted-foreground">Base {payload?.meta.base ?? "—"} = 100 · As of {payload?.meta.asOf ?? "—"}</p>
          <div className="mt-2"><DataFreshness /></div>
        </div>
        <div className="inline-flex rounded-md border border-border bg-card p-1 text-sm">
          {METRICS.map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={
                "rounded px-3 py-1 capitalize transition-colors " +
                (metric === m ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      {error && <div className="mt-8"><ErrorState message={(error as Error).message} /></div>}

      {isLoading && !payload && (
        <div className="mt-6 space-y-6">
          <StatRowSkeleton />
          <ChartSkeleton height={360} />
        </div>
      )}

      {payload && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Index level" value={payload.indexStats.level?.toFixed(2) ?? "—"} accent />
            <StatCard label="All-time change" value={<Delta value={payload.indexStats.changeAllTime} />} />
            <StatCard label="YoY change" value={<Delta value={payload.indexStats.changeYoY} />} />
            <StatCard label="High / Low" value={`${payload.indexStats.high.toFixed(0)} / ${payload.indexStats.low.toFixed(0)}`} />
          </div>

          <section className="mt-8">
            <ChartPanel
              title="TRAX"
              badge="· Index · Base = 100"
              right={
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground">Last</span>
                  <span className="text-foreground">{payload.indexStats.level?.toFixed(2) ?? "—"}</span>
                  <Delta value={payload.indexStats.changeAllTime} />
                </span>
              }
            >
              <TradingLineChart series={indexSeries} height={360} ariaLabel="TRAX cost index" />
            </ChartPanel>
          </section>

          <section className="mt-6">
            <ChartPanel
              title="Provider baskets"
              badge="· $/Mtok"
              right={
                <button
                  onClick={() => setLogScale((v) => !v)}
                  className="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {logScale ? "Log" : "Linear"}
                </button>
              }
            >
              <TradingLineChart
                series={providerSeries}
                height={400}
                logScale={logScale}
                interactiveLegend
                yFormat={(v) => `$${v < 1 ? v.toFixed(2) : v.toFixed(1)}`}
                ariaLabel="Per-provider basket prices"
              />
            </ChartPanel>
          </section>

          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Providers</h2>
              <span className="text-[11px] text-muted-foreground">Click a card for candlesticks</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {payload.companies.map((c) => (
                <Link
                  key={c.id}
                  to="/company/$companyId"
                  params={{ companyId: c.id }}
                  className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">w {(c.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-2 font-mono text-lg font-semibold">
                    ${c.current?.toFixed(2) ?? "—"}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">/Mtok</span>
                  </div>
                  <div className="text-xs"><Delta value={c.allTimeChange} /> <span className="text-muted-foreground">since launch</span></div>
                  <div className="mt-2 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    View candles →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
