// The 16 regions, north to south, with the short URL slug and the home-map column.
// Codes are the 2-digit, zero-padded region codes used by the CNE and chile.topo.json.
export type MapColumn = "norte" | "centro" | "sur";

export interface RegionInfo {
  code: string;
  slug: string;
  // Short name for maps and lists
  name: string;
  // Name as used in a sentence: "Dónde cargar más barato en la Región del Biobío"
  label: string;
  column: MapColumn;
}

export const REGIONS: RegionInfo[] = [
  {
    code: "15",
    slug: "arica-y-parinacota",
    name: "Arica y Parinacota",
    label: "la Región de Arica y Parinacota",
    column: "norte",
  },
  {
    code: "01",
    slug: "tarapaca",
    name: "Tarapacá",
    label: "la Región de Tarapacá",
    column: "norte",
  },
  {
    code: "02",
    slug: "antofagasta",
    name: "Antofagasta",
    label: "la Región de Antofagasta",
    column: "norte",
  },
  { code: "03", slug: "atacama", name: "Atacama", label: "la Región de Atacama", column: "norte" },
  {
    code: "04",
    slug: "coquimbo",
    name: "Coquimbo",
    label: "la Región de Coquimbo",
    column: "centro",
  },
  {
    code: "05",
    slug: "valparaiso",
    name: "Valparaíso",
    label: "la Región de Valparaíso",
    column: "centro",
  },
  {
    code: "13",
    slug: "metropolitana",
    name: "Metropolitana",
    label: "la Región Metropolitana",
    column: "centro",
  },
  {
    code: "06",
    slug: "ohiggins",
    name: "O'Higgins",
    label: "la Región de O'Higgins",
    column: "centro",
  },
  { code: "07", slug: "maule", name: "Maule", label: "la Región del Maule", column: "centro" },
  { code: "16", slug: "nuble", name: "Ñuble", label: "la Región de Ñuble", column: "centro" },
  { code: "08", slug: "biobio", name: "Biobío", label: "la Región del Biobío", column: "sur" },
  {
    code: "09",
    slug: "la-araucania",
    name: "La Araucanía",
    label: "la Región de La Araucanía",
    column: "sur",
  },
  { code: "14", slug: "los-rios", name: "Los Ríos", label: "la Región de Los Ríos", column: "sur" },
  {
    code: "10",
    slug: "los-lagos",
    name: "Los Lagos",
    label: "la Región de Los Lagos",
    column: "sur",
  },
  { code: "11", slug: "aysen", name: "Aysén", label: "la Región de Aysén", column: "sur" },
  {
    code: "12",
    slug: "magallanes",
    name: "Magallanes",
    label: "la Región de Magallanes",
    column: "sur",
  },
];

export const regionByCode = new Map(REGIONS.map((r) => [r.code, r]));
export const regionBySlug = new Map(REGIONS.map((r) => [r.slug, r]));
