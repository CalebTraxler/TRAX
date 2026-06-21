import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — TRAX" },
      {
        name: "description",
        content:
          "About TRAX: a real-time cost index for AI tokens, originally built by Caleb Traxler.",
      },
      { property: "og:title", content: "About — TRAX" },
      {
        property: "og:description",
        content:
          "Why TRAX exists, who built it and how to contribute new models or pricing points.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">About TRAX</h1>
      <p className="mt-4 text-muted-foreground">
        TRAX exists because the single most important number in the AI economy —
        the price of a token — has no headline ticker. Frontier inference cost
        has collapsed by orders of magnitude since 2023, and that fact deserves
        to be on a chart that anyone can point at.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Credits</h2>
      <p className="mt-2 text-muted-foreground">
        The core data model and index algorithm were created by{" "}
        <a
          className="underline hover:text-foreground"
          href="https://github.com/CalebTraxler/TRAX"
          target="_blank"
          rel="noreferrer"
        >
          Caleb Traxler
        </a>{" "}
        and released under the MIT license. This site is a re-skinned port with
        extra models added.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Contributing</h2>
      <p className="mt-2 text-muted-foreground">
        All pricing lives in{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          public/data/pricing.json
        </code>
        . Each model carries an array of effective-dated price points. Add a
        model or a new point and the index picks it up on the next load.
      </p>

      <h2 className="mt-10 text-xl font-semibold">License</h2>
      <p className="mt-2 text-muted-foreground">
        MIT. See the LICENSE file at the project root.
      </p>
    </article>
  );
}