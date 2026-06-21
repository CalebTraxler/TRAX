import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { TrendingDown, Layers, Plug, Building2, ArrowRight } from "lucide-react";
import { buildPayload, fetchPricing } from "@/lib/trax";
import { TradingLineChart, type SeriesSpec } from "@/components/TradingLineChart";
import { ChartPanel, StatCard, Delta, ChartSkeleton, deltaColor } from "@/components/trax-ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TRAX — AI Token Cost Index" },
      {
        name: "description",
        content:
          "A real-time, weighted cost index for AI tokens across OpenAI, Anthropic, Google and more. Base March 2023 = 100.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useQuery({ queryKey: ["pricing"], queryFn: fetchPricing, staleTime: 5 * 60_000 });
  const payload = useMemo(() => (data ? buildPayload(data, "blended") : null), [data]);
  const level = payload?.indexStats.level;
  const changeAll = payload?.indexStats.changeAllTime ?? 0;

  const heroSeries: SeriesSpec[] = useMemo(() => {
    if (!payload) return [];
    return [{ id: "trax", name: "TRAX", color: "var(--brand)", emphasis: true, data: payload.months.map((x, i) => ({ x, y: payload.index[i] })) }];
  }, [payload]);

  const cheapest = useMemo(() => payload?.modelTable.slice(0, 8) ?? [], [payload]);
  const providers = useMemo(
    () => (payload ? [...payload.companies].sort((a, b) => (b.current ?? 0) - (a.current ?? 0)) : []),
    [payload],
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_-10%,color-mix(in_oklch,var(--brand)_16%,transparent),transparent)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "var(--brand)" }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "var(--brand)" }} />
              </span>
              The S&amp;P 500 for tokens
            </span>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              The price of intelligence,{" "}
              <span className="text-brand-gradient">indexed.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              TRAX is a weighted cost index that tracks per-token list prices for the major AI
              providers and rolls them into a single number. Lower means cheaper — and the line
              goes down a lot.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                View the index <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/methodology" className="rounded-md border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent">
                How it's built
              </Link>
            </div>
            <div className="mt-2 flex items-center gap-6">
              <div>
                <div className="font-mono text-3xl font-semibold">{level != null ? level.toFixed(2) : "—"}</div>
                <div className="text-xs text-muted-foreground">TRAX Index · base 100</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-semibold" style={{ color: deltaColor(changeAll) }}>
                  {changeAll > 0 ? "+" : ""}{changeAll}%
                </div>
                <div className="text-xs text-muted-foreground">since March 2023</div>
              </div>
            </div>
          </div>

          {payload ? (
            <ChartPanel
              title="TRAX"
              badge="· Base = 100"
              right={
                <span className="flex items-center gap-3">
                  <span className="text-foreground">{level?.toFixed(2) ?? "—"}</span>
                  <Delta value={changeAll} />
                </span>
              }
            >
              <TradingLineChart series={heroSeries} height={300} ariaLabel="TRAX index since 2023" />
            </ChartPanel>
          ) : (
            <ChartSkeleton height={300} />
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <StatCard label="TRAX Index" value={level != null ? level.toFixed(2) : "—"} sub={`Base ${payload?.meta.base ?? "—"} = 100`} accent />
          <StatCard label="Since inception" value={<Delta value={changeAll} />} sub="cost vs March 2023" />
          <StatCard label="Providers" value={payload?.companies.length ?? "—"} sub="tracked baskets" />
          <StatCard label="Models" value={payload?.modelTable.length ?? "—"} sub="priced monthly" />
          <StatCard
            label="Cheapest blended"
            value={cheapest[0] ? `$${cheapest[0].blended.toFixed(2)}` : "—"}
            sub={cheapest[0]?.label}
          />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: TrendingDown, title: "A real cost index", body: "Tier-weighted provider baskets, mixed by usage prominence and normalized to 100 at March 2023." },
            { icon: Layers, title: "Genuine OHLC candles", body: "Per-provider candlesticks built from intramonth repricing events — not synthetic noise." },
            { icon: Plug, title: "Live data", body: "Current prices stream from the database, with OpenRouter slugs mapping models to live rates." },
            { icon: Building2, title: "Provider baskets", body: "Drill into OpenAI, Anthropic, Google, Meta, DeepSeek and more as their own symbols." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-brand/40">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background" style={{ color: "var(--brand)" }}>
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Constituents */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Index constituents</h2>
          <Link to="/dashboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">All providers →</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {providers.map((c) => (
            <Link
              key={c.id}
              to="/company/$companyId"
              params={{ companyId: c.id }}
              className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand/50"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="truncate text-sm font-medium group-hover:text-foreground">{c.name}</span>
              </div>
              <div className="mt-2 font-mono text-lg font-semibold">${c.current?.toFixed(2) ?? "—"}</div>
              <div className="text-xs"><Delta value={c.allTimeChange} /> <span className="text-muted-foreground">all-time</span></div>
            </Link>
          ))}
        </div>
      </section>

      {/* Cheapest models */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Cheapest blended right now</h2>
          <Link to="/models" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Full screener →</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cheapest.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                <span className="truncate">{m.label}</span>
              </div>
              <div className="mt-2 font-mono text-lg font-semibold">
                ${m.blended.toFixed(3)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">/Mtok</span>
              </div>
              <div className="text-xs text-muted-foreground">{m.company} · in ${m.input.toFixed(2)} / out ${m.output.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Explore the full terminal</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Candlesticks, crosshair, provider baskets, log scale, and a live model screener.
          </p>
          <Link to="/dashboard" className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Open the index <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
