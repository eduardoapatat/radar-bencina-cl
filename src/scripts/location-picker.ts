// Cascading region → provincia → comuna selects for LocationPicker.astro.
import { navigate } from "astro:transitions/client";
import type { PickerRegion } from "../components/LocationPicker.astro";

function fill(select: HTMLSelectElement, placeholder: string, names: string[]) {
  select.replaceChildren(
    new Option(placeholder, ""),
    ...names.map((name, i) => new Option(name, String(i))),
  );
  select.disabled = names.length === 0;
}

function setup() {
  const form = document.querySelector<HTMLFormElement>("[data-location-picker]");
  if (!form) return;
  const data = JSON.parse(
    form.querySelector("[data-picker-data]")?.textContent ?? "[]",
  ) as PickerRegion[];
  const regionSelect = form.querySelector<HTMLSelectElement>("[data-picker-region]")!;
  const provinciaSelect = form.querySelector<HTMLSelectElement>("[data-picker-provincia]")!;
  const comunaSelect = form.querySelector<HTMLSelectElement>("[data-picker-comuna]")!;
  const go = form.querySelector<HTMLButtonElement>("[data-picker-go]")!;

  const region = () => data[Number(regionSelect.value)] as PickerRegion | undefined;
  const provincias = () => {
    const all = region()?.provincias ?? [];
    const chosen = all[Number(provinciaSelect.value)];
    return provinciaSelect.value && chosen ? [chosen] : all;
  };
  const comunas = () => provincias().flatMap((p) => p.comunas);

  function fillComunas() {
    fill(
      comunaSelect,
      "Todas las comunas",
      comunas().map((c) => c.name),
    );
  }

  regionSelect.addEventListener("change", () => {
    fill(
      provinciaSelect,
      "Todas las provincias",
      (region()?.provincias ?? []).map((p) => p.name),
    );
    fillComunas();
    go.disabled = !region();
  });
  provinciaSelect.addEventListener("change", fillComunas);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const comuna = comunaSelect.value ? comunas()[Number(comunaSelect.value)] : undefined;
    const target = comuna?.href ?? region()?.href;
    if (target) navigate(target);
  });
}

document.addEventListener("astro:page-load", setup);
