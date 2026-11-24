import { describe, expect, it } from 'vitest';
import { applyMoves, FACES, NORMALS, randomScramble, SOLVED, type Face } from '../cube/model';
import { validate } from '../cube/validate';
import { assemble } from './assemble';
import type { RGB } from './color';
import { faceletIndicesForView, isValidCorner, quadMapper, regularHexagon, stickerPoints } from './geometry';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

const range = (a: number, n: number) => Array.from({ length: n }, (_, i) => a + i);

// Ungefär hur kubens färger ser ut på ett foto.
const PHOTO_RGB: Record<Face, RGB> = {
  U: [220, 222, 215],
  R: [185, 25, 45],
  F: [20, 150, 80],
  D: [235, 205, 30],
  L: [245, 105, 25],
  B: [25, 75, 180],
};

/** Alla giltiga vyer (hörn) som [top, left, right]. */
const VIEWS: Face[][] = FACES.flatMap((a) =>
  FACES.flatMap((b) => FACES.map((c) => [a, b, c])),
).filter(([a, b, c]) => isValidCorner(NORMALS[a], NORMALS[b], NORMALS[c]));

const opposite: Record<Face, Face> = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };

/** Skapa "fotade" färger för en vy med belysning (ljusstyrka + färgstick) och brus. */
function photograph(state: Face[], view: Face[], rand: () => number, light: RGB): RGB[] {
  const [t, l, r] = view.map((f) => NORMALS[f]);
  return faceletIndicesForView(t, l, r).map((idx) => {
    const base = PHOTO_RGB[state[idx]];
    return base.map((c, k) => Math.max(0, Math.min(255, c * light[k] + (rand() - 0.5) * 30))) as RGB;
  });
}

describe('geometri', () => {
  it('homografin träffar hörnen', () => {
    const p = [{ x: 10, y: 5 }, { x: 90, y: 20 }, { x: 0, y: 80 }, { x: 70, y: 110 }];
    const m = quadMapper(p[0], p[1], p[2], p[3]);
    for (const [[u, v], q] of [[[0, 0], p[0]], [[1, 0], p[1]], [[0, 1], p[2]], [[1, 1], p[3]]] as const) {
      const r = m(u, v);
      expect(r.x).toBeCloseTo(q.x);
      expect(r.y).toBeCloseTo(q.y);
    }
  });

  it('standardvyn (vit upp, grön vänster, röd höger) ger sidorna i läsordning', () => {
    expect(faceletIndicesForView(NORMALS.U, NORMALS.F, NORMALS.R)).toEqual([
      ...range(0, 9),
      ...range(18, 9),
      ...range(9, 9),
    ]);
  });

  it('det finns 24 giltiga vyer och varje vy täcker 27 olika rutor', () => {
    expect(VIEWS).toHaveLength(24);
    for (const [a, b, c] of VIEWS) {
      expect(new Set(faceletIndicesForView(NORMALS[a], NORMALS[b], NORMALS[c])).size).toBe(27);
    }
  });

  it('ger 27 provpunkter inuti sexhörningen', () => {
    const hex = regularHexagon(50, 50, 40);
    for (const slot of ['top', 'left', 'right'] as const) {
      for (const p of stickerPoints(hex, slot)) expect(Math.hypot(p.x - 50, p.y - 50)).toBeLessThan(40);
    }
  });
});

describe('avläsning', () => {
  it('läser av blandade kuber från två bilder i olika belysning och vinklar', () => {
    const rand = seeded(11);
    const lights: RGB[] = [
      [1, 1, 1],
      [1.05, 0.95, 0.8], // varmt inomhusljus
      [0.75, 0.75, 0.8], // mörkt
      [0.9, 0.95, 1.05], // kallt
    ];
    for (let n = 0; n < 40; n++) {
      const state = applyMoves(SOLVED, randomScramble(25, rand));
      const v1 = VIEWS[Math.floor(rand() * VIEWS.length)];
      // Andra bilden: motsatta hörnet, i valfri vridning.
      const v2opts = VIEWS.filter((v) => v.every((f) => v1.includes(opposite[f])));
      const v2 = v2opts[Math.floor(rand() * v2opts.length)];
      const light = lights[n % lights.length];
      const result = assemble(photograph(state, v1, rand, light), photograph(state, v2, rand, light));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.views).toEqual([v1, v2]);
        expect(result.facelets).toEqual(state);
        expect(validate(result.facelets).ok).toBe(true);
      }
    }
  });
});
