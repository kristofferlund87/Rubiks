/** Färghantering för avläsning: RGB -> Lab och avstånd. */
import type { Face } from '../cube/model';

export type RGB = [number, number, number];
export type Lab = [number, number, number];

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function rgbToLab([r8, g8, b8]: RGB): Lab {
  const r = srgbToLinear(r8), g = srgbToLinear(g8), b = srgbToLinear(b8);
  // D65
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Avstånd mellan två färger. Ljusheten (L) väger mindre eftersom den varierar
 * mycket med belysning och skuggor, medan själva färgtonen är stabilare.
 */
export function labDistance(a: Lab, b: Lab): number {
  const dl = (a[0] - b[0]) * 0.5;
  return Math.hypot(dl, a[1] - b[1], a[2] - b[2]);
}

/** Typiska färger på en kub (standardfärgschema: vit upp, grön fram). */
export const NOMINAL: Record<Face, Lab> = {
  U: rgbToLab([235, 235, 235]), // vit
  R: rgbToLab([200, 20, 40]), // röd
  F: rgbToLab([0, 160, 80]), // grön
  D: rgbToLab([250, 215, 0]), // gul
  L: rgbToLab([255, 110, 0]), // orange
  B: rgbToLab([0, 80, 200]), // blå
};

/** Alla permutationer av en lista (6! = 720 för sidorna). */
export function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]),
  );
}
