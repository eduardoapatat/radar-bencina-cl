// Downloads current station prices from the CNE API and writes src/data/prices.json
// (+ prices.meta.json) in the same contract as the mock data.
// Run: pnpm data:fetch   (loads CNE_EMAIL and CNE_PASSWORD from .env)
// Never prints credentials or the token.
import { readFile, writeFile } from "node:fs/promises";
import { PricesMetaSchema, StationSchema } from "../src/lib/schema.ts";

const BASE_URL = "https://api.cne.cl";
const REGION_CODES = new Set(["13"]); // Región Metropolitana for now
const OUTPUT_PATH = "src/data/prices.json";
const META_PATH = "src/data/prices.meta.json";
const TOPOLOGY_PATH = "src/data/rm.topo.json";
const STALE_AFTER_MS = 30 * 86_400_000; // keep in sync with STALE_AFTER_DAYS in src/lib/prices.ts

// CNE codes per fuel: full service first, then self-service.
const FUEL_CODES = {
  93: ["93", "A93"],
  95: ["95", "A95"],
  97: ["97", "A97"],
  diesel: ["DI", "ADI"],
};

const { CNE_EMAIL, CNE_PASSWORD } = process.env;
if (!CNE_EMAIL || !CNE_PASSWORD) {
  console.error("Missing CNE_EMAIL or CNE_PASSWORD in .env");
  process.exit(1);
}

async function getJson(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${url} → ${response.status}`);
  return response.json();
}

// CNE dates are Santiago local time without an offset; Chile switches between -04 and -03.
function santiagoToDate(date, time = "00:00:00") {
  const asUtc = Date.parse(`${date}T${time}Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(asUtc);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const shownAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return new Date(asUtc - (shownAsUtc - asUtc));
}

// "COPEC" → "Copec", "JVL COMBUSTIBLES" → "JVL Combustibles", "Sin Bandera" stays.
const normalizeBrand = (brand) =>
  (brand?.trim() || "Sin Bandera")
    .split(/\s+/)
    .map((word) =>
      word.length > 3 && word === word.toUpperCase() ? word[0] + word.slice(1).toLowerCase() : word,
    )
    .join(" ");

// Same bounds as FuelPriceSchema: anything outside is a typo by the station.
const MIN_PRICE = 300;
const MAX_PRICE = 5000;
let discardedPrices = 0;

function pickPrice(prices, codes, fetchedAt) {
  const candidates = codes.flatMap((code, i) => {
    const entry = prices?.[code];
    if (!entry) return [];
    const price = Math.round(Number(entry.precio));
    if (!Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) {
      discardedPrices++;
      return [];
    }
    return [
      {
        price,
        selfService: i > 0,
        updatedAt: santiagoToDate(entry.fecha_actualizacion, entry.hora_actualizacion),
      },
    ];
  });
  // Lowest recent price wins; a stale self-service price must not beat a fresh full-service one.
  const fresh = candidates.filter((c) => fetchedAt - c.updatedAt <= STALE_AFTER_MS);
  if (fresh.length) return fresh.sort((a, b) => a.price - b.price)[0];
  return candidates.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

const { token } = await getJson(`${BASE_URL}/api/login`, {
  method: "POST",
  body: JSON.stringify({ email: CNE_EMAIL, password: CNE_PASSWORD }),
});
if (typeof token !== "string") throw new Error("Login response has no token");

const fetchedAt = new Date();
const raw = await getJson(`${BASE_URL}/api/v4/estaciones`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!Array.isArray(raw)) throw new Error("Unexpected stations response: not an array");

const topology = JSON.parse(await readFile(TOPOLOGY_PATH, "utf8"));
const knownCuts = new Set(topology.objects.comunas.geometries.map((g) => g.properties.cut));

const stations = [];
const skipped = { maintenance: 0, noPrices: 0, unknownComuna: 0, invalid: 0 };

for (const item of raw) {
  const location = item.ubicacion ?? {};
  if (!REGION_CODES.has(location.codigo_region)) continue;
  if (item.en_mantenimiento) {
    skipped.maintenance++;
    continue;
  }
  if (!knownCuts.has(location.codigo_comuna)) {
    skipped.unknownComuna++;
    continue;
  }

  const prices = {};
  for (const [fuel, codes] of Object.entries(FUEL_CODES)) {
    const picked = pickPrice(item.precios, codes, fetchedAt);
    if (picked) prices[fuel] = picked;
  }
  if (!Object.keys(prices).length) {
    skipped.noPrices++;
    continue;
  }

  const result = StationSchema.safeParse({
    id: item.codigo,
    brand: normalizeBrand(item.distribuidor?.marca),
    address: location.direccion?.trim(),
    comunaCut: location.codigo_comuna,
    lat: Number(location.latitud),
    lng: Number(location.longitud),
    prices,
  });
  if (result.success) {
    stations.push(result.data);
  } else {
    skipped.invalid++;
    console.warn(`Skipping ${item.codigo}: ${result.error.issues[0]?.message}`);
  }
}

if (stations.length === 0) throw new Error("No valid stations; keeping the previous data");

stations.sort((a, b) => a.id.localeCompare(b.id));
const meta = PricesMetaSchema.parse({ source: "cne", fetchedAt });
await writeFile(OUTPUT_PATH, `${JSON.stringify(stations, null, 2)}\n`);
await writeFile(META_PATH, `${JSON.stringify(meta, null, 2)}\n`);

const perFuel = Object.keys(FUEL_CODES)
  .map((fuel) => {
    const withFuel = stations.filter((s) => s.prices[fuel]);
    const stale = withFuel.filter((s) => fetchedAt - s.prices[fuel].updatedAt > STALE_AFTER_MS);
    const self = withFuel.filter((s) => s.prices[fuel].selfService);
    return `${fuel}: ${withFuel.length} (${stale.length} old, ${self.length} self-service)`;
  })
  .join("; ");
console.log(`${OUTPUT_PATH}: ${stations.length} stations from ${raw.length} in Chile`);
console.log(`Per fuel: ${perFuel}`);
console.log(`Skipped stations: ${JSON.stringify(skipped)}; discarded prices: ${discardedPrices}`);
