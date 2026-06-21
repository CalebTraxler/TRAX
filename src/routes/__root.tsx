import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Logo, LogoMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DataFreshness } from "@/components/trax-ui";
import { buildPayload, fetchPricing } from "@/lib/trax";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 w-fit"><LogoMark size={48} /></div>
        <h1 className="text-7xl font-extrabold tracking-tight">404</h1>
        <h2 className="mt-3 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const NO_FLASH = `(function(){try{var t=localStorage.getItem('trax-theme')||'dark';var d=document.documentElement;d.classList.toggle('dark',t!=='light');d.style.colorScheme=t;}catch(e){}})();`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TRAX — AI Token Cost Index" },
      {
        name: "description",
        content:
          "TRAX is a real-time cost index for the major AI providers. Think S&P 500, but for the price of a token.",
      },
      { name: "theme-color", content: "#0e1116" },
      { name: "author", content: "TRAX" },
      { property: "og:title", content: "TRAX — AI Token Cost Index" },
      {
        property: "og:description",
        content:
          "Track how AI token prices have moved across OpenAI, Anthropic, Google, Meta, Mistral, xAI, DeepSeek and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "TRAX — AI Token Cost Index" },
      {
        name: "twitter:description",
        content: "A weighted cost index for AI tokens. The price of intelligence, indexed.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </QueryClientProvider>
  );
}

const NAV = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Index" },
  { to: "/models", label: "Models" },
  { to: "/methodology", label: "Methodology" },
  { to: "/about", label: "About" },
] as const;

function NavQuote() {
  const { data } = useQuery({ queryKey: ["pricing"], queryFn: fetchPricing, staleTime: 5 * 60_000 });
  if (!data) return null;
  const p = buildPayload(data, "blended");
  const lvl = p.indexStats.level;
  const chg = p.indexStats.changeAllTime;
  if (lvl == null) return null;
  return (
    <Link
      to="/dashboard"
      className="hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs transition-colors hover:border-brand/50 lg:inline-flex"
      title="TRAX Cost Index"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand shadow-[0_0_6px_var(--brand)]" />
      <span className="font-semibold text-foreground">TRX</span>
      <span className="text-foreground">{lvl.toFixed(2)}</span>
      <span style={{ color: chg < 0 ? "var(--up)" : "var(--down)" }}>
        {chg > 0 ? "+" : ""}
        {chg}%
      </span>
    </Link>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-0.5 text-sm md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 font-medium bg-accent text-accent-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NavQuote />
          <ThemeToggle />
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-border/70 bg-background px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "block rounded-md px-3 py-2 text-sm font-medium bg-accent text-accent-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              A weighted cost index for AI inference. The price of intelligence, indexed.
            </p>
          </div>
          <FootCol title="Explore" links={NAV.map((n) => ({ to: n.to, label: n.label }))} />
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a className="text-muted-foreground transition-colors hover:text-foreground" href="https://openrouter.ai/api/v1/models" target="_blank" rel="noreferrer">OpenRouter API</a>
              </li>
              <li>
                <Link to="/methodology" className="text-muted-foreground transition-colors hover:text-foreground">Methodology</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a className="text-muted-foreground transition-colors hover:text-foreground" href="https://github.com/CalebTraxler/TRAX" target="_blank" rel="noreferrer">GitHub repo</a>
              </li>
              <li className="text-muted-foreground">MIT License · © 2026 Caleb Traxler</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <strong className="font-semibold text-foreground/80">TRAX is an analytics tool</strong> — not financial advice or a tradable instrument. List prices change on announcement.
          </p>
          <DataFreshness />
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
