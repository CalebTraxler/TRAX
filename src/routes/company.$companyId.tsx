import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  buildCompanyCandles,
  buildPayload,
  fetchPricing,
  type Metric,
} from "@/lib/trax";
import { CandlestickChart } from "@/components/CandlestickChart";
import { ChartPanel, StatCard, Delta, ChartSkeleton, StatRowSkeleton } from "@/components/trax-ui";

export const Route = createFileRoute("/company/$companyId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.companyId.toUpperCase()} — TRAX token cost history` },
      {
        name: "description",
        content: `Candlestick view of ${params.companyId}'s blended token cost over time, tracked by the TRAX index.`,
      },
    ],
  }),
  component: CompanyPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Unknown provider</h1>
      <p className="mt-2 text-sm text-muted-foreground">We don't track that provider yet.</p>
      <Link to="/dashboard" className="mt-6 inline-block text-sm font-medium" style={{ color: "var(--brand)" }}>
        ← Back to index
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">Failed to load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
});

const METRICS: Metric[] = ["blended", "input", "output"];

function CompanyPage() {
  const { companyId } = Route.useParams();
  const [metric, setMetric] = useState<Metric>("blended");
  const [logScale, setLogScale] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["pricing"], queryFn: fetchPricing, staleTime: 5 * 60_000 });

  const company = data?.companies[companyId];
  const candles = useMemo(() => (data ? buildCompanyCandles(data, companyId, metric) : []), [data, companyId, metric]);
  const payload = useMemo(() => (data ? buildPayload(data, metric) : null), [data, metric]);
  const models = useMemo(() => payload?.modelTable.filter((m) => m.companyId === companyId) ?? [], [payload, companyId]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <StatRowSkeleton />
        <div className="mt-6"><ChartSkeleton height={440} /></div>
      </div>
    );
  }
  if (error) {
    return <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-destructive">Failed to load pricing data.</div>;
  }
  if (!data || !company) throw notFound();

  const last = candles[candles.length - 1];
  const first = candles[0];
  const change = first && last ? +(((last.close - first.close) / first.close) * 100).toFixed(1) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Index
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: company.color }} />
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <span className="rounded border border-border px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{companyId}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tier-weighted basket · {metric} · <span className="font-mono text-foreground">${last?.close.toFixed(3) ?? "—"}/Mtok</span>
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-card p-1 text-sm">
          {METRICS.map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={"rounded px-3 py-1 capitalize transition-colors " + (metric === m ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Last" value={`$${last?.close.toFixed(3) ?? "—"}`} accent />
        <StatCard label="All-time" value={<Delta value={change} />} />
        <StatCard label="Tracked models" value={models.length} />
        <StatCard label="Index weight" value={`${(company.weight * 100).toFixed(0)}%`} />
      </div>

      <section className="mt-6">
        <ChartPanel
          title={company.name}
          badge="· Monthly · USD/Mtok"
          color={company.color}
          right={
            <span className="flex items-center gap-3">
              <Delta value={change} />
              <button
                onClick={() => setLogScale((v) => !v)}
                className="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {logScale ? "Log" : "Linear"}
              </button>
            </span>
          }
        >
          <CandlestickChart candles={candles} height={440} logScale={logScale} />
        </ChartPanel>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Models in basket</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Model</th>
                <th className="hidden py-2 pr-4 sm:table-cell">Tier</th>
                <th className="py-2 pr-4 text-right">Input</th>
                <th className="py-2 pr-4 text-right">Output</th>
                <th className="py-2 pr-4 text-right">Blended</th>
                <th className="py-2 pr-4 text-right">Δ launch</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-t border-border/50">
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2 font-medium">
                      {m.label}
                      {m.live && <span className="rounded-sm px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--up)", background: "color-mix(in oklch, var(--up) 14%, transparent)" }}>live</span>}
                    </span>
                  </td>
                  <td className="hidden py-2.5 pr-4 capitalize text-muted-foreground sm:table-cell">{m.tier}</td>
                  <td className="py-2.5 pr-4 text-right font-mono">${m.input.toFixed(2)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono">${m.output.toFixed(2)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono font-semibold">${m.blended.toFixed(2)}</td>
                  <td className="py-2.5 pr-4 text-right"><Delta value={m.changeSinceLaunch} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
