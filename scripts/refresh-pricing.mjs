#!/usr/bin/env node
/**
 * Refresh public/data/pricing.json from the public OpenRouter models API.
 *
 * OpenRouter aggregates live per-token pricing for the major providers. For each
 * tracked model that carries an `or` slug (e.g. "openai/gpt-4o"), we read the
 * current input/output rate and, when it differs from the latest stored point,
 * append a new effective-dated point — so the index timeline grows with real
 * market data. Models without a slug keep their curated history untouched.
 *
 * Run locally:  node scripts/refresh-pricing.mjs
 * In CI:        .github/workflows/refresh-pricing.yml (scheduled)
 */
import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../public/data/pricing.json", import.meta.url);
const API = "https://openrouter.ai/api/v1/models";
const EPS = 1e-3;

const data = JSON.parse(await readFile(FILE, "utf8"));

const res = await fetch(API, { headers: { Accept: "application/json" } });
if (!res.ok) throw new Error(`OpenRouter API returned HTTP ${res.status}`);
const body = await res.json();
const live = new Map(body.data.map((m) => [m.id, m.pricing]));

const today = new Date().toISOString().slice(0, 10);
let checked = 0;
let matched = 0;
const changes = [];

for (const m of data.models) {
  if (!m.or) continue;
  checked++;
  const pr = live.get(m.or);
  if (!pr) continue;
  matched++;

  const input = +(+pr.prompt * 1e6).toFixed(4);
  const output = +(+pr.completion * 1e6).toFixed(4);
  if (!(input > 0) || !(output > 0)) continue; // skip free / invalid entries

  const last = m.prices[m.prices.length - 1];
  if (Math.abs(last.input - input) <= EPS && Math.abs(last.output - output) <= EPS) continue;

  const from = `${last.input}/${last.output}`;
  if (last.date === today) {
    last.input = input;
    last.output = output;
  } else {
    m.prices.push({ date: today, input, output });
  }
  changes.push(`${m.id.padEnd(22)} ${from} -> ${input}/${output}`);
}

data.meta = data.meta ?? {};
data.meta.lastRefresh = new Date().toISOString();
data.meta.source = API;

await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");

console.log(`TRAX refresh — ${changes.length} changed / ${matched} matched / ${checked} with slugs`);
for (const c of changes) console.log("  " + c);
