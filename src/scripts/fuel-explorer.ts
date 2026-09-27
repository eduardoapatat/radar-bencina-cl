// Client behavior for the home page: fuel selector and map tooltip.
// Everything else (colors per fuel, rankings, legends) is already in the HTML.
import { FUEL_LABELS, formatClp } from "../lib/prices";
import { FUELS, type Fuel } from "../lib/fuels";

const isFuel = (value: string | undefined): value is Fuel => FUELS.includes(value as Fuel);

function setup() {
  const root = document.querySelector<HTMLElement>("[data-fuel]");
  const figure = document.querySelector<HTMLElement>("[data-region-map]");
  const tooltip = figure?.querySelector<HTMLElement>("[data-map-tooltip]");
  const highlight = figure?.querySelector<SVGPathElement>("[data-map-highlight]");
  if (!root || !figure || !tooltip || !highlight) return;

  // Document-level listeners must not pile up across client-side navigations.
  const controller = new AbortController();
  const { signal } = controller;
  document.addEventListener("astro:before-swap", () => controller.abort(), { once: true });

  const comunas = [...figure.querySelectorAll<SVGPathElement>(".comuna")];
  const options = [...document.querySelectorAll<HTMLButtonElement>("[data-fuel-option]")];
  let active: SVGPathElement | undefined;

  // The custom tooltip replaces the browser one.
  for (const comuna of comunas) comuna.querySelector("title")?.remove();

  function currentFuel(): Fuel {
    return isFuel(root!.dataset.fuel) ? root!.dataset.fuel : "95";
  }

  function selectFuel(fuel: Fuel) {
    root!.dataset.fuel = fuel;
    for (const option of options) {
      option.setAttribute("aria-pressed", String(option.dataset.fuelOption === fuel));
    }
    for (const comuna of comunas) {
      comuna.dataset.class = comuna.getAttribute(`data-class-${fuel}`) ?? "none";
    }
    if (active) showTooltip(active);
  }

  function showTooltip(comuna: SVGPathElement) {
    const fuel = currentFuel();
    const name = comuna.dataset.name ?? "";
    const median = Number(comuna.getAttribute(`data-median-${fuel}`));
    const count = Number(comuna.getAttribute(`data-count-${fuel}`));
    const reference = Number(figure!.getAttribute(`data-ref-${fuel}`));

    tooltip!.replaceChildren();
    const title = document.createElement("p");
    title.className = "font-semibold";
    title.textContent = name;
    const detail = document.createElement("p");
    detail.className = "text-dust";

    if (median) {
      const diff = median - reference;
      const comparison =
        diff === 0
          ? "igual a la mediana de la región"
          : `${formatClp(Math.abs(diff))} ${diff < 0 ? "más barato" : "más caro"} que la región`;
      detail.textContent = `${FUEL_LABELS[fuel]}: ${formatClp(median)} mediana, ${comparison}. ${count} estaciones.`;
    } else {
      detail.textContent = `Sin datos de ${FUEL_LABELS[fuel]}.`;
    }
    tooltip!.append(title, detail);

    active = comuna;
    highlight!.setAttribute("d", comuna.getAttribute("d") ?? "");
    highlight!.classList.remove("invisible");
    tooltip!.classList.remove("hidden");
    placeTooltip(comuna);
  }

  function placeTooltip(comuna: SVGPathElement) {
    const box = comuna.getBoundingClientRect();
    const frame = figure!.getBoundingClientRect();
    const tip = tooltip!.getBoundingClientRect();
    const x = box.left + box.width / 2 - frame.left - tip.width / 2;
    const y = box.top - frame.top - tip.height - 8;
    tooltip!.style.left = `${Math.max(0, Math.min(x, frame.width - tip.width))}px`;
    tooltip!.style.top = `${Math.max(0, y)}px`;
  }

  function hideTooltip() {
    active = undefined;
    highlight!.classList.add("invisible");
    tooltip!.classList.add("hidden");
  }

  for (const option of options) {
    option.addEventListener("click", () => {
      const fuel = option.dataset.fuelOption;
      if (isFuel(fuel)) selectFuel(fuel);
    });
  }

  for (const comuna of comunas) {
    // Mouse: follow hover. Touch and pen: tap to show, tap elsewhere to hide.
    comuna.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") showTooltip(comuna);
    });
    comuna.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") hideTooltip();
    });
    comuna.addEventListener("click", () => showTooltip(comuna));
  }
  document.addEventListener(
    "click",
    (e) => {
      if (!(e.target instanceof Element) || !e.target.closest(".comuna")) hideTooltip();
    },
    { signal },
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") hideTooltip();
    },
    { signal },
  );
}

// With the ClientRouter, bundled scripts run once; re-run setup on every navigation.
document.addEventListener("astro:page-load", setup);
