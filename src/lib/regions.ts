// The 16 regions, north to south, with the short URL slug and the home-map column.
// Codes are the 2-digit, zero-padded region codes used by the CNE and chile.topo.json.
export type MapColumn = "norte" | "centro" | "sur";

export interface RegionInfo {
  code: string;
  slug: string;
  name: string;
  column: MapColumn;
}

export const REGIONS: RegionInfo[] = [
  { code: "15", slug: "arica-y-parinacota", name: "Arica y Parinacota", column: "norte" },
  { code: "01", slug: "tarapaca", name: "Tarapacá", column: "norte" },
  { code: "02", slug: "antofagasta", name: "Antofagasta", column: "norte" },
  { code: "03", slug: "atacama", name: "Atacama", column: "norte" },
  { code: "04", slug: "coquimbo", name: "Coquimbo", column: "centro" },
  { code: "05", slug: "valparaiso", name: "Valparaíso", column: "centro" },
  { code: "13", slug: "metropolitana", name: "Metropolitana", column: "centro" },
  { code: "06", slug: "ohiggins", name: "O'Higgins", column: "centro" },
  { code: "07", slug: "maule", name: "Maule", column: "centro" },
  { code: "16", slug: "nuble", name: "Ñuble", column: "centro" },
  { code: "08", slug: "biobio", name: "Biobío", column: "sur" },
  { code: "09", slug: "la-araucania", name: "La Araucanía", column: "sur" },
  { code: "14", slug: "los-rios", name: "Los Ríos", column: "sur" },
  { code: "10", slug: "los-lagos", name: "Los Lagos", column: "sur" },
  { code: "11", slug: "aysen", name: "Aysén", column: "sur" },
  { code: "12", slug: "magallanes", name: "Magallanes", column: "sur" },
];

export const regionByCode = new Map(REGIONS.map((r) => [r.code, r]));
export const regionBySlug = new Map(REGIONS.map((r) => [r.slug, r]));
