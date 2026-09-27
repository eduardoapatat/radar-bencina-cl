// Builds src/data/chile.topo.json from the BCN comunas shapefile, with two layers that
// share arcs: `comunas` (346) and `regions` (16 plus the BCN "zona sin demarcar").
// Source: Biblioteca del Congreso Nacional (https://www.bcn.cl/siit/mapas_vectoriales/index_html).
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import mapshaper from "mapshaper";

const SOURCE_URL =
  "https://www.bcn.cl/obtienearchivo?id=repositorio/10221/10396/5/comunas_final.zip";
const ZIP_PATH = "data/raw/comunas.zip";
const OUTPUT_PATH = "src/data/chile.topo.json";
// Chile has 346 comunas; the BCN file leaves out Antártica (12202), which has no stations.
const COMUNA_COUNT = 345;
const REGION_COUNT = 16;
// BCN code for the undemarcated area in Campo de Hielo Sur; drawn but not a real region.
const UNMARKED_REGION = "00";

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
    "-proj wgs84",
    // Thousands of southern islets add weight and nothing visible. This also drops the
    // Desventuradas (~2 km²), which stretched the Valparaíso comuna into the Pacific.
    // Rapa Nui (164 km²) and Juan Fernández stay.
    "-filter-islands min-area=5km2",
    // Distance-based, so dense southern fjords do not dominate the vertex budget.
    "-simplify interval=100 keep-shapes",
    // 5-digit CUT and 2-digit region, zero-padded like the CNE uses ("01101", "01").
    `-each 'cut=String(cod_comuna).padStart(5, "0"), region=String(codregion).padStart(2, "0"), name=Comuna, provincia=Provincia'`,
    "-filter-fields cut,name,provincia,region",
    "-rename-layers comunas",
    "-dissolve region + name=regions",
    `-filter target=comunas 'region !== "${UNMARKED_REGION}"'`,
    `-o ${OUTPUT_PATH} target=comunas,regions format=topojson quantization=1e5 force`,
  ].join(" "),
);

// Sanity checks: the maps depend on every comuna and region being present and identifiable.
const topology = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
const comunas = topology.objects.comunas.geometries;
const regions = topology.objects.regions.geometries.filter(
  (g) => g.properties.region !== UNMARKED_REGION,
);
const cuts = new Set(comunas.map((g) => g.properties.cut));
const incomplete = comunas.filter(
  (g) =>
    !/^\d{5}$/.test(g.properties.cut) || !g.properties.name || !/^\d{2}$/.test(g.properties.region),
);

if (comunas.length !== COMUNA_COUNT || cuts.size !== COMUNA_COUNT || incomplete.length) {
  throw new Error(
    `Expected ${COMUNA_COUNT} comunas with unique CUT, name and region; got ${comunas.length} (unique CUT: ${cuts.size}, incomplete: ${incomplete.length})`,
  );
}
if (regions.length !== REGION_COUNT) {
  throw new Error(`Expected ${REGION_COUNT} regions, got ${regions.length}`);
}

const { size } = await stat(OUTPUT_PATH);
console.log(
  `${OUTPUT_PATH}: ${comunas.length} comunas, ${regions.length} regions, ${(size / 1024).toFixed(1)} KB`,
);
