/**
 * Färghantering för avläsning.
 *
 * Färgerna jämförs i ett "kulörplan" i stället för på ljusstyrka: skuggor och
 * mörka eller ljusa bilder ändrar mest ljusstyrkan, medan kulören (röd, gul,
 * blå …) och mättnaden (hur färgstark den är) är mycket stabilare. Vitt har låg
 * mättnad och hamnar nära mitten, färgerna runt om efter kulör.
 */
import type { Face } from '../cube/model';

export type RGB = [number, number, number];
/** [mättnad·cos(kulör), mättnad·sin(kulör), viktad ljusstyrka] */
export type Feature = [number, number, number];

/** Hur mycket ljusstyrkan väger. Lite, men nog för att skilja mörka fall åt. */
const VALUE_WEIGHT = 0.2;

export function rgbToFeature([r, g, b]: RGB): Feature {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max / 255;
  const s = max > 0 ? (max - min) / max : 0;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= Math.PI / 3;
  }
  return [s * Math.cos(h), s * Math.sin(h), VALUE_WEIGHT * v];
}

export function featureDistance(a: Feature, b: Feature): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Typiska färger på en kub (standardfärgschema: vit upp, grön fram). */
export const NOMINAL: Record<Face, Feature> = {
  U: rgbToFeature([225, 220, 210]), // vit
  R: rgbToFeature([200, 25, 20]), // röd
  F: rgbToFeature([20, 160, 60]), // grön
  D: rgbToFeature([230, 205, 0]), // gul
  L: rgbToFeature([250, 115, 0]), // orange
  B: rgbToFeature([20, 60, 180]), // blå
};

/** Alla permutationer av en lista (6! = 720 för sidorna). */
export function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]),
  );
}
