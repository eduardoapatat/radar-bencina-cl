// Build-time view of the region: stations, per-comuna stats and projected shapes,
// computed once and shared by the map, the price board and the ranking.
import { getCollection } from "astro:content";
import { comunas, projectComunas } from "./geo";
import { classify, regionMedian, statsByComuna, type PriceClass } from "./prices";
import { FUELS, type Fuel } from "./schema";

export const MAP_WIDTH = 600;

async function load() {
  const stations = (await getCollection("stations")).map((entry) => entry.data);
  const stats = statsByComuna(stations);
  const medians = Object.fromEntries(FUELS.map((f) => [f, regionMedian(stations, f)])) as Record<
    Fuel,
    number | undefined
  >;
  const map = projectComunas(MAP_WIDTH);
  const nameByCut = new Map(comunas.map((c) => [c.cut, c.name]));

  function classFor(cut: string, fuel: Fuel): PriceClass {
    const comunaMedian = stats.get(cut)?.[fuel]?.median;
    const reference = medians[fuel];
    if (comunaMedian === undefined || reference === undefined) return "none";
    return classify(comunaMedian - reference);
  }

  // Comunas with data for `fuel`, cheapest median first.
  function ranking(fuel: Fuel) {
    return comunas
      .flatMap((c) => {
        const s = stats.get(c.cut)?.[fuel];
        return s ? [{ ...c, ...s, priceClass: classFor(c.cut, fuel) }] : [];
      })
      .sort((a, b) => a.median - b.median || a.name.localeCompare(b.name, "es"));
  }

  // Lowest single-station price per fuel.
  function cheapestStation(fuel: Fuel) {
    const best = stations
      .filter((s) => s.prices[fuel] !== undefined)
      .sort((a, b) => a.prices[fuel]! - b.prices[fuel]!)[0];
    return best && { price: best.prices[fuel]!, comuna: nameByCut.get(best.comunaCut) };
  }

  return { stations, stats, medians, map, classFor, ranking, cheapestStation };
}

let cache: ReturnType<typeof load> | undefined;
export const getRegionData = () => (cache ??= load());
