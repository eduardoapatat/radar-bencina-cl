import { FUELS, type Fuel, type Station } from "./schema";

export interface FuelStats {
  median: number;
  min: number;
  count: number;
}
export type ComunaStats = Partial<Record<Fuel, FuelStats>>;

export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function statsByComuna(stations: Station[]): Map<string, ComunaStats> {
  const pricesByComuna = new Map<string, Partial<Record<Fuel, number[]>>>();
  for (const station of stations) {
    const prices = pricesByComuna.get(station.comunaCut) ?? {};
    for (const fuel of FUELS) {
      const price = station.prices[fuel];
      if (price !== undefined) (prices[fuel] ??= []).push(price);
    }
    pricesByComuna.set(station.comunaCut, prices);
  }

  const stats = new Map<string, ComunaStats>();
  for (const [cut, prices] of pricesByComuna) {
    const comuna: ComunaStats = {};
    for (const fuel of FUELS) {
      const values = prices[fuel];
      if (!values?.length) continue;
      comuna[fuel] = { median: median(values)!, min: Math.min(...values), count: values.length };
    }
    stats.set(cut, comuna);
  }
  return stats;
}

// Median over every station in the region: the "normal" price the map compares against.
export function regionMedian(stations: Station[], fuel: Fuel): number | undefined {
  return median(stations.flatMap((s) => (s.prices[fuel] === undefined ? [] : [s.prices[fuel]])));
}

// Diverging classes: how far a comuna's median sits from the region median, in CLP.
export const PRICE_CLASSES = ["-2", "-1", "0", "1", "2"] as const;
export type PriceClass = (typeof PRICE_CLASSES)[number] | "none";

const NEAR = 10;
const FAR = 30;

export function classify(diff: number): PriceClass {
  if (diff <= -FAR) return "-2";
  if (diff <= -NEAR) return "-1";
  if (diff < NEAR) return "0";
  if (diff < FAR) return "1";
  return "2";
}

export const CLASS_LABELS: Record<(typeof PRICE_CLASSES)[number], string> = {
  "-2": `$${FAR} o más barato`,
  "-1": `$${NEAR} a $${FAR} más barato`,
  "0": `Cerca de la mediana`,
  "1": `$${NEAR} a $${FAR} más caro`,
  "2": `$${FAR} o más caro`,
};

export const FUEL_LABELS: Record<Fuel, string> = {
  "93": "93",
  "95": "95",
  "97": "97",
  diesel: "Diésel",
};

export const formatClp = (price: number) => `$${price.toLocaleString("es-CL")}`;
