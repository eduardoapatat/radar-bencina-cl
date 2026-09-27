// Region map behavior: tooltip, highlight and the zoom transition into a comuna.
import { FUEL_LABELS, formatClp } from "../lib/prices";
import { isFuel } from "./fuel-selector";

const SVG_NS = "http://www.w3.org/2000/svg";

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

  const links = [...figure.querySelectorAll<SVGAElement>("[data-comuna-link]")];
  const pathOf = (link: Element) => link.querySelector<SVGPathElement>(".comuna")!;
  let active: SVGAElement | undefined;

  // The custom tooltip replaces the browser one.
  for (const link of links) pathOf(link).querySelector("title")?.remove();

  const currentFuel = () => (isFuel(root.dataset.fuel) ? root.dataset.fuel : "95");

  function showTooltip(link: SVGAElement, { withLink = false } = {}) {
    const path = pathOf(link);
    const fuel = currentFuel();
    const name = link.dataset.name ?? "";
    const median = Number(path.getAttribute(`data-median-${fuel}`));
    const count = Number(path.getAttribute(`data-count-${fuel}`));
    const reference = Number(figure!.getAttribute(`data-ref-${fuel}`));

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
    tooltip!.replaceChildren(title, detail);

    // Touch has no hover, so the first tap shows the tooltip with an explicit link.
    if (withLink) {
      const go = document.createElement("a");
      go.href = link.getAttribute("href") ?? "#";
      go.dataset.cut = link.dataset.cut;
      go.className = "mt-2 inline-block font-semibold text-led underline underline-offset-2";
      go.textContent = `Ver estaciones de ${name}`;
      tooltip!.append(go);
    }
    tooltip!.classList.toggle("pointer-events-none", !withLink);

    active = link;
    highlight!.setAttribute("d", path.getAttribute("d") ?? "");
    highlight!.classList.remove("invisible");
    tooltip!.classList.remove("hidden");
    placeTooltip(path);
  }

  function placeTooltip(path: SVGPathElement) {
    const box = path.getBoundingClientRect();
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

  for (const link of links) {
    link.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") showTooltip(link);
    });
    link.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") hideTooltip();
    });
    link.addEventListener("focus", () => showTooltip(link));
    link.addEventListener("blur", hideTooltip);
    link.addEventListener("click", (e) => {
      // Mouse and keyboard navigate right away; touch and pen show the tooltip first.
      const type = e instanceof PointerEvent ? e.pointerType : "";
      if ((type === "touch" || type === "pen") && active !== link) {
        e.preventDefault();
        showTooltip(link, { withLink: true });
      }
    });
  }

  root.addEventListener("fuelchange", () => active && showTooltip(active), { signal });
  document.addEventListener(
    "click",
    (e) => {
      if (!(e.target instanceof Element)) return;
      if (!e.target.closest("[data-comuna-link], [data-map-tooltip]")) hideTooltip();
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

  // Zoom into the comuna: an HTML copy of its shape sits exactly over it and shares
  // a view-transition-name with the big silhouette on the comuna page. SVG paths
  // are not reliable view-transition targets, HTML boxes are.
  document.addEventListener(
    "astro:before-preparation",
    (e) => {
      const source = e.sourceElement?.closest<HTMLElement | SVGElement>("[data-cut]");
      const link = links.find((l) => l.dataset.cut === source?.dataset.cut);
      if (link) addTransitionShape(pathOf(link));
    },
    { signal },
  );
}

function addTransitionShape(path: SVGPathElement) {
  const box = path.getBoundingClientRect();
  const { x, y, width, height } = path.getBBox();

  const shape = document.createElement("div");
  Object.assign(shape.style, {
    position: "fixed",
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    pointerEvents: "none",
    viewTransitionName: "comuna-shape",
  });

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  const copy = document.createElementNS(SVG_NS, "path");
  copy.setAttribute("d", path.getAttribute("d") ?? "");
  copy.setAttribute("fill", getComputedStyle(path).fill);
  svg.append(copy);
  shape.append(svg);
  document.body.append(shape);
}

document.addEventListener("astro:page-load", setup);
