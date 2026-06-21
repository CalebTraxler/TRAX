import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { buildPayload, fetchPricing } from "@/lib/trax";

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
  });
  const payload = data ? buildPayload(data, "blended") : null;
  const level = payload?.indexStats.level;
  const changeAll = payload?.indexStats.changeAllTime ?? 0;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="flex flex-col items-start gap-6">
            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              The S&amp;P 500 for tokens
            </span>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              The price of intelligence,{" "}
              <span className="text-teal-500">indexed</span>.
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
                View the index
              </Link>
              <Link
                to="/methodology"
                className="rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                How it's built
              </Link>
            </div>

            {payload && (
              <div className="mt-10 grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
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
            )}
          </div>
        </div>
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
