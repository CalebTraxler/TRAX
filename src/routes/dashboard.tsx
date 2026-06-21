import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { buildPayload, fetchPricing, type Metric } from "@/lib/trax";

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
  const { data, isLoading, error } = useQuery({
    queryKey: ["pricing"],
    queryFn: fetchPricing,
  });

  const payload = useMemo(
    () => (data ? buildPayload(data, metric) : null),
    [data, metric],
  );

  const chartData = useMemo(() => {
    if (!payload) return [];
    return payload.months.map((m, i) => {
      const row: Record<string, number | string | null> = {
        month: m,
        TRAX: payload.index[i],
      };
      for (const c of payload.companies) row[c.name] = c.series[i];
      return row;
    });
  }, [payload]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TRAX Cost Index</h1>
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
            <Tile label="High / Low" value={`${payload.indexStats.high.toFixed(0)} / ${payload.indexStats.low.toFixed(0)}`} />
          </div>

          <section className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              TRAX Index
            </h2>
            <div className="mt-3 h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border) / 0.5)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} minTickGap={32} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="TRAX"
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Provider baskets ($/Mtok, log scale)
            </h2>
            <div className="mt-3 h-80 w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border) / 0.5)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} minTickGap={32} />
                  <YAxis tick={{ fontSize: 11 }} scale="log" domain={["auto", "auto"]} allowDataOverflow />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {payload.companies.map((c) => (
                    <Line
                      key={c.id}
                      type="monotone"
                      dataKey={c.name}
                      stroke={c.color}
                      strokeWidth={1.75}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Providers
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {payload.companies.map((c) => (
                <Link
                  key={c.id}
                  to="/company/$companyId"
                  params={{ companyId: c.id }}
                  className="group rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/60 hover:bg-accent/50"
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