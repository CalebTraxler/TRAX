import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  buildCompanyCandles,
  buildPayload,
  fetchPricing,
  type Metric,
} from "@/lib/trax";
import { CandlestickChart } from "@/components/CandlestickChart";

export const Route = createFileRoute("/company/$companyId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.companyId.toUpperCase()} — TRAX token cost history` },
      {
        name: "description",
        content: `Candlestick view of ${params.companyId}'s blended token cost over time, tracked by the TRAX index.`,
      },
      {
        property: "og:title",
        content: `${params.companyId.toUpperCase()} — TRAX token cost history`,
      },
    ],
  }),
  component: CompanyPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Unknown provider</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We don't track that provider yet.
      </p>
      <Link to="/dashboard" className="mt-6 inline-block text-sm underline">
        Back to index
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

function CompanyPage() {
  const { companyId } = Route.useParams();
  const [metric, setMetric] = useState<Metric>("blended");
  const { data, isLoading, error } = useQuery({
    queryKey: ["pricing"],
    queryFn: fetchPricing,
  });

  const company = data?.companies[companyId];
  const candles = useMemo(
    () => (data ? buildCompanyCandles(data, companyId, metric) : []),
    [data, companyId, metric],
  );
  const payload = useMemo(
    () => (data ? buildPayload(data, metric) : null),
    [data, metric],
  );
  const models = useMemo(
    () => payload?.modelTable.filter((m) => m.companyId === companyId) ?? [],
    [payload, companyId],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-destructive">
        Failed to load pricing data.
      </div>
    );
  }
  if (!data || !company) {
    throw notFound();
  }

  const last = candles[candles.length - 1];
  const first = candles[0];
  const change =
    first && last ? ((last.close - first.close) / first.close) * 100 : 0;
  const up = last && first ? last.close >= first.close : false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 text-xs text-muted-foreground">
        <Link to="/dashboard" className="underline hover:text-foreground">
          ← Index
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: company.color }}
            />
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <span className="rounded border border-border px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              {companyId}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tier-weighted basket price · {metric} ·{" "}
            <span className="font-mono">
              ${last?.close.toFixed(3) ?? "—"}/Mtok
            </span>
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

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Last" value={`$${last?.close.toFixed(3) ?? "—"}`} />
        <Tile
          label="All-time"
          value={`${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}
          tone={change < 0 ? "good" : "bad"}
        />
        <Tile label="Tracked models" value={`${models.length}`} />
        <Tile
          label="Index weight"
          value={`${(company.weight * 100).toFixed(0)}%`}
        />
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-[#0b1220]">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: company.color }}
            />
            <span className="font-semibold text-slate-200">
              {company.name}
            </span>
            <span className="uppercase tracking-wider">· Monthly · USD/Mtok</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-slate-500">Δ</span>
            <span className={up ? "text-emerald-400" : "text-rose-400"}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          </div>
        </div>
        <CandlestickChart candles={candles} height={440} />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Models in basket
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Tier</th>
                <th className="py-2 pr-4 text-right">Input</th>
                <th className="py-2 pr-4 text-right">Output</th>
                <th className="py-2 pr-4 text-right">Blended</th>
                <th className="py-2 pr-4 text-right">Δ since launch</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-t border-border/50">
                  <td className="py-2 pr-4 font-medium">{m.label}</td>
                  <td className="py-2 pr-4 capitalize text-muted-foreground">
                    {m.tier}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono">
                    ${m.input.toFixed(2)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono">
                    ${m.output.toFixed(2)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono">
                    ${m.blended.toFixed(2)}
                  </td>
                  <td
                    className={
                      "py-2 pr-4 text-right font-mono " +
                      (m.changeSinceLaunch < 0
                        ? "text-emerald-500"
                        : "text-rose-500")
                    }
                  >
                    {m.changeSinceLaunch > 0 ? "+" : ""}
                    {m.changeSinceLaunch}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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