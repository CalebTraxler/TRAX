import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — TRAX" },
      {
        name: "description",
        content:
          "How the TRAX Cost Index is built: tier weights, provider weights, the blended price formula and the base-100 normalization.",
      },
      { property: "og:title", content: "Methodology — TRAX" },
      {
        property: "og:description",
        content:
          "The math behind the TRAX index and the assumptions you should know before reading the line.",
      },
    ],
  }),
  component: Methodology,
});

function Methodology() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
      <p className="mt-2 text-muted-foreground">
        TRAX is a cost index. Lower means cheaper. The decline since 2023 is the
        whole point.
      </p>

      <Section title="Formula">
        <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 text-xs leading-relaxed">{`blended(model)  = 0.75·input + 0.25·output      (typical usage mix, $/Mtok)
price(company)  = Σ wₜ·blended / Σ wₜ            (tier-weighted, active models)
V(t)            = Σ w_c·price(c) / Σ w_c         (provider-weighted)
TRAX(t)         = 100 · V(t) / V(base)`}</pre>
      </Section>

      <Section title="Tier weights">
        <ul className="list-disc pl-6 text-sm text-muted-foreground">
          <li>Flagship: 1.0</li>
          <li>Mid: 0.7</li>
          <li>Small: 0.4</li>
        </ul>
      </Section>

      <Section title="Provider weights">
        <p className="text-sm text-muted-foreground">
          Approximate usage prominence: OpenAI 0.30, Anthropic 0.22, Google 0.20,
          Meta 0.08, Mistral / xAI / DeepSeek / Cohere 0.05 each. These are
          editorial weights — adjust the data file to re-weight the index.
        </p>
      </Section>

      <Section title="What &quot;active&quot; means">
        <p className="text-sm text-muted-foreground">
          A model is active from its first price point onward; its most recent
          price as of month <em>t</em> is used (step function). That's how list
          pricing actually behaves — prices change on announcement, not by the
          second.
        </p>
      </Section>

      <Section title="Base">
        <p className="text-sm text-muted-foreground">
          Base month is March 2023, set to 100. Every later month is expressed
          relative to that base.
        </p>
      </Section>

      <Section title="Caveats">
        <p className="text-sm text-muted-foreground">
          TRAX is an analytics tool, not financial advice or a tradable
          instrument. There is no real intraday market for tokens — published
          list prices are the source of truth.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}