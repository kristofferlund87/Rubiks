import { describe, expect, it } from 'vitest';
import { applyMoves, FACES, NORMALS, randomScramble, SOLVED, type Face } from '../cube/model';
import { validate } from '../cube/validate';
import { assemble } from './assemble';
import type { RGB } from './color';
import type { Sample } from './sample';
import {
  faceletIndicesForView,
  flipHexagon,
  isFlipped,
  isValidCorner,
  quadMapper,
  regularHexagon,
  SLOTS,
  stickerPoints,
} from './geometry';

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
function photograph(state: Face[], view: Face[], rand: () => number, light: RGB): Sample[] {
  const [t, l, r] = view.map((f) => NORMALS[f]);
  return faceletIndicesForView(t, l, r).map((idx) => {
    const base = PHOTO_RGB[state[idx]];
    const rgb = base.map((c, k) => Math.max(0, Math.min(255, c * light[k] + (rand() - 0.5) * 30))) as RGB;
    return { rgb, spread: 4 + rand() * 8 };
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

  it('upp-och-nervänd ram = samma avläsning som en bild vriden ett halvt varv', () => {
    const hex = regularHexagon(50, 50, 40);
    const flipped = flipHexagon(hex);
    expect(isFlipped(hex)).toBe(false);
    expect(isFlipped(flipped)).toBe(true);
    expect(flipHexagon(flipped)).toEqual(hex);
    for (const slot of SLOTS) {
      const a = stickerPoints(hex, slot);
      const b = stickerPoints(flipped, slot);
      a.forEach((p, i) => {
        expect(b[i].x).toBeCloseTo(100 - p.x);
        expect(b[i].y).toBeCloseTo(100 - p.y);
      });
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
    let uncertainTotal = 0;
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
        uncertainTotal += result.uncertain.length;
      }
    }
    // Vanliga bilder ska sällan ge falsklarm.
    expect(uncertainTotal / 40).toBeLessThan(1);
  });

  it('markerar rutor med reflex eller tvetydig färg som osäkra', () => {
    const rand = seeded(5);
    const state = applyMoves(SOLVED, randomScramble(25, rand));
    const v1: Face[] = ['U', 'F', 'R'];
    const v2: Face[] = ['D', 'L', 'B'];
    const p1 = photograph(state, v1, rand, [1, 1, 1]);
    const p2 = photograph(state, v2, rand, [1, 1, 1]);
    const ids1 = faceletIndicesForView(NORMALS.U, NORMALS.F, NORMALS.R);
    p1[0] = { ...p1[0], spread: 60 }; // ojämn färg
    p1[1] = { rgb: [222, 75, 35], spread: 6 }; // mitt emellan rött och orange
    const result = assemble(p1, p2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.uncertain).toContain(ids1[0]);
      expect(result.uncertain).toContain(ids1[1]);
    }
  });

  it('en reflex knuffar inte ut en riktig ruta: reflexrutan får den färg som blir över', () => {
    const rand = seeded(8);
    for (let n = 0; n < 20; n++) {
      const state = applyMoves(SOLVED, randomScramble(25, rand));
      const p1 = photograph(state, ['U', 'F', 'R'], rand, [1, 1, 1]);
      const p2 = photograph(state, ['D', 'L', 'B'], rand, [1, 1, 1]);
      // Tre helt vita reflexer på icke-mittrutor.
      for (const k of [0, 10, 20]) p1[k] = { rgb: [255, 255, 255], spread: 3 };
      const result = assemble(p1, p2);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const ids = faceletIndicesForView(NORMALS.U, NORMALS.F, NORMALS.R);
      for (const k of [0, 10, 20]) expect(result.uncertain).toContain(ids[k]);
      // Fel får bara uppstå på reflexrutorna själva (som är markerade) –
      // inga andra rutor får knuffas ut.
      const glare = [0, 10, 20].map((k) => ids[k]);
      const wrong = result.facelets.map((f, i) => (f === state[i] ? -1 : i)).filter((i) => i >= 0);
      for (const w of wrong) expect(glare).toContain(w);
    }
  });
});
