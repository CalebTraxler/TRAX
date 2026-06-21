/**
 * TRAX — AI Token Cost Index (TypeScript port).
 *
 * Ported from the original TRAX project by Caleb Traxler
 * (https://github.com/CalebTraxler/TRAX, MIT licensed). See LICENSE.
 *
 * blended(model) = 0.75·input + 0.25·output  (typical usage mix, $/Mtok)
 * price(company) = Σ wₜ·blended / Σ wₜ      (tier-weighted, active models)
 * V(t)           = Σ w_c·price(c) / Σ w_c   (provider-weighted)
 * TRAX(t)        = 100 · V(t) / V(base)
 */

export type Metric = "blended" | "input" | "output";
export type Tier = "flagship" | "mid" | "small";

export interface PricePoint {
  date: string; // YYYY-MM-DD
  input: number;
  output: number;
}
export interface Model {
  id: string;
  company: string;
  label: string;
  tier: Tier;
  or: string | null;
  prices: PricePoint[];
}
export interface Company {
  name: string;
  weight: number;
  color: string;
}
export interface PricingData {
  meta?: { lastRefresh?: string; source?: string; note?: string };
  companies: Record<string, Company>;
  models: Model[];
}

const W: Record<Tier, number> = { flagship: 1.0, mid: 0.7, small: 0.4 };
const BASE_MONTH = "2023-03";

function monthsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function priceAsOf(model: Model, ym: string): PricePoint | null {
  let chosen: PricePoint | null = null;
  for (const pt of model.prices) {
    if (pt.date.slice(0, 7) <= ym) chosen = pt;
    else break;
  }
  return chosen;
}

const blended = (pt: PricePoint) => 0.75 * pt.input + 0.25 * pt.output;

function metricValue(pt: PricePoint, metric: Metric): number {
  if (metric === "input") return pt.input;
  if (metric === "output") return pt.output;
  return blended(pt);
}

function companyPriceAt(
  data: PricingData, companyId: string, ym: string, metric: Metric,
): number | null {
  let num = 0, den = 0;
  for (const model of data.models) {
    if (model.company !== companyId) continue;
    const pt = priceAsOf(model, ym);
    if (!pt) continue;
    const w = W[model.tier];
    num += w * metricValue(pt, metric);
    den += w;
  }
  return den === 0 ? null : num / den;
}

function indexLevelAt(data: PricingData, ym: string, metric: Metric): number | null {
  let num = 0, den = 0;
  for (const id of Object.keys(data.companies)) {
    const cp = companyPriceAt(data, id, ym, metric);
    if (cp == null) continue;
    const w = data.companies[id].weight;
    num += w * cp;
    den += w;
  }
  return den === 0 ? null : num / den;
}

export interface CompanySeries {
  id: string;
  name: string;
  color: string;
  weight: number;
  series: (number | null)[];
  current: number | null;
  first: number | null;
  allTimeChange: number;
  models: number;
}

export interface ModelRow {
  id: string;
  label: string;
  company: string;
  companyId: string;
  color: string;
  tier: Tier;
  input: number;
  output: number;
  blended: number;
  launched: string;
  changeSinceLaunch: number;
}

export interface TraxPayload {
  meta: { base: string; asOf: string; metric: Metric; methodology: string };
  months: string[];
  index: (number | null)[];
  indexStats: {
    level: number | null;
    changeYoY: number;
    changeAllTime: number;
    high: number;
    low: number;
  };
  companies: CompanySeries[];
  modelTable: ModelRow[];
}

export function buildPayload(data: PricingData, metric: Metric = "blended"): TraxPayload {
  const months = monthsBetween(BASE_MONTH, currentMonth());
  const rawIndex = months.map((ym) => indexLevelAt(data, ym, metric));
  const baseVal = rawIndex.find((v) => v != null) ?? 1;
  const index = rawIndex.map((v) => (v == null ? null : +((100 * v) / baseVal).toFixed(2)));

  const companies: CompanySeries[] = Object.keys(data.companies).map((id) => {
    const series = months.map((ym) => {
      const v = companyPriceAt(data, id, ym, metric);
      return v == null ? null : +v.toFixed(3);
    });
    const present = series.filter((v): v is number => v != null);
    const current = present.length ? present[present.length - 1] : null;
    const first = present.length ? present[0] : null;
    const allTimeChange = first ? +(((current! - first) / first) * 100).toFixed(1) : 0;
    return {
      id,
      name: data.companies[id].name,
      color: data.companies[id].color,
      weight: data.companies[id].weight,
      series,
      current,
      first,
      allTimeChange,
      models: data.models.filter((m) => m.company === id).length,
    };
  });

  const nowMonth = months[months.length - 1];
  const modelTable: ModelRow[] = data.models
    .map((m) => {
      const pt = priceAsOf(m, nowMonth);
      if (!pt) return null;
      const firstPt = m.prices[0];
      const launchBlend = blended(firstPt);
      const nowBlend = blended(pt);
      return {
        id: m.id,
        label: m.label,
        company: data.companies[m.company].name,
        companyId: m.company,
        color: data.companies[m.company].color,
        tier: m.tier,
        input: pt.input,
        output: pt.output,
        blended: +nowBlend.toFixed(3),
        launched: firstPt.date,
        changeSinceLaunch: +(((nowBlend - launchBlend) / launchBlend) * 100).toFixed(1),
      } satisfies ModelRow;
    })
    .filter((r): r is ModelRow => r != null)
    .sort((a, b) => a.blended - b.blended);

  const lastIdx = index[index.length - 1];
  const firstIdx = index.find((v) => v != null) ?? null;
  const idx12 = index.length > 12 ? index[index.length - 13] : firstIdx;
  const numericIndex = index.filter((v): v is number => v != null);

  return {
    meta: {
      base: BASE_MONTH,
      asOf: nowMonth,
      metric,
      methodology:
        "TRAX = 100 × V(t)/V(base); V = company-weighted mean of tier-weighted blended (0.75·in + 0.25·out) $/Mtok. Lower = cheaper.",
    },
    months,
    index,
    indexStats: {
      level: lastIdx,
      changeYoY: idx12 && lastIdx ? +(((lastIdx - idx12) / idx12) * 100).toFixed(1) : 0,
      changeAllTime:
        firstIdx && lastIdx ? +(((lastIdx - firstIdx) / firstIdx) * 100).toFixed(1) : 0,
      high: numericIndex.length ? Math.max(...numericIndex) : 0,
      low: numericIndex.length ? Math.min(...numericIndex) : 0,
    },
    companies,
    modelTable,
  };
}

export async function fetchPricing(): Promise<PricingData> {
  const res = await fetch("/data/pricing.json");
  if (!res.ok) throw new Error(`failed to load pricing: ${res.status}`);
  return res.json();
}