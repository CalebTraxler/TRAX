import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { buildPayload, fetchPricing, type ModelRow } from "@/lib/trax";
import { Delta, ErrorState } from "@/components/trax-ui";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Tracked Models — TRAX" },
      {
        name: "description",
        content:
          "All AI models tracked by TRAX with current input/output/blended prices and percent change since launch.",
      },
    ],
  }),
  component: ModelsPage,
});

type SortKey = "label" | "company" | "tier" | "input" | "output" | "blended" | "launched" | "changeSinceLaunch";

const TIER_ORDER = { flagship: 0, mid: 1, small: 2 } as const;

function ModelsPage() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "blended", dir: 1 });

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 180);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, error } = useQuery({ queryKey: ["pricing"], queryFn: fetchPricing, staleTime: 5 * 60_000 });
  const payload = useMemo(() => (data ? buildPayload(data, "blended") : null), [data]);

  const rows = useMemo(() => {
    if (!payload) return [];
    const filtered = payload.modelTable.filter((r) => {
      if (providerFilter !== "all" && r.companyId !== providerFilter) return false;
      if (qDebounced && !`${r.label} ${r.company}`.toLowerCase().includes(qDebounced.toLowerCase())) return false;
      return true;
    });
    const { key, dir } = sort;
    return [...filtered].sort((a, b) => {
      let x: number | string = a[key];
      let y: number | string = b[key];
      if (key === "tier") { x = TIER_ORDER[a.tier]; y = TIER_ORDER[b.tier]; }
      if (typeof x === "string") return (x as string).localeCompare(y as string) * dir;
      return ((x as number) - (y as number)) * dir;
    });
  }, [payload, providerFilter, qDebounced, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "label" || key === "company" ? 1 : 1 }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Tracked Models</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Current list price per million tokens. Blended = 0.75·input + 0.25·output.
      </p>

      {/* Controls */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search models or providers…"
              className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-[color:var(--brand)]/30"
            />
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {rows.length} model{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={providerFilter === "all"} onClick={() => setProviderFilter("all")}>All</Chip>
          {payload?.companies.map((c) => (
            <Chip key={c.id} active={providerFilter === c.id} onClick={() => setProviderFilter(c.id)} color={c.color}>
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      {error && <div className="mt-6"><ErrorState message={(error as Error).message} /></div>}

      {isLoading && !payload ? (
        <div className="mt-4 space-y-2 rounded-xl border border-border bg-card p-4">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th label="Model" k="label" sort={sort} onSort={toggleSort} />
                <Th label="Provider" k="company" sort={sort} onSort={toggleSort} />
                <Th label="Tier" k="tier" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
                <Th label="Input" k="input" sort={sort} onSort={toggleSort} align="right" />
                <Th label="Output" k="output" sort={sort} onSort={toggleSort} align="right" />
                <Th label="Blended" k="blended" sort={sort} onSort={toggleSort} align="right" />
                <Th label="Launched" k="launched" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
                <Th label="Δ launch" k="changeSinceLaunch" sort={sort} onSort={toggleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 font-medium">
                      {r.label}
                      {r.live && <span className="rounded-sm px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--up)", background: "color-mix(in oklch, var(--up) 14%, transparent)" }}>live</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                      {r.company}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    <TierBadge tier={r.tier} />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">${r.input.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">${r.output.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold">${r.blended.toFixed(2)}</td>
                  <td className="hidden px-3 py-2.5 text-muted-foreground md:table-cell">{r.launched}</td>
                  <td className="px-3 py-2.5 text-right"><Delta value={r.changeSinceLaunch} /></td>
                </tr>
              ))}
              {rows.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No models match those filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({
  label, k, sort, onSort, align = "left", className = "",
}: {
  label: string; k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; align?: "left" | "right"; className?: string;
}) {
  const active = sort.key === k;
  return (
    <th className={"px-3 py-2.5 font-medium " + (align === "right" ? "text-right" : "text-left") + " " + className}>
      <button onClick={() => onSort(k)} className={"inline-flex items-center gap-1 transition-colors hover:text-foreground " + (active ? "text-foreground" : "")}>
        {label}
        {active && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}

function TierBadge({ tier }: { tier: ModelRow["tier"] }) {
  return (
    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide capitalize text-muted-foreground">
      {tier}
    </span>
  );
}

function Chip({ active, onClick, color, children }: { active: boolean; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
        (active ? "border-brand bg-brand/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground")
      }
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}
