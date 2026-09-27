import { FUELS, type Fuel } from "./fuels";
import type { FuelPrice, Station } from "./schema";

// Prices older than this (relative to the download) are shown but not counted.
export const STALE_AFTER_DAYS = 30;
const DAY_MS = 86_400_000;

export const isFresh = (price: FuelPrice, fetchedAt: Date) =>
  fetchedAt.getTime() - price.updatedAt.getTime() <= STALE_AFTER_DAYS * DAY_MS;

// The station's price for `fuel` if it is recent enough to count, else undefined.
export function freshPrice(station: Station, fuel: Fuel, fetchedAt: Date): number | undefined {
  const price = station.prices[fuel];
  return price && isFresh(price, fetchedAt) ? price.price : undefined;
}

export interface FuelStats {
  median: number;
  // Average of fresh prices, rounded to whole pesos
  mean: number;
  min: number;
  count: number;
}

export function mean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}
export type ComunaStats = Partial<Record<Fuel, FuelStats>>;

export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function statsByComuna(stations: Station[], fetchedAt: Date): Map<string, ComunaStats> {
  return statsBy(stations, (s) => s.comunaCut, fetchedAt);
}

// Median, minimum and count of fresh prices per fuel, grouped by `key` (comuna, region…).
export function statsBy(
  stations: Station[],
  key: (station: Station) => string,
  fetchedAt: Date,
): Map<string, ComunaStats> {
  const pricesByKey = new Map<string, Partial<Record<Fuel, number[]>>>();
  for (const station of stations) {
    const prices = pricesByKey.get(key(station)) ?? {};
    for (const fuel of FUELS) {
      const price = freshPrice(station, fuel, fetchedAt);
      if (price !== undefined) (prices[fuel] ??= []).push(price);
    }
    pricesByKey.set(key(station), prices);
  }

  const stats = new Map<string, ComunaStats>();
  for (const [cut, prices] of pricesByKey) {
    const comuna: ComunaStats = {};
    for (const fuel of FUELS) {
      const values = prices[fuel];
      if (!values?.length) continue;
      comuna[fuel] = {
        median: median(values)!,
        mean: mean(values)!,
        min: Math.min(...values),
        count: values.length,
      };
    }
    stats.set(cut, comuna);
  }
  return stats;
}

const freshPrices = (stations: Station[], fuel: Fuel, fetchedAt: Date) =>
  stations.flatMap((s) => {
    const price = freshPrice(s, fuel, fetchedAt);
    return price === undefined ? [] : [price];
  });

// Median over every station in the region: the "normal" price the map compares against.
export const regionMedian = (stations: Station[], fuel: Fuel, fetchedAt: Date) =>
  median(freshPrices(stations, fuel, fetchedAt));

// Average over every station: the national reference on the home map.
export const stationsMean = (stations: Station[], fuel: Fuel, fetchedAt: Date) =>
  mean(freshPrices(stations, fuel, fetchedAt));

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
