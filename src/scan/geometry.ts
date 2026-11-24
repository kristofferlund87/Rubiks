/**
 * Geometri för att läsa av en kub från en bild där ett hörn pekar mot kameran.
 *
 * Kuben ser då ut som en sexhörning med sju punkter:
 *
 *            T
 *      TL         TR
 *            C
 *      BL         BR
 *            B
 *
 * C är hörnet närmast kameran. Tre sidor syns: "top" (C-TL-T-TR),
 * "left" (C-B-BL-TL) och "right" (C-TR-BR-B).
 */
import { faceletIndexAt, type Vec3 } from '../cube/model';

export type Point = { x: number; y: number };

export const HEX_KEYS = ['C', 'T', 'TR', 'BR', 'B', 'BL', 'TL'] as const;
export type HexKey = (typeof HEX_KEYS)[number];
export type Hexagon = Record<HexKey, Point>;

export const SLOTS = ['top', 'left', 'right'] as const;
export type Slot = (typeof SLOTS)[number];

/**
 * Varje sida som en fyrhörning [p00, p01, p10, p11] där p01 ligger längs
 * kolumnerna och p10 längs raderna från p00 (p11 är motstående hörn).
 */
const SLOT_QUADS: Record<Slot, [HexKey, HexKey, HexKey, HexKey]> = {
  top: ['T', 'TR', 'TL', 'C'],
  left: ['TL', 'C', 'BL', 'B'],
  right: ['C', 'TR', 'B', 'BR'],
};

/** En regelbunden sexhörning, startläget för ramen. */
export function regularHexagon(cx: number, cy: number, r: number): Hexagon {
  const dx = r * Math.cos(Math.PI / 6);
  return {
    C: { x: cx, y: cy },
    T: { x: cx, y: cy - r },
    TR: { x: cx + dx, y: cy - r / 2 },
    BR: { x: cx + dx, y: cy + r / 2 },
    B: { x: cx, y: cy + r },
    BL: { x: cx - dx, y: cy + r / 2 },
    TL: { x: cx - dx, y: cy - r / 2 },
  };
}

/**
 * Homografi som avbildar enhetskvadraten på en fyrhörning:
 * (0,0)->p00, (1,0)->p01, (0,1)->p10, (1,1)->p11. Hanterar perspektiv.
 */
export function quadMapper(p00: Point, p01: Point, p10: Point, p11: Point) {
  // Standardformel (Heckbert) för kvadrat -> fyrhörning.
  const [x0, y0, x1, y1, x2, y2, x3, y3] = [p00.x, p00.y, p01.x, p01.y, p11.x, p11.y, p10.x, p10.y];
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return (u: number, v: number): Point => {
    const w = g * u + h * v + 1;
    return { x: (a * u + b * v + c) / w, y: (d * u + e * v + f) / w };
  };
}

export function slotMapper(hex: Hexagon, slot: Slot) {
  const [a, b, c, d] = SLOT_QUADS[slot];
  return quadMapper(hex[a], hex[b], hex[c], hex[d]);
}

/** Mitten av varje ruta (rad r, kolumn c) i en sida, i bildkoordinater. */
export function stickerPoints(hex: Hexagon, slot: Slot): Point[] {
  const map = slotMapper(hex, slot);
  const pts: Point[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) pts.push(map((c + 0.5) / 3, (r + 0.5) / 3));
  return pts;
}

/** Linjer för rutnätet i en sida (för att rita ramen). */
export function gridLines(hex: Hexagon, slot: Slot): [Point, Point][] {
  const map = slotMapper(hex, slot);
  const lines: [Point, Point][] = [];
  for (const t of [0, 1 / 3, 2 / 3, 1]) {
    lines.push([map(t, 0), map(t, 1)]);
    lines.push([map(0, t), map(1, t)]);
  }
  return lines;
}

const add = (...vs: Vec3[]): Vec3 => vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];
const scale = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k];

export function det3(a: Vec3, b: Vec3, c: Vec3): number {
  return a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
}

/**
 * Är detta ett hörn som kan synas med sidan `top` uppåt, `left` till vänster och
 * `right` till höger? (Tre olika axlar och rätt "handighet".)
 */
export function isValidCorner(top: Vec3, left: Vec3, right: Vec3): boolean {
  return det3(top, left, right) === 1;
}

/**
 * För en bild där sidorna med normalerna top/left/right syns: vilket
 * facelet-index motsvarar varje ruta? Returnerar 27 index i ordningen
 * top(9), left(9), right(9) – samma ordning som stickerPoints.
 */
export function faceletIndicesForView(top: Vec3, left: Vec3, right: Vec3): number[] {
  const n: Record<Slot, Vec3> = { top, left, right };
  const k = 1.5;
  const V: Record<HexKey, Vec3> = {
    C: scale(add(top, left, right), k),
    TL: scale(add(top, left, neg(right)), k),
    TR: scale(add(top, neg(left), right), k),
    T: scale(add(top, neg(left), neg(right)), k),
    B: scale(add(neg(top), left, right), k),
    BL: scale(add(neg(top), left, neg(right)), k),
    BR: scale(add(neg(top), neg(left), right), k),
  };
  const result: number[] = [];
  for (const slot of SLOTS) {
    const [q00, q01, q10] = SLOT_QUADS[slot].map((key) => V[key]);
    const normal = n[slot];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const u = (c + 0.5) / 3, v = (r + 0.5) / 3;
        const p = [0, 1, 2].map((i) => q00[i] + u * (q01[i] - q00[i]) + v * (q10[i] - q00[i]));
        // I sidans plan ligger mitten på -1/0/1; längs normalen är bitens läge ±1.
        const pos = p.map((x, i) => (normal[i] !== 0 ? normal[i] : Math.round(x))) as Vec3;
        const idx = faceletIndexAt(pos, normal);
        if (idx === undefined) throw new Error('Ogiltig vy');
        result.push(idx);
      }
  }
  return result;
}
