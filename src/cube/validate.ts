import { FACES, type Face, type Facelets } from './model';

/*
 * Kontroll av att en ifylld kub faktiskt går att lösa. Bygger på samma
 * hörn/kant-tabeller som Kociembas algoritm.
 */

// Index i facelet-strängen (U1=0, R1=9, F1=18, D1=27, L1=36, B1=45).
const U = 0, R = 9, F = 18, D = 27, L = 36, B = 45;

const CORNER_FACELETS = [
  [U + 8, R + 0, F + 2], // URF
  [U + 6, F + 0, L + 2], // UFL
  [U + 0, L + 0, B + 2], // ULB
  [U + 2, B + 0, R + 2], // UBR
  [D + 2, F + 8, R + 6], // DFR
  [D + 0, L + 8, F + 6], // DLF
  [D + 6, B + 8, L + 6], // DBL
  [D + 8, R + 8, B + 6], // DRB
];
const CORNER_COLORS: Face[][] = [
  ['U', 'R', 'F'], ['U', 'F', 'L'], ['U', 'L', 'B'], ['U', 'B', 'R'],
  ['D', 'F', 'R'], ['D', 'L', 'F'], ['D', 'B', 'L'], ['D', 'R', 'B'],
];

const EDGE_FACELETS = [
  [U + 5, R + 1], [U + 7, F + 1], [U + 3, L + 1], [U + 1, B + 1],
  [D + 5, R + 7], [D + 1, F + 7], [D + 3, L + 7], [D + 7, B + 7],
  [F + 5, R + 3], [F + 3, L + 5], [B + 5, L + 3], [B + 3, R + 5],
];
const EDGE_COLORS: Face[][] = [
  ['U', 'R'], ['U', 'F'], ['U', 'L'], ['U', 'B'],
  ['D', 'R'], ['D', 'F'], ['D', 'L'], ['D', 'B'],
  ['F', 'R'], ['F', 'L'], ['B', 'L'], ['B', 'R'],
];

export type ValidationError =
  | { code: 'missing'; count: number }
  | { code: 'wrongCount'; counts: [Face, number][] }
  | { code: 'noCorner' | 'noEdge' | 'dupCorner' | 'dupEdge'; faces: (Face | null)[] }
  | { code: 'twist' | 'flip' | 'parity' };

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: ValidationError; stickers?: number[] };

function parity(perm: number[]): number {
  let p = 0;
  for (let i = 0; i < perm.length; i++)
    for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) p ^= 1;
  return p;
}

export function colorCounts(state: Facelets): Record<Face, number> {
  const counts = Object.fromEntries(FACES.map((f) => [f, 0])) as Record<Face, number>;
  for (const s of state) if (s) counts[s]++;
  return counts;
}

export function validate(state: Facelets): ValidationResult {
  const missing = state.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
  if (missing.length > 0) {
    return {
      ok: false,
      error: { code: 'missing', count: missing.length },
      stickers: missing,
    };
  }

  const counts = colorCounts(state);
  const wrong = FACES.filter((f) => counts[f] !== 9);
  if (wrong.length > 0) {
    return { ok: false, error: { code: 'wrongCount', counts: wrong.map((f) => [f, counts[f]]) } };
  }

  // Hörn
  const cp: number[] = [];
  let twist = 0;
  for (let i = 0; i < 8; i++) {
    const idx = CORNER_FACELETS[i];
    const ori = idx.findIndex((k) => state[k] === 'U' || state[k] === 'D');
    const c1 = state[idx[(ori + 1) % 3]];
    const c2 = state[idx[(ori + 2) % 3]];
    const j = ori < 0 ? -1 : CORNER_COLORS.findIndex((c) => c[1] === c1 && c[2] === c2);
    if (j < 0) {
      return {
        ok: false,
        error: { code: 'noCorner', faces: idx.map((k) => state[k]) },
        stickers: idx,
      };
    }
    cp.push(j);
    twist += ori;
  }

  // Kanter
  const ep: number[] = [];
  let flip = 0;
  for (let i = 0; i < 12; i++) {
    const [a, b] = EDGE_FACELETS[i];
    let j = EDGE_COLORS.findIndex((c) => c[0] === state[a] && c[1] === state[b]);
    let o = 0;
    if (j < 0) {
      j = EDGE_COLORS.findIndex((c) => c[0] === state[b] && c[1] === state[a]);
      o = 1;
    }
    if (j < 0) {
      return {
        ok: false,
        error: { code: 'noEdge', faces: [state[a], state[b]] },
        stickers: [a, b],
      };
    }
    ep.push(j);
    flip += o;
  }

  const dupCorner = cp.findIndex((v, i) => cp.indexOf(v) !== i);
  if (dupCorner >= 0) {
    const same = cp.map((v, i) => (v === cp[dupCorner] ? i : -1)).filter((i) => i >= 0);
    return {
      ok: false,
      error: { code: 'dupCorner', faces: CORNER_COLORS[cp[dupCorner]] },
      stickers: same.flatMap((i) => CORNER_FACELETS[i]),
    };
  }
  const dupEdge = ep.findIndex((v, i) => ep.indexOf(v) !== i);
  if (dupEdge >= 0) {
    const same = ep.map((v, i) => (v === ep[dupEdge] ? i : -1)).filter((i) => i >= 0);
    return {
      ok: false,
      error: { code: 'dupEdge', faces: EDGE_COLORS[ep[dupEdge]] },
      stickers: same.flatMap((i) => EDGE_FACELETS[i]),
    };
  }

  if (twist % 3 !== 0) return { ok: false, error: { code: 'twist' } };
  if (flip % 2 !== 0) return { ok: false, error: { code: 'flip' } };
  if (parity(cp) !== parity(ep)) return { ok: false, error: { code: 'parity' } };
  return { ok: true };
}
