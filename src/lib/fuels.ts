// Fuel constants without Zod, so client scripts can import them without bundling it.
export const FUELS = ["93", "95", "97", "diesel"] as const;
export type Fuel = (typeof FUELS)[number];
