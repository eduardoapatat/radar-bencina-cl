// Data contract shared by the site (content collections) and the data scripts.
// Mock data and, later, CNE data must both match these schemas.
import { z } from "astro/zod";
import { FUELS } from "./fuels.ts";

export { FUELS, type Fuel } from "./fuels.ts";
export const FuelSchema = z.enum(FUELS);

// Price per liter in CLP. Chilean prices are whole pesos.
const PriceSchema = z.int().min(300).max(5000);

export const StationSchema = z.object({
  id: z.string().min(1),
  brand: z.string().min(1),
  address: z.string().min(1),
  // Código Único Territorial of the comuna, e.g. "13101" for Santiago
  comunaCut: z.string().regex(/^\d{4,5}$/),
  lat: z.number().min(-56).max(-17),
  lng: z.number().min(-110).max(-66),
  prices: z
    .partialRecord(FuelSchema, PriceSchema)
    .refine((prices) => Object.keys(prices).length > 0, "A station needs at least one price"),
  // When the station reported its prices
  updatedAt: z.coerce.date(),
});
export type Station = z.infer<typeof StationSchema>;
