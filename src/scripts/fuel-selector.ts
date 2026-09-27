// Shared fuel selector: sets the page's `data-fuel` root, recolors every element
// that carries per-fuel classes and remembers the choice across pages.
import { FUELS, type Fuel } from "../lib/fuels";

const STORAGE_KEY = "radar-bencina:fuel";

export const isFuel = (value: string | null | undefined): value is Fuel =>
  FUELS.includes(value as Fuel);

function savedFuel(): Fuel | undefined {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return isFuel(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function saveFuel(fuel: Fuel) {
  try {
    sessionStorage.setItem(STORAGE_KEY, fuel);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the choice just isn't kept.
  }
}

function setup() {
  const root = document.querySelector<HTMLElement>("[data-fuel]");
  if (!root) return;
  const options = [...document.querySelectorAll<HTMLButtonElement>("[data-fuel-option]")];

  function select(fuel: Fuel) {
    root!.dataset.fuel = fuel;
    for (const option of options) {
      option.setAttribute("aria-pressed", String(option.dataset.fuelOption === fuel));
    }
    for (const element of document.querySelectorAll<Element>(`[data-class-${fuel}]`)) {
      element.setAttribute("data-class", element.getAttribute(`data-class-${fuel}`) ?? "none");
    }
    root!.dispatchEvent(new CustomEvent("fuelchange", { detail: fuel }));
  }

  for (const option of options) {
    option.addEventListener("click", () => {
      const fuel = option.dataset.fuelOption;
      if (!isFuel(fuel)) return;
      saveFuel(fuel);
      select(fuel);
    });
  }

  const saved = savedFuel();
  if (saved && saved !== root.dataset.fuel) select(saved);
}

// With the ClientRouter, bundled scripts run once; re-run setup on every navigation.
document.addEventListener("astro:page-load", setup);
