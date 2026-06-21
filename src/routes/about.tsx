import { createFileRoute, Link } from "@tanstack/react-router";
import { Github, Database, Scale, GitPullRequest } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — TRAX" },
      {
        name: "description",
        content:
          "About TRAX: a real-time cost index for AI tokens, originally built by Caleb Traxler.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-3">
        <LogoMark size={44} />
        <h1 className="text-3xl font-bold tracking-tight">About TRAX</h1>
      </div>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
        The single most important number in the AI economy — the price of a token — has no headline
        ticker. Frontier inference cost has collapsed by orders of magnitude since 2023, and that fact
        deserves to be on a chart anyone can point at. <span className="text-foreground">That's TRAX.</span>
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card icon={Github} title="Credits">
          The core data model and index algorithm were created by{" "}
          <a className="font-medium underline-offset-2 hover:underline" style={{ color: "var(--brand)" }} href="https://github.com/CalebTraxler/TRAX" target="_blank" rel="noreferrer">Caleb Traxler</a>{" "}
          and released under the MIT license. This site is a redesigned, expanded build.
        </Card>
        <Card icon={Database} title="Data">
          Prices are served from a database with a bundled JSON snapshot fallback. Models carry
          OpenRouter slugs so current rates can be refreshed from a live API.
        </Card>
        <Card icon={GitPullRequest} title="Contributing">
          Pricing lives in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">public/data/pricing.json</code>.
          Add a model or an effective-dated price point and the index picks it up automatically.
        </Card>
        <Card icon={Scale} title="License & disclaimer">
          MIT licensed. TRAX is an analytics tool — not financial advice or a tradable instrument.
        </Card>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/dashboard" className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">View the index</Link>
        <Link to="/methodology" className="rounded-md border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent">Read the methodology</Link>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: typeof Github; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background" style={{ color: "var(--brand)" }}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h2 className="mt-3 text-sm font-semibold">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
