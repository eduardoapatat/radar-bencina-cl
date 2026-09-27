// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  fonts: [
    {
      name: "Barlow",
      cssVariable: "--font-barlow",
      provider: fontProviders.google(),
      weights: [400, 500, 600],
      styles: ["normal"],
      subsets: ["latin", "latin-ext"],
    },
    {
      name: "Barlow Condensed",
      cssVariable: "--font-barlow-condensed",
      provider: fontProviders.google(),
      weights: [600, 700],
      styles: ["normal"],
      subsets: ["latin", "latin-ext"],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
