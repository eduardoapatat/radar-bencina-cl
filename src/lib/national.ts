// Build-time view of the whole country for the home page: per-region average prices
// compared against the national average.
import { comunas } from "./geo";
import { classify, stationsMean, statsBy, type PriceClass } from "./prices";
import { getAllStations, pricesMeta } from "./region";
import { REGIONS } from "./regions";
import { FUELS, type Fuel } from "./schema";

async function load() {
  const { fetchedAt } = pricesMeta;
  const stations = await getAllStations();
  const comunaByCut = new Map(comunas.map((c) => [c.cut, c]));
  const regionOf = (cut: string) => comunaByCut.get(cut)?.region ?? "";

  const stats = statsBy(stations, (s) => regionOf(s.comunaCut), fetchedAt);
  const averages = Object.fromEntries(
    FUELS.map((f) => [f, stationsMean(stations, f, fetchedAt)]),
  ) as Record<Fuel, number | undefined>;

  function classFor(region: string, fuel: Fuel): PriceClass {
    const regionAverage = stats.get(region)?.[fuel]?.mean;
    const reference = averages[fuel];
    if (regionAverage === undefined || reference === undefined) return "none";
    return classify(regionAverage - reference);
  }

  // Regions with data for `fuel`, cheapest average first.
  function ranking(fuel: Fuel) {
    return REGIONS.flatMap((r) => {
      const s = stats.get(r.code)?.[fuel];
      return s ? [{ ...r, ...s, priceClass: classFor(r.code, fuel) }] : [];
    }).sort((a, b) => a.mean - b.mean || a.name.localeCompare(b.name, "es"));
  }

  return { stats, averages, classFor, ranking };
}

let cache: ReturnType<typeof load> | undefined;
export const getNationalData = () => (cache ??= load());
