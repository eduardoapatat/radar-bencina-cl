// Builds src/data/rm.topo.json from the BCN comunas shapefile.
// Source: Biblioteca del Congreso Nacional (https://www.bcn.cl/siit/mapas_vectoriales/index_html).
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import mapshaper from "mapshaper";

const SOURCE_URL =
  "https://www.bcn.cl/obtienearchivo?id=repositorio/10221/10396/5/comunas_final.zip";
const ZIP_PATH = "data/raw/comunas.zip";
const OUTPUT_PATH = "src/data/rm.topo.json";
const RM_REGION_CODE = 13;
const RM_COMUNA_COUNT = 52;

if (!existsSync(ZIP_PATH)) {
  console.log(`Downloading ${SOURCE_URL}`);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  await mkdir("data/raw", { recursive: true });
  await writeFile(ZIP_PATH, Buffer.from(await response.arrayBuffer()));
}

await mkdir("src/data", { recursive: true });
await mapshaper.runCommands(
  [
    `-i ${ZIP_PATH} encoding=utf8`,
    `-filter 'codregion === ${RM_REGION_CODE}'`,
    "-proj wgs84",
    "-simplify 10% keep-shapes",
    "-each 'cut=String(cod_comuna), name=Comuna, provincia=Provincia'",
    "-filter-fields cut,name,provincia",
    "-rename-layers comunas",
    `-o ${OUTPUT_PATH} format=topojson quantization=1e5 force`,
  ].join(" "),
);

// Sanity checks: the map depends on every comuna being present and identifiable.
const topology = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
const geometries = topology.objects.comunas.geometries;
const cuts = new Set(geometries.map((g) => g.properties.cut));
const missing = geometries.filter((g) => !g.properties.cut || !g.properties.name);

if (geometries.length !== RM_COMUNA_COUNT || cuts.size !== RM_COMUNA_COUNT || missing.length) {
  throw new Error(
    `Expected ${RM_COMUNA_COUNT} comunas with unique CUT and name, got ${geometries.length} (unique CUT: ${cuts.size}, incomplete: ${missing.length})`,
  );
}

const { size } = await stat(OUTPUT_PATH);
console.log(`${OUTPUT_PATH}: ${geometries.length} comunas, ${(size / 1024).toFixed(1)} KB`);
