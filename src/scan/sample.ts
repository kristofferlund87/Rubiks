import type { RGB } from './color';
import { slotMapper, SLOTS, type Hexagon, type Point } from './geometry';

export interface Sample {
  /** Rutans färg (median, så att små reflexer inte förstör den). */
  rgb: RGB;
  /**
   * Hur mycket ljusheten varierar inom provet (standardavvikelse, 0–255).
   * Högt värde = reflex, skugga eller att provet hamnat på kanten mellan rutor.
   */
  spread: number;
}

/** Över detta räknas ett prov som opålitligt. */
export const SPREAD_LIMIT = 30;

/**
 * Överexponerat (reflex): nästan helvitt och ljusare än en vit ruta brukar bli.
 * En vit ruta i normalt ljus hamnar runt 210–240.
 */
export function isBlownOut([r, g, b]: RGB): boolean {
  return Math.max(r, g, b) >= 250 && Math.min(r, g, b) >= 230;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Färgprov i en liten ruta runt en punkt. */
export function samplePatch(img: ImageData, p: Point, radius: number): Sample {
  const r = Math.max(1, Math.round(radius));
  const x0 = Math.max(0, Math.round(p.x) - r), x1 = Math.min(img.width - 1, Math.round(p.x) + r);
  const y0 = Math.max(0, Math.round(p.y) - r), y1 = Math.min(img.height - 1, Math.round(p.y) + r);
  const rs: number[] = [], gs: number[] = [], bs: number[] = [], ls: number[] = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = (y * img.width + x) * 4;
      const [R, G, B] = [img.data[i], img.data[i + 1], img.data[i + 2]];
      rs.push(R);
      gs.push(G);
      bs.push(B);
      ls.push(0.299 * R + 0.587 * G + 0.114 * B);
    }
  if (!ls.length) return { rgb: [0, 0, 0], spread: 255 };
  const mean = ls.reduce((s, v) => s + v, 0) / ls.length;
  const spread = Math.sqrt(ls.reduce((s, v) => s + (v - mean) ** 2, 0) / ls.length);
  return { rgb: [median(rs), median(gs), median(bs)], spread };
}

/** För mörkt för att avgöra färgen säkert (skugga, svart plast, bakgrund). */
export function isTooDark(rgb: RGB): boolean {
  return Math.max(...rgb) < 60;
}

const lumOf = ([r, g, b]: RGB) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Förskjutning (i sidans enhetskoordinater) för delproverna i en ruta. */
const SUB = 0.075;
const SUB_OFFSETS: [number, number][] = [
  [0, 0],
  [-SUB, -SUB],
  [SUB, -SUB],
  [-SUB, SUB],
  [SUB, SUB],
];

/**
 * 27 färgprover (top, left, right) för en bild och ram.
 *
 * Varje ruta provas på fem ställen (mitten + fyra mot hörnen) och färgen blir
 * medianen. En logga, en reflex eller en bit av kanten mellan rutorna slår då
 * inte igenom. För mittrutorna används bara de fyra hörnproverna, eftersom
 * många kuber har en logga mitt på.
 */
export function sampleHexagon(img: ImageData, hex: Hexagon): Sample[] {
  const size = Math.hypot(hex.T.x - hex.C.x, hex.T.y - hex.C.y);
  const radius = size * 0.035;
  return SLOTS.flatMap((slot) => {
    const map = slotMapper(hex, slot);
    const out: Sample[] = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const u = (c + 0.5) / 3, v = (r + 0.5) / 3;
        const offsets = r === 1 && c === 1 ? SUB_OFFSETS.slice(1) : SUB_OFFSETS;
        const subs = offsets.map(([du, dv]) => samplePatch(img, map(u + du, v + dv), radius));
        const rgb = [0, 1, 2].map((k) => median(subs.map((s) => s.rgb[k]))) as RGB;
        // Ojämnt om delproverna själva är brusiga, eller om flera av dem skiljer
        // sig tydligt från rutans färg (t.ex. hamnar på kanten eller utanför).
        const L = lumOf(rgb);
        const outliers = subs.filter((s) => Math.abs(lumOf(s.rgb) - L) > 45).length;
        const spread = Math.max(median(subs.map((s) => s.spread)), outliers >= 2 ? 2 * SPREAD_LIMIT : 0);
        out.push({ rgb, spread });
      }
    return out;
  });
}

/**
 * dark = bilden är för mörk, glare = överexponerade rutor (reflexer/för starkt
 * ljus), uneven = flera rutor har ojämn färg (reflex, skugga eller ramen ligger fel).
 */
export type PhotoIssue = 'dark' | 'glare' | 'uneven';

/** Varningar om en bild, utifrån dess 27 prover. */
export function photoIssues(samples: Sample[]): PhotoIssue[] {
  const issues: PhotoIssue[] = [];
  const lum = samples.map(({ rgb: [r, g, b] }) => 0.299 * r + 0.587 * g + 0.114 * b);
  if (median(lum) < 55) issues.push('dark');
  if (samples.some((s) => isBlownOut(s.rgb))) issues.push('glare');
  if (samples.filter((s) => s.spread > SPREAD_LIMIT).length >= 2) issues.push('uneven');
  return issues;
}

/** Rita en bildkälla till en canvas, nedskalad till högst `maxSize` pixlar. */
export function toImageData(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  crop?: { x: number; y: number; w: number; h: number },
  maxSize = 1024,
): { data: ImageData; url: string } {
  const c = crop ?? { x: 0, y: 0, w: sw, h: sh };
  const k = Math.min(1, maxSize / Math.max(c.w, c.h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(c.w * k);
  canvas.height = Math.round(c.h * k);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, c.x, c.y, c.w, c.h, 0, 0, canvas.width, canvas.height);
  return {
    data: ctx.getImageData(0, 0, canvas.width, canvas.height),
    url: canvas.toDataURL('image/jpeg', 0.9),
  };
}

/**
 * Hur väl ramen verkar passa: färre ojämna/opålitliga prover och mindre
 * variation = bättre. Används för att välja mellan Y och upp-och-nervänt Y.
 */
export function fitScore(samples: Sample[]): number {
  return samples.reduce((s, x) => s + Math.min(x.spread, 2 * SPREAD_LIMIT), 0);
}
