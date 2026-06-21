import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildPayload, fetchPricing } from "@/lib/trax";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — TRAX" },
      {
        name: "description",
        content:
          "How the TRAX Cost Index is built: tier weights, provider weights, the blended price formula and the base-100 normalization.",
      },
    ],
  }),
  component: Methodology,
});

const TIERS = [
  { tier: "Flagship", weight: "1.0", note: "Frontier models (GPT-5, Claude Opus, Gemini Pro…)" },
  { tier: "Mid", weight: "0.7", note: "Workhorse models (Sonnet, Flash, 70B-class…)" },
  { tier: "Small", weight: "0.4", note: "Cheap/fast models (mini, nano, lite, Haiku…)" },
];

function Methodology() {
  const { data } = useQuery({ queryKey: ["pricing"], queryFn: fetchPricing, staleTime: 5 * 60_000 });
  const payload = useMemo(() => (data ? buildPayload(data, "blended") : null), [data]);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
      <p className="mt-2 text-muted-foreground">
        TRAX is a <strong className="text-foreground">cost index</strong>. Lower means cheaper. The
        decline since 2023 is the whole point.
      </p>

      <Section title="Formula">
        <pre className="overflow-x-auto rounded-lg border border-border bg-[color:var(--chart-bg)] p-4 font-mono text-xs leading-relaxed text-foreground">{`blended(model)  = 0.75·input + 0.25·output      (typical usage mix, $/Mtok)
price(company)  = Σ wₜ·blended / Σ wₜ            (tier-weighted, active models)
V(t)            = Σ w_c·price(c) / Σ w_c         (provider-weighted)
TRAX(t)         = 100 · V(t) / V(base)`}</pre>
      </Section>

      <Section title="Tier weights">
        <p className="mb-3 text-sm text-muted-foreground">Each model contributes to its provider's basket by tier:</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">Tier</th><th className="px-3 py-2">Weight</th><th className="px-3 py-2">Examples</th></tr>
            </thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.tier} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{t.tier}</td>
                  <td className="px-3 py-2 font-mono">{t.weight}</td>
                  <td className="px-3 py-2 text-muted-foreground">{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Provider weights">
        <p className="mb-3 text-sm text-muted-foreground">
          Providers are mixed by approximate usage prominence. These are editorial weights — change the
          data and the index re-weights automatically. Current constituents:
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">Provider</th><th className="px-3 py-2 text-right">Weight</th><th className="px-3 py-2 text-right">Models</th></tr>
            </thead>
            <tbody>
              {(payload?.companies ?? []).map((c) => (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{(c.weight * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{c.models}</td>
                </tr>
              ))}
              {!payload && <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Loading weights…</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title='What "active" means'>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A model is active from its first price point onward; its most recent price as of month{" "}
          <em className="text-foreground">t</em> is used (a step function). That's how list pricing actually
          behaves — prices change on announcement, not by the second.
        </p>
      </Section>

      <Section title="Base & normalization">
        <p className="text-sm leading-relaxed text-muted-foreground">
          The base month is <strong className="text-foreground">March 2023 = 100</strong>. Every later month is
          expressed relative to that base, so the index reads as a percentage of the original cost of intelligence.
        </p>
      </Section>

      <Section title="Caveats">
        <p className="text-sm leading-relaxed text-muted-foreground">
          TRAX is an analytics tool, not financial advice or a tradable instrument. There is no real intraday
          market for tokens — published list prices are the source of truth.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
