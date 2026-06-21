import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPayload, fetchPricing } from "@/lib/trax";

export function relTime(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

/** Shows when the underlying pricing data was last updated/refreshed. */
export function DataFreshness({ className = "" }: { className?: string }) {
  const { data } = useQuery({ queryKey: ["pricing"], queryFn: fetchPricing, staleTime: 5 * 60_000 });
  if (!data) return null;
  const meta = buildPayload(data, "blended").meta;
  return (
    <span className={"inline-flex items-center gap-1.5 text-xs text-muted-foreground " + className} title={meta.source ? `Source: ${meta.source}` : undefined}>
      <Clock className="h-3.5 w-3.5" />
      <span>
        Prices as of <span className="font-medium text-foreground/80">{meta.lastUpdated ?? "—"}</span>
        {meta.lastRefresh ? <> · snapshot refreshed {relTime(meta.lastRefresh)}</> : null}
      </span>
    </span>
  );
}

export function deltaColor(n: number): string {
  return n < -0.05 ? "var(--up)" : n > 0.05 ? "var(--down)" : "var(--muted-foreground)";
}

/** A signed percent, colored for a cost index (down = cheaper = good). */
export function Delta({ value, suffix = "%", className = "" }: { value: number; suffix?: string; className?: string }) {
  return (
    <span className={"font-mono font-medium " + className} style={{ color: deltaColor(value) }}>
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  delta,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: number;
  accent?: boolean;
}) {
  return (
    <Card className="gap-0 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className="mt-1.5 font-mono text-2xl font-semibold tracking-tight"
        style={accent ? { color: "var(--brand)" } : undefined}
      >
        {value}
      </div>
      {delta != null && (
        <div className="mt-1 text-xs">
          <Delta value={delta} />
        </div>
      )}
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

/** Terminal-style chart panel: a card with a header bar + a live dot. */
export function ChartPanel({
  title,
  badge,
  right,
  color = "var(--brand)",
  children,
}: {
  title: ReactNode;
  badge?: ReactNode;
  right?: ReactNode;
  color?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="truncate font-semibold text-foreground">{title}</span>
          {badge && <span className="truncate uppercase tracking-wider text-muted-foreground">{badge}</span>}
        </div>
        {right && <div className="shrink-0 font-mono text-[11px]">{right}</div>}
      </div>
      {children}
    </div>
  );
}

export function LivePill({ label = "Live", note }: { label?: string; note?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--up)]/40 bg-[color:var(--up)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--up)" }}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "var(--up)" }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "var(--up)" }} />
        </span>
        {label}
      </span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

export function ChartSkeleton({ height = 360 }: { height?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="p-4">
        <Skeleton className="w-full" style={{ height }} />
      </div>
    </div>
  );
}

export function StatRowSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <Card key={i} className="gap-0 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-7 w-24" />
        </Card>
      ))}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm font-medium text-destructive">Couldn't load pricing data</p>
      {message && <p className="mt-1 text-xs text-muted-foreground">{message}</p>}
    </Card>
  );
}
