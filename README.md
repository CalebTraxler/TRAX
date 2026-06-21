<div align="center">

# TRAX — The AI Token Cost Index

**The price of intelligence, indexed.**

A real-time, weighted **cost index** for AI tokens — think the S&P 500, but for the
price of a token. TRAX tracks per-token list prices across every major provider and
rolls them into a single number you can chart. The line goes down a *lot*.

![Stack](https://img.shields.io/badge/React-19-149eca)
![TanStack](https://img.shields.io/badge/TanStack_Start-1.x-ff4154)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![License](https://img.shields.io/badge/license-MIT-2dd4bf)

</div>

> **TRAX is an analytics tool — not financial advice or a tradable instrument.**
> There is no token futures market; list prices change on announcement, not by the second.

---

## What it does

- **TRAX Cost Index** — a tier- and provider-weighted blend of published token prices,
  normalized to **100 at March 2023**. Lower = cheaper.
- **Provider baskets** — drill into OpenAI, Anthropic, Google, Meta, Mistral, xAI,
  DeepSeek, Cohere, Alibaba, Amazon… each as its own candlestick symbol.
- **Model screener** — every tracked model with current input/output/blended prices,
  tier, launch date, and % change since launch. Sortable, searchable, filterable.
- **Dark-first terminal UI** with a light-mode toggle, live index quote in the nav,
  interactive charts (crosshair, legend toggle, log scale), and full mobile support.
- **Always know what you're looking at** — a *"Prices as of …"* freshness stamp in the
  header and footer.

## The index, in four lines

```
blended(model)  = 0.75·input + 0.25·output      (typical usage mix, $/Mtok)
price(company)  = Σ wₜ·blended / Σ wₜ            (tier-weighted, active models)
V(t)            = Σ w_c·price(c) / Σ w_c         (provider-weighted)
TRAX(t)         = 100 · V(t) / V(base)
```

Tier weights: flagship `1.0`, mid `0.7`, small `0.4`. Provider weights approximate usage
prominence. A model is *active* from its first price point; its most recent price as of a
given month is used (a step function — exactly how list pricing behaves). See the in-app
[Methodology](src/routes/methodology.tsx) page for the live weights table.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React 19 + [TanStack Start](https://tanstack.com/start) (SSR) + Vite |
| Routing / data | TanStack Router + TanStack Query |
| Styling | Tailwind CSS v4 + shadcn/ui, custom dark-first design tokens |
| Charts | Hand-built SVG candlestick & line charts (token-themed, no chart lib) |
| Data | Supabase (Postgres) with a bundled JSON snapshot fallback |

## Getting started

> Requires **Node 20.19+ or 22.12+** (Vite 8).

```bash
# install (bun recommended; npm also works)
bun install            # or: npm install

# configure data source (optional — see below)
cp .env.example .env   # fill in your Supabase keys

# run
bun run dev            # http://localhost:5173
```

Other scripts: `bun run build`, `bun run preview`, `bun run lint`, `bun run refresh`.

### Data source

Pricing is read from **Supabase** when `VITE_SUPABASE_*` env vars are present. If they're
missing or unreachable, TRAX automatically falls back to the bundled snapshot at
[`public/data/pricing.json`](public/data/pricing.json) — so the app renders **real data
with no secrets**, which is also how local dev and CI work out of the box.

Each model carries effective-dated price points and an optional OpenRouter `or` slug:

```json
{
  "id": "gpt-4o", "company": "openai", "label": "GPT-4o", "tier": "flagship",
  "or": "openai/gpt-4o",
  "prices": [{ "date": "2024-05-13", "input": 5, "output": 15 }]
}
```

## Automated price refresh

Current prices auto-update from the public
[OpenRouter models API](https://openrouter.ai/api/v1/models), which aggregates live
provider pricing.

```bash
bun run refresh        # pull live prices, append dated points when they changed
```

[`.github/workflows/refresh-pricing.yml`](.github/workflows/refresh-pricing.yml) runs this
daily (and on demand) and commits `public/data/pricing.json` only when something actually
moved — so the index timeline grows with real market data over time. Models without an
`or` slug keep their curated history untouched.

## Project structure

```
src/
  routes/            # pages: index, dashboard, models, company.$companyId, methodology, about
  components/
    Logo.tsx           # SVG candlestick-monogram brand mark
    TradingLineChart.tsx, CandlestickChart.tsx
    trax-ui.tsx        # StatCard, ChartPanel, Delta, DataFreshness, skeletons
    ThemeToggle.tsx
    ui/                # shadcn primitives
  lib/trax.ts        # index + candle algorithms, types, data fetching
  styles.css         # Tailwind v4 theme + design tokens
public/data/pricing.json   # bundled dataset / fallback
scripts/refresh-pricing.mjs
```

## Credits & license

The core data model and index algorithm were created by
[Caleb Traxler](https://github.com/CalebTraxler/TRAX). Released under the **MIT License**.
