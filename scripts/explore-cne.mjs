// One-off exploration of the CNE API: logs in, fetches stations and prints the real
// response shape so fetch-prices.mjs can be written against it.
// Never prints credentials or the token.
// Run: pnpm data:explore   (loads CNE_EMAIL and CNE_PASSWORD from .env)
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = "https://api.cne.cl";
const STATIONS_URL = `${BASE_URL}/api/v4/estaciones`;
// The public docs are rendered client-side, so the login route is probed.
const LOGIN_CANDIDATES = [`${BASE_URL}/api/login`, `${BASE_URL}/api/v4/login`];

const { CNE_EMAIL, CNE_PASSWORD } = process.env;
if (!CNE_EMAIL || !CNE_PASSWORD) {
  console.error("Missing CNE_EMAIL or CNE_PASSWORD. Add them to .env and run: pnpm data:explore");
  process.exit(1);
}

const describe = (value) =>
  Array.isArray(value)
    ? `array(${value.length})`
    : value && typeof value === "object"
      ? `object{${Object.keys(value).join(", ")}}`
      : typeof value;

async function login() {
  for (const url of LOGIN_CANDIDATES) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: CNE_EMAIL, password: CNE_PASSWORD }),
    });
    const body = await response.json().catch(() => undefined);
    console.log(`POST ${url} → ${response.status}; body: ${describe(body)}`);
    const token = body?.token ?? body?.access_token ?? body?.data?.token;
    if (response.ok && typeof token === "string") return token;
  }
  throw new Error("Login failed on every candidate route; check the credentials or the docs.");
}

const token = await login();
console.log("Login OK (token received, not shown).");

const response = await fetch(STATIONS_URL, {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
});
console.log(`GET ${STATIONS_URL} → ${response.status}`);
const body = await response.json();
console.log(`Response: ${describe(body)}`);

const stations = Array.isArray(body) ? body : (body.data ?? body.estaciones ?? []);
console.log(`Stations: ${stations.length}`);

// Union of keys across stations, to spot optional fields.
const keys = new Map();
for (const station of stations) {
  for (const [key, value] of Object.entries(station)) {
    if (!keys.has(key)) keys.set(key, describe(value));
  }
}
console.log("\nFields:");
for (const [key, type] of keys) console.log(`  ${key}: ${type}`);

console.log("\nTwo sample stations:");
console.log(JSON.stringify(stations.slice(0, 2), null, 2));

await mkdir("data/raw", { recursive: true });
await writeFile("data/raw/cne-sample.json", JSON.stringify(body, null, 2));
console.log("\nFull response saved to data/raw/cne-sample.json (gitignored).");
