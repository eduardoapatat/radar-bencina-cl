// Data contract shared by the site (content collections) and the data scripts.
// Mock data and, later, CNE data must both match these schemas.
import { z } from "astro/zod";
import { FUELS } from "./fuels.ts";

export { FUELS, type Fuel } from "./fuels.ts";
export const FuelSchema = z.enum(FUELS);

export const FuelPriceSchema = z.object({
  // Price per liter in CLP. Chilean prices are whole pesos.
  price: z.int().min(300).max(5000),
  // The CNE lists full-service and self-service prices separately; we keep the lower one.
  selfService: z.boolean(),
  // When the station reported this price
  updatedAt: z.coerce.date(),
});
export type FuelPrice = z.infer<typeof FuelPriceSchema>;

export const StationSchema = z.object({
  id: z.string().min(1),
  brand: z.string().min(1),
  address: z.string().min(1),
  // Código Único Territorial of the comuna, e.g. "13101" for Santiago
  comunaCut: z.string().regex(/^\d{4,5}$/),
  lat: z.number().min(-56).max(-17),
  lng: z.number().min(-110).max(-66),
  prices: z
    .partialRecord(FuelSchema, FuelPriceSchema)
    .refine((prices) => Object.keys(prices).length > 0, "A station needs at least one price"),
});
export type Station = z.infer<typeof StationSchema>;

// Written next to the stations file by whichever script produced it.
export const PricesMetaSchema = z.object({
  source: z.enum(["mock", "cne"]),
  fetchedAt: z.coerce.date(),
});
export type PricesMeta = z.infer<typeof PricesMetaSchema>;
