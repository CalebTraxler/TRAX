# TRAX — Real-Time AI Token Price Tracker

A web dashboard that tracks per-token list prices for the major AI providers,
charts how they've moved over time, and rolls them into a single weighted
**TRAX Cost Index** (think S&P 500, but for the price of a token).

![TRAX](https://img.shields.io/badge/index-cost%20tracker-2dd4bf)

## Run it

```bash
cd ~/trax
node server.js
# open http://localhost:4317
```

Zero dependencies — Node's built-in `http` module only. No `npm install`.

## What you get

- **TRAX Cost Index** — a base-100 index (Mar 2023 = 100) of blended token
  cost across OpenAI, Anthropic, Google, Meta, Mistral, xAI, DeepSeek & Cohere.
  It falls over time, which is the real story: inference cost has collapsed.
- **Per-provider basket prices** — tier-weighted $/Mtok per company on a log axis.
- **Live model table** — every tracked model's current input/output/blended price,
  sortable & filterable, with the % change since each model launched.
- **Live ticker + spot** — a 2s-polling spot value with simulated intraday
  microstructure around the real current index level.
- Toggle **Blended / Input / Output** and time ranges **All / 24M / 12M / 6M**.

## The index algorithm

```
blended(model)   = 0.75·input + 0.25·output        (typical usage mix, $/Mtok)
price(company)   = Σ wₜ·blended / Σ wₜ              (tier-weighted, active models)
V(t)             = Σ w_c·price(c) / Σ w_c           (provider-weighted)
TRAX(t)          = 100 · V(t) / V(base)
```

Tier weights: flagship 1.0, mid 0.7, small 0.4. Provider weights ≈ usage
prominence (OpenAI 0.30, Anthropic 0.22, Google 0.20, …). A model is "active"
from its first price point; its most-recent price (step function) is used at
each month — exactly how list pricing behaves.

## The data

All pricing lives in [`data/pricing.json`](data/pricing.json) as effective-dated
price points (`{ "date": "2024-05-13", "input": 5, "output": 15 }` = $5 in /
$15 out per million tokens from that date). Historical points are curated from
public provider announcements; add a model or a point and the server picks it up
on the next request (it re-reads the file each time).

### Live auto-refresh (OpenRouter)

The current price of each model auto-refreshes from the public
[OpenRouter models API](https://openrouter.ai/api/v1/models). 23 of the 45
tracked models carry an `or` slug (e.g. `"or": "openai/gpt-4o"`); the refresher
looks up the live per-token price, and when it differs from the latest stored
point it **appends a new point dated today** — so the index timeline grows with
real market data over time. Older/retired models (no live slug) keep their
curated history untouched.

```bash
npm run refresh          # pull live prices once, write data/pricing.json
GET /api/refresh         # same thing over HTTP, returns a JSON summary
```

The server also runs a refresh on startup and every `REFRESH_HOURS` (default 6).
Set `TRAX_NO_REFRESH=1` to disable, or click the ↻ button in the UI to pull on
demand. Refresh is best-effort: with no network, TRAX serves the last-known
prices and the server still starts.

## Caveats

Token list prices change on announcement, not by the second — there is no real
intraday market for tokens. The *LIVE* ticker simulates microstructure for feel;
the underlying index reflects published prices. TRAX is an analytics tool, not
financial advice or a tradable instrument.
