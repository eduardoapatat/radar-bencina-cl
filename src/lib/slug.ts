// URL-safe comuna slugs: "Ñuñoa" → "nunoa", "Pedro Aguirre Cerda" → "pedro-aguirre-cerda".
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const comunaHref = (name: string) => `/metropolitana/${slugify(name)}/`;
