// Generates src/data/prices.json (+ prices.meta.json): plausible, deterministic fake
// stations placed inside each RM comuna. Same files and contract as fetch-prices.mjs,
// so the site can run offline or without CNE credentials.
import { readFile, writeFile } from "node:fs/promises";
import { geoBounds, geoContains } from "d3-geo";
import { feature } from "topojson-client";
import { z } from "astro/zod";
import { PricesMetaSchema, StationSchema } from "../src/lib/schema.ts";

const TOPOLOGY_PATH = "src/data/rm.topo.json";
const OUTPUT_PATH = "src/data/prices.json";
const META_PATH = "src/data/prices.meta.json";
const FETCHED_AT = Date.parse("2026-09-26T12:00:00-03:00");

// Seeded PRNG so the file only changes when this script changes.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(2026);
const between = (min, max) => min + random() * (max - min);
const pick = (items) => items[Math.floor(random() * items.length)];

// Full-service levels seen in the CNE data for the RM (September 2026).
const BASE_PRICE = { 93: 1450, 95: 1485, 97: 1530, diesel: 1385 };
const BRANDS = ["Copec", "Shell", "Aramco", "Independiente"];
const STREETS = [
  "Av. Principal",
  "Av. Central",
  "Camino Real",
  "Calle Los Aromos",
  "Av. Las Torres",
];

function randomPointInside(comuna) {
  const [[west, south], [east, north]] = geoBounds(comuna);
  for (let attempt = 0; attempt < 500; attempt++) {
    const point = [between(west, east), between(south, north)];
    if (geoContains(comuna, point)) return point;
  }
  throw new Error(`Could not place a station inside ${comuna.properties.name}`);
}

const topology = JSON.parse(await readFile(TOPOLOGY_PATH, "utf8"));
const comunas = feature(topology, topology.objects.comunas).features;

const stations = comunas.flatMap((comuna) => {
  const { cut, name, provincia } = comuna.properties;
  // Urban comunas (Santiago province) get more stations.
  const count = provincia === "Santiago" ? Math.round(between(5, 14)) : Math.round(between(2, 7));
  // Each comuna is a bit cheaper or pricier than the base, like real price zones.
  const comunaOffset = between(-45, 45);

  return Array.from({ length: count }, (_, i) => {
    const [lng, lat] = randomPointInside(comuna);
    // Like the CNE data, about a third of stations also have a cheaper self-service price.
    const hasSelfService = random() < 0.3;
    const prices = {};
    for (const [fuel, base] of Object.entries(BASE_PRICE)) {
      // Some stations do not sell 97 or diesel.
      if ((fuel === "97" || fuel === "diesel") && random() < 0.15) continue;
      const fullService = Math.round(base + comunaOffset + between(-25, 25));
      const selfService = hasSelfService && random() < 0.8;
      // A few stations stop updating: their price is months old.
      const daysAgo = random() < 0.05 ? between(40, 200) : between(0.05, 4);
      prices[fuel] = {
        price: selfService ? fullService - Math.round(between(10, 60)) : fullService,
        selfService,
        updatedAt: new Date(FETCHED_AT - daysAgo * 86_400_000).toISOString(),
      };
    }

    return {
      id: `mock-${cut}-${i + 1}`,
      brand: pick(BRANDS),
      address: `${pick(STREETS)} ${Math.round(between(100, 9900))}, ${name}`,
      comunaCut: cut,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      prices,
    };
  });
});

z.array(StationSchema).parse(stations);
const meta = PricesMetaSchema.parse({ source: "mock", fetchedAt: new Date(FETCHED_AT) });
await writeFile(OUTPUT_PATH, `${JSON.stringify(stations, null, 2)}\n`);
await writeFile(META_PATH, `${JSON.stringify(meta, null, 2)}\n`);
console.log(`${OUTPUT_PATH}: ${stations.length} mock stations in ${comunas.length} comunas`);
