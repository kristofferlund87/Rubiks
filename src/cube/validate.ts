import { COLORS, FACES, type Face, type Facelets } from './model';

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

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string; stickers?: number[] };

const colorList = (faces: (Face | null)[]) =>
  faces.map((f) => (f ? COLORS[f].name.toLowerCase() : 'okänd')).join(', ');

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
      message: `${missing.length} ${missing.length === 1 ? 'ruta saknar' : 'rutor saknar'} färg.`,
      stickers: missing,
    };
  }

  const counts = colorCounts(state);
  const wrong = FACES.filter((f) => counts[f] !== 9);
  if (wrong.length > 0) {
    const parts = wrong.map((f) => `${COLORS[f].name.toLowerCase()} (${counts[f]})`);
    return {
      ok: false,
      message: `Varje färg ska finnas exakt 9 gånger. Fel antal: ${parts.join(', ')}.`,
    };
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
        message: `Det finns inget hörn med färgerna ${colorList(idx.map((k) => state[k]))}. Kolla de markerade rutorna.`,
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
        message: `Det finns ingen kantbit med färgerna ${colorList([state[a], state[b]])}. Kolla de markerade rutorna.`,
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
      message: `Hörnet ${colorList(CORNER_COLORS[cp[dupCorner]])} finns mer än en gång.`,
      stickers: same.flatMap((i) => CORNER_FACELETS[i]),
    };
  }
  const dupEdge = ep.findIndex((v, i) => ep.indexOf(v) !== i);
  if (dupEdge >= 0) {
    const same = ep.map((v, i) => (v === ep[dupEdge] ? i : -1)).filter((i) => i >= 0);
    return {
      ok: false,
      message: `Kantbiten ${colorList(EDGE_COLORS[ep[dupEdge]])} finns mer än en gång.`,
      stickers: same.flatMap((i) => EDGE_FACELETS[i]),
    };
  }

  if (twist % 3 !== 0) {
    return {
      ok: false,
      message:
        'Ett hörn verkar vara vridet. Det kan inte hända med vanliga vridningar – kolla att färgerna på hörnen stämmer (eller om kuben har plockats isär).',
    };
  }
  if (flip % 2 !== 0) {
    return {
      ok: false,
      message:
        'En kantbit verkar vara vänd åt fel håll. Kolla att färgerna på kanterna stämmer (eller om kuben har plockats isär).',
    };
  }
  if (parity(cp) !== parity(ep)) {
    return {
      ok: false,
      message:
        'Två bitar verkar ha bytt plats med varandra. Kolla att du har fyllt i rätt – en sådan kub går inte att lösa.',
    };
  }
  return { ok: true };
}
