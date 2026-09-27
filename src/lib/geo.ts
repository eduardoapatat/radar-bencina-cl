import {
  geoBounds,
  geoMercator,
  geoPath,
  type ExtendedFeature,
  type ExtendedFeatureCollection,
  type GeoGeometryObjects,
} from "d3-geo";
import { feature, merge } from "topojson-client";
import { filter, filterWeight, planarRingArea, presimplify, simplify } from "topojson-simplify";
import topology from "../data/chile.topo.json";

export interface ComunaProps {
  cut: string;
  name: string;
  provincia: string;
  region: string;
}
type ComunaFeature = ExtendedFeature<GeoGeometryObjects, ComunaProps>;
type ComunaCollection = ExtendedFeatureCollection<ComunaFeature>;
type Topology = Parameters<typeof feature>[0];

const topo = topology as unknown as Topology;
const toComunas = (t: Topology) => feature(t, t.objects.comunas) as unknown as ComunaCollection;
const allComunas = toComunas(topo);

// Rapa Nui and Juan Fernández sit thousands of km off the coast: fitting them into the
// Valparaíso map would shrink the mainland to a sliver. They get their own inset later.
export const INSULAR_COMUNAS = new Set(["05201", "05104"]);

export const comunas: ComunaProps[] = allComunas.features.map((f) => f.properties);

export const comunasOf = (region: string) => comunas.filter((c) => c.region === region);

// Detail adapted to the scale of each map: the southern fjords have thousands of
// points and islets that would all land on the same pixel of a region map. Working on
// the topology (not per feature) keeps shared borders identical, so no gaps appear.
const weighted = presimplify(topo as Parameters<typeof presimplify>[0]);
const byScale = new Map<number, { topology: Topology; comunas: ComunaCollection }>();

function atScale(degreesPerPixel: number) {
  // Bucket scales to powers of two so the 345 comuna pages reuse a handful of versions.
  const level = Math.floor(Math.log2(degreesPerPixel));
  let version = byScale.get(level);
  if (!version) {
    const pixelArea = (2 ** level) ** 2;
    const simplified = simplify(weighted, pixelArea * 2);
    // Drop islets smaller than about 4 × 4 px at this scale.
    const filtered = filter(
      simplified,
      filterWeight(simplified, pixelArea * 16, planarRingArea),
    ) as unknown as Topology;
    version = { topology: filtered, comunas: toComunas(filtered) };
    byScale.set(level, version);
  }
  return version;
}

const comunasAtScale = (degreesPerPixel: number) => atScale(degreesPerPixel).comunas;

const degreesPerPixel = (target: ComunaFeature | ComunaCollection, pixels: number) => {
  const [[west], [east]] = geoBounds(target);
  return (east - west) / pixels;
};

export interface ComunaShape extends ComunaProps {
  d: string;
  centroid: [number, number];
}

// Projects a region's mainland comunas into SVG coordinates for a map `width` units wide.
export function projectRegion(region: string, width: number) {
  const inRegion = (f: ComunaFeature) =>
    f.properties.region === region && !INSULAR_COMUNAS.has(f.properties.cut);
  const full: ComunaCollection = {
    type: "FeatureCollection",
    features: allComunas.features.filter(inRegion),
  };
  const collection: ComunaCollection = {
    type: "FeatureCollection",
    features: comunasAtScale(degreesPerPixel(full, width)).features.filter(inRegion),
  };

  const projection = geoMercator().fitWidth(width, collection);
  // One decimal is sub-pixel at this size and keeps the inline SVG small.
  const path = geoPath(projection).digits(1);
  const [, [, bottom]] = path.bounds(collection);

  const shapes: ComunaShape[] = collection.features.map((f) => ({
    ...f.properties,
    d: path(f) ?? "",
    centroid: path.centroid(f),
  }));
  const empty = shapes.filter((s) => !s.d);
  if (empty.length) throw new Error(`Comunas lost at this scale: ${empty.map((s) => s.name)}`);

  return { width, height: Math.ceil(bottom), shapes };
}

// Projects a single comuna to fill a `size` × `size` box, plus any points inside it.
export function projectComuna(cut: string, size: number, points: [number, number][] = []) {
  const full = allComunas.features.find((f) => f.properties.cut === cut);
  if (!full) throw new Error(`Unknown comuna ${cut}`);
  const comuna =
    comunasAtScale(degreesPerPixel(full, size)).features.find((f) => f.properties.cut === cut) ??
    full;

  const projection = geoMercator().fitSize([size, size], comuna);
  const path = geoPath(projection).digits(1);
  const [[left, top], [right, bottom]] = path.bounds(comuna);

  return {
    viewBox: [left, top, right - left, bottom - top].map((n) => Math.round(n)).join(" "),
    d: path(comuna) ?? "",
    points: points.map((p) => projection(p) ?? [0, 0]),
  };
}

// ---------------------------------------------------------------------------
// Chile in three columns (north, center, south) for the home map.

export interface ChileRegionShape {
  region: string;
  d: string;
  centroid: [number, number];
}

export interface InsetShape extends ComunaProps {
  d: string;
  box: { x: number; y: number; width: number; height: number };
}

type Geometries = { type: string; properties: ComunaProps }[];
type RegionsGeometries = { type: string; properties: { region: string } }[];
const UNMARKED_REGION = "00";

// `columns` lists region codes per column, north to south.
export function projectChile(columns: string[][], width: number, gap = 24) {
  const unit = geoPath(geoMercator().scale(1).translate([0, 0]));
  const comunaGeometries = (t: Topology) =>
    (t.objects.comunas as unknown as { geometries: Geometries }).geometries;

  // Mainland region shapes, merged from their comunas so islands do not stretch them.
  const mergeRegion = (t: Topology, code: string) =>
    merge(
      t as Parameters<typeof merge>[0],
      comunaGeometries(t).filter(
        (g) => g.properties.region === code && !INSULAR_COMUNAS.has(g.properties.cut),
      ) as unknown as Parameters<typeof merge>[1],
    );

  const fullColumns = columns.map((codes) => ({
    type: "FeatureCollection" as const,
    features: codes.map((code) => ({
      type: "Feature" as const,
      properties: {},
      geometry: mergeRegion(topo, code),
    })),
  }));
  const unitBounds = fullColumns.map((c) => unit.bounds(c));
  const unitWidths = unitBounds.map(([[x0], [x1]]) => x1 - x0);
  const unitHeights = unitBounds.map(([[, y0], [, y1]]) => y1 - y0);

  // One scale for all columns, so region sizes stay comparable across them.
  const scale = (width - gap * (columns.length - 1)) / unitWidths.reduce((a, b) => a + b, 0);
  const lonSpan = fullColumns
    .map((c) => {
      const [[west], [east]] = geoBounds(c);
      return east - west;
    })
    .reduce((a, b) => a + b, 0);
  const { topology: simplified } = atScale(lonSpan / width);

  const unmarked = (
    simplified.objects.regions as unknown as { geometries: RegionsGeometries }
  ).geometries.filter((g) => g.properties.region === UNMARKED_REGION);

  let x = 0;
  const regions: ChileRegionShape[] = [];
  const unmarkedPaths: string[] = [];
  const columnFrames: { x: number; width: number; height: number }[] = [];

  columns.forEach((codes, i) => {
    const [[x0, y0]] = unitBounds[i];
    const projection = geoMercator()
      .scale(scale)
      .translate([x - x0 * scale, -y0 * scale]);
    const path = geoPath(projection).digits(1);
    for (const code of codes) {
      const shape = {
        type: "Feature" as const,
        properties: {},
        geometry: mergeRegion(simplified, code),
      };
      regions.push({ region: code, d: path(shape) ?? "", centroid: path.centroid(shape) });
    }
    // The undemarcated Campo de Hielo Sur area sits in the southern column.
    if (i === columns.length - 1) {
      for (const g of unmarked) {
        const d = path(feature(simplified, g as never) as never);
        if (d) unmarkedPaths.push(d);
      }
    }
    columnFrames.push({ x, width: unitWidths[i] * scale, height: unitHeights[i] * scale });
    x += unitWidths[i] * scale + gap;
  });

  const height = Math.ceil(Math.max(...columnFrames.map((c) => c.height)));

  // Island insets, each fitted into its own box. With one column they go in the empty
  // Pacific west of northern Chile (the map is widest in the far south); with several
  // columns, under the shortest one.
  const single = columnFrames.length === 1;
  const shortest = columnFrames.reduce((a, b) => (b.height < a.height ? b : a));
  // Small and in the top-left corner: the coast is farthest from the left edge up north,
  // so the islands read clearly as offshore without widening the map.
  const insetSize = single ? Math.min(width * 0.25, 56) : Math.min(shortest.width, 90);
  const insets: InsetShape[] = [...INSULAR_COMUNAS].map((cut, i) => {
    const comuna = allComunas.features.find((f) => f.properties.cut === cut)!;
    const box = single
      ? {
          x: 0,
          y: height * 0.03 + i * (insetSize + gap * 1.5),
          width: insetSize,
          height: insetSize,
        }
      : {
          x: shortest.x + (shortest.width - insetSize) / 2,
          y: shortest.height + gap * 2 + i * (insetSize + gap * 1.5),
          width: insetSize,
          height: insetSize,
        };
    const padding = single ? 8 : 12;
    const projection = geoMercator().fitExtent(
      [
        [box.x + padding, box.y + padding],
        [box.x + box.width - padding, box.y + box.height - padding],
      ],
      comuna,
    );
    return { ...comuna.properties, d: geoPath(projection).digits(1)(comuna) ?? "", box };
  });
  const insetsBottom = Math.max(...insets.map((s) => s.box.y + s.box.height));

  return {
    width,
    height: Math.ceil(Math.max(height, insetsBottom)),
    regions,
    unmarked: unmarkedPaths,
    insets,
    columns: columnFrames,
  };
}
