import {
  geoMercator,
  geoPath,
  type ExtendedFeature,
  type ExtendedFeatureCollection,
  type GeoGeometryObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import topology from "../data/rm.topo.json";

export interface ComunaProps {
  cut: string;
  name: string;
  provincia: string;
}
type ComunaFeature = ExtendedFeature<GeoGeometryObjects, ComunaProps>;

const topo = topology as unknown as Parameters<typeof feature>[0];
const collection = feature(
  topo,
  topo.objects.comunas,
) as unknown as ExtendedFeatureCollection<ComunaFeature>;

export const comunas: ComunaProps[] = collection.features.map((f) => f.properties);

export interface ComunaShape extends ComunaProps {
  d: string;
  centroid: [number, number];
}

// Projects every comuna into SVG coordinates for a map `width` units wide.
export function projectComunas(width: number) {
  const projection = geoMercator().fitWidth(width, collection);
  // One decimal is sub-pixel at this size and keeps the inline SVG small.
  const path = geoPath(projection).digits(1);
  const [, [, bottom]] = path.bounds(collection);

  const shapes: ComunaShape[] = collection.features.map((f) => ({
    ...f.properties,
    d: path(f) ?? "",
    centroid: path.centroid(f),
  }));

  return { width, height: Math.ceil(bottom), shapes };
}
