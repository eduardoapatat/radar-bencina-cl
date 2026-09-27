import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { StationSchema } from "./lib/schema";

// Mock data for now; step 2 swaps this file for the CNE export with the same schema.
const stations = defineCollection({
  loader: file("src/data/prices.mock.json"),
  schema: StationSchema,
});

export const collections = { stations };
