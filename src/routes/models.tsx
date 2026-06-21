import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildPayload, fetchPricing } from "@/lib/trax";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Tracked Models — TRAX" },
      {
        name: "description",
        content:
          "All AI models tracked by TRAX with current input/output/blended prices and percent change since launch.",
      },
      { property: "og:title", content: "Tracked Models — TRAX" },
      {
        property: "og:description",
        content:
          "Sortable list of every frontier and mid-tier AI model in the TRAX index.",
      },
    ],
  }),
  component: ModelsPage,
});

function ModelsPage() {
  const [q, setQ] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  const { data } = useQuery({ queryKey: ["pricing"], queryFn: fetchPricing });
  const payload = useMemo(() => (data ? buildPayload(data, "blended") : null), [data]);

  const rows = useMemo(() => {
    if (!payload) return [];
    return payload.modelTable.filter((r) => {
      if (providerFilter !== "all" && r.companyId !== providerFilter) return false;
      if (q && !`${r.label} ${r.company}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [payload, providerFilter, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Tracked Models</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Current list price per million tokens. Blended = 0.75·input + 0.25·output.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name or provider…"
          className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All providers</option>
          {payload?.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} model{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Provider</th>
              <th className="px-3 py-2 text-left">Tier</th>
              <th className="px-3 py-2 text-right">Input</th>
              <th className="px-3 py-2 text-right">Output</th>
              <th className="px-3 py-2 text-right">Blended</th>
              <th className="px-3 py-2 text-left">Launched</th>
              <th className="px-3 py-2 text-right">Δ since launch</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 font-medium">{r.label}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: r.color }}
                    />
                    {r.company}
                  </span>
                </td>
                <td className="px-3 py-2 capitalize text-muted-foreground">{r.tier}</td>
                <td className="px-3 py-2 text-right font-mono">${r.input.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">${r.output.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">${r.blended.toFixed(2)}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.launched}</td>
                <td
                  className={
                    "px-3 py-2 text-right font-mono " +
                    (r.changeSinceLaunch < 0
                      ? "text-emerald-500"
                      : r.changeSinceLaunch > 0
                        ? "text-rose-500"
                        : "text-muted-foreground")
                  }
                >
                  {r.changeSinceLaunch > 0 ? "+" : ""}
                  {r.changeSinceLaunch}%
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  No models match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}