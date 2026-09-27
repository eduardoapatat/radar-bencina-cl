import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { StationSchema } from "./lib/schema";

// Written by scripts/fetch-prices.mjs (CNE) or scripts/mock-prices.mjs (offline);
// both follow the same schema. src/data/prices.meta.json says which one it is.
const stations = defineCollection({
  loader: file("src/data/prices.json"),
  schema: StationSchema,
});

export const collections = { stations };
