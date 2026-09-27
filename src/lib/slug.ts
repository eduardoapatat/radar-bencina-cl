// URL-safe comuna slugs: "Ñuñoa" → "nunoa", "Pedro Aguirre Cerda" → "pedro-aguirre-cerda".
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const regionHref = (regionSlug: string) => `/${regionSlug}/`;
export const comunaHref = (regionSlug: string, name: string) => `/${regionSlug}/${slugify(name)}/`;
