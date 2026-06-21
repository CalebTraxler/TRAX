import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildPayload, fetchPricing, type Metric } from "@/lib/trax";
import { TradingLineChart, type SeriesSpec } from "@/components/TradingLineChart";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "TRAX Index — Live Dashboard" },
      {
        name: "description",
        content:
          "The TRAX Cost Index, per-provider baskets and intra-month repricing events for the major AI providers.",
      },
      { property: "og:title", content: "TRAX Index — Live Dashboard" },
      {
        property: "og:description",
        content:
          "Watch the weighted cost of AI tokens fall across all major providers over time.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [metric, setMetric] = useState<Metric>("blended");
  const [logScale, setLogScale] = useState(true);
  const { data, isLoading, error } = useQuery({
    queryKey: ["pricing"],
    queryFn: fetchPricing,
    staleTime: 5 * 60_000,
  });

  const payload = useMemo(
    () => (data ? buildPayload(data, metric) : null),
    [data, metric],
  );

  const indexSeries: SeriesSpec[] = useMemo(() => {
    if (!payload) return [];
    return [
      {
        id: "trax",
        name: "TRAX",
        color: "#2dd4bf",
        emphasis: true,
        data: payload.months.map((x, i) => ({ x, y: payload.index[i] })),
      },
    ];
  }, [payload]);

  const providerSeries: SeriesSpec[] = useMemo(() => {
    if (!payload) return [];
    return payload.companies.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      data: payload.months.map((x, i) => ({ x, y: c.series[i] })),
    }));
  }, [payload]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
            <span className="text-xs text-muted-foreground">
              Streaming from Lovable Cloud
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">TRAX Cost Index</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Base {payload?.meta.base ?? "—"} = 100 · As of {payload?.meta.asOf ?? "—"}
          </p>
        </div>
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
      </header>

      {isLoading && (
        <p className="mt-10 text-sm text-muted-foreground">Loading pricing…</p>
      )}
      {error && (
        <p className="mt-10 text-sm text-destructive">Failed to load pricing data.</p>
      )}

      {payload && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile
              label="Index level"
              value={payload.indexStats.level?.toFixed(2) ?? "—"}
            />
            <Tile
              label="All-time change"
              value={`${payload.indexStats.changeAllTime}%`}
              tone={payload.indexStats.changeAllTime < 0 ? "good" : "bad"}
            />
            <Tile
              label="YoY change"
              value={`${payload.indexStats.changeYoY}%`}
              tone={payload.indexStats.changeYoY < 0 ? "good" : "bad"}
            />
            <Tile
              label="High / Low"
              value={`${payload.indexStats.high.toFixed(0)} / ${payload.indexStats.low.toFixed(0)}`}
            />
          </div>

          <section className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-[#0b1220]">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                <span className="font-semibold text-slate-100">TRAX</span>
                <span className="uppercase tracking-wider">· Index · Base = 100</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-slate-500">Last</span>
                <span className="text-slate-100">
                  {payload.indexStats.level?.toFixed(2) ?? "—"}
                </span>
                <span
                  className={
                    payload.indexStats.changeAllTime < 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  {payload.indexStats.changeAllTime > 0 ? "+" : ""}
                  {payload.indexStats.changeAllTime}%
                </span>
              </div>
            </div>
            <TradingLineChart series={indexSeries} height={360} />
          </section>

          <section className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-[#0b1220]">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-100">Provider baskets</span>
                <span className="uppercase tracking-wider">· $/Mtok</span>
              </div>
              <button
                onClick={() => setLogScale((v) => !v)}
                className="rounded border border-slate-700 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 hover:bg-slate-800"
              >
                {logScale ? "Log" : "Linear"}
              </button>
            </div>
            <TradingLineChart
              series={providerSeries}
              height={400}
              logScale={logScale}
              yFormat={(v) => `$${v < 1 ? v.toFixed(2) : v.toFixed(1)}`}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-800 px-4 py-2 text-[11px]">
              {payload.companies.map((c) => (
                <Link
                  key={c.id}
                  to="/company/$companyId"
                  params={{ companyId: c.id }}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-white"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Providers
              </h2>
              <span className="text-[11px] text-muted-foreground">
                Click a card for candlesticks
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {payload.companies.map((c) => (
                <Link
                  key={c.id}
                  to="/company/$companyId"
                  params={{ companyId: c.id }}
                  className="group rounded-lg border border-border bg-background p-3 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span className="font-medium group-hover:underline">{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      w {(c.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-2 font-mono text-lg">
                    ${c.current?.toFixed(2) ?? "—"}
                    <span className="ml-1 text-xs text-muted-foreground">/Mtok</span>
                  </div>
                  <div
                    className={
                      "text-xs " +
                      (c.allTimeChange < 0 ? "text-emerald-500" : "text-rose-500")
                    }
                  >
                    {c.allTimeChange > 0 ? "+" : ""}
                    {c.allTimeChange}% since launch
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
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

function Tile({
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
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
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