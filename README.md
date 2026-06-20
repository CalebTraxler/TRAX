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

All pricing lives in [`lib/trax.js`](lib/trax.js) as effective-dated price
points (`p('2024-05-13', 5, 15)` = $5 in / $15 out per million tokens from that
date). Numbers are curated from public provider announcements and are
approximate — edit the `MODELS` array to refine or extend. Add a model, add a
price point, restart the server, done.

## Caveats

Token list prices change on announcement, not by the second — there is no real
intraday market for tokens. The *LIVE* ticker simulates microstructure for feel;
the underlying index reflects published prices. TRAX is an analytics tool, not
financial advice or a tradable instrument.
