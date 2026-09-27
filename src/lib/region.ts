// Build-time view of the region: stations, per-comuna stats and projected shapes,
// computed once and shared by the map, the price board and the ranking.
import { getCollection } from "astro:content";
import rawMeta from "../data/prices.meta.json";
import { comunas, projectComunas } from "./geo";
import { classify, freshPrice, regionMedian, statsByComuna, type PriceClass } from "./prices";
import { FUELS, PricesMetaSchema, type Fuel, type Station } from "./schema";

export const MAP_WIDTH = 600;

async function load() {
  const meta = PricesMetaSchema.parse(rawMeta);
  const { fetchedAt } = meta;
  const stations = (await getCollection("stations")).map((entry) => entry.data);
  const stats = statsByComuna(stations, fetchedAt);
  const medians = Object.fromEntries(
    FUELS.map((f) => [f, regionMedian(stations, f, fetchedAt)]),
  ) as Record<Fuel, number | undefined>;
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

  // Stations with a fresh price for `fuel`, cheapest first.
  function cheapestFirst(list: Station[], fuel: Fuel) {
    return list
      .flatMap((station) => {
        const price = freshPrice(station, fuel, fetchedAt);
        return price === undefined ? [] : [{ station, price }];
      })
      .sort((a, b) => a.price - b.price);
  }

  // Lowest single-station price per fuel.
  function cheapestStation(fuel: Fuel) {
    const best = cheapestFirst(stations, fuel)[0];
    return best && { price: best.price, comuna: nameByCut.get(best.station.comunaCut) };
  }

  function stationsIn(cut: string) {
    return stations.filter((s) => s.comunaCut === cut);
  }

  return {
    meta,
    stations,
    stats,
    medians,
    map,
    classFor,
    ranking,
    cheapestFirst,
    cheapestStation,
    stationsIn,
  };
}

let cache: ReturnType<typeof load> | undefined;
export const getRegionData = () => (cache ??= load());
