import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { buildPayload, fetchPricing } from "@/lib/trax";
import { TradingLineChart, type SeriesSpec } from "@/components/TradingLineChart";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TRAX — AI Token Cost Index" },
      {
        name: "description",
        content:
          "A real-time, weighted cost index for AI tokens across OpenAI, Anthropic, Google and more. Base March 2023 = 100.",
      },
      { property: "og:title", content: "TRAX — AI Token Cost Index" },
      {
        property: "og:description",
        content:
          "Track how the per-token list price of frontier AI has collapsed since 2023.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useQuery({
    queryKey: ["pricing"],
    queryFn: fetchPricing,
    staleTime: 5 * 60_000,
  });
  const payload = useMemo(
    () => (data ? buildPayload(data, "blended") : null),
    [data],
  );
  const level = payload?.indexStats.level;
  const changeAll = payload?.indexStats.changeAllTime ?? 0;

  const heroSeries: SeriesSpec[] = useMemo(() => {
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

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
              </span>
              The S&amp;P 500 for tokens
            </span>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              The price of intelligence,{" "}
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                indexed
              </span>
              .
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              TRAX is a weighted cost index that tracks per-token list prices for the
              major AI providers and rolls them into a single number. Lower means
              cheaper — and the line goes down a lot.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                View the index →
              </Link>
              <Link
                to="/methodology"
                className="rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                How it's built
              </Link>
            </div>
          </div>

          {payload && (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1220] shadow-2xl shadow-teal-500/5">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                  <span className="font-semibold text-slate-100">TRAX</span>
                  <span className="uppercase tracking-wider">· Base = 100</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-slate-100">
                    {level?.toFixed(2) ?? "—"}
                  </span>
                  <span
                    className={
                      changeAll < 0 ? "text-emerald-400" : "text-rose-400"
                    }
                  >
                    {changeAll > 0 ? "+" : ""}
                    {changeAll}%
                  </span>
                </div>
              </div>
              <TradingLineChart series={heroSeries} height={280} />
            </div>
          )}
        </div>

        {payload && (
          <div className="mx-auto max-w-6xl px-4 pb-14">
            <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="TRAX Index"
                value={level != null ? level.toFixed(2) : "—"}
                hint={`Base ${payload.meta.base} = 100`}
              />
              <Stat
                label="Since inception"
                value={`${changeAll > 0 ? "+" : ""}${changeAll}%`}
                tone={changeAll < 0 ? "good" : "bad"}
              />
              <Stat
                label="Providers tracked"
                value={String(payload.companies.length)}
              />
              <Stat
                label="Models tracked"
                value={String(payload.modelTable.length)}
              />
            </div>
          </div>
        )}
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Tier-weighted basket",
              body: "Flagship, mid and small models are combined into a per-provider basket, then mixed by usage prominence.",
            },
            {
              title: "Real history",
              body: "Curated effective-dated price points back to GPT-3.5 in March 2023. The index is a step function over real announcements.",
            },
            {
              title: "Live refresh",
              body: "Current prices are sourced from public provider pricing and refreshed periodically — no synthetic noise in the published numbers.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <h3 className="text-base font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={
          "mt-1 font-mono text-2xl font-semibold " +
          (tone === "good"
            ? "text-emerald-500"
            : tone === "bad"
              ? "text-rose-500"
              : "")
        }
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
