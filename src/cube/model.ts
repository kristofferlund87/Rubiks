/**
 * Kubmodell i Kociemba-format.
 *
 * Kubens tillstånd är en sträng/array med 54 klistermärken i ordningen
 * U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53). Varje sida läses rad för
 * rad så som den ser ut i en vanlig utvikt kub (U ovanför F, L-F-R-B i rad,
 * D under F).
 *
 * Varje klistermärke har en 3D-punkt p = 2 * bitensPosition + normal där
 * bitens position har koordinater i {-1, 0, 1}. x pekar åt höger, y uppåt och
 * z mot betraktaren (fram).
 */

export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];

/** Ett klistermärke är antingen en känd sida (färg) eller okänt (null). */
export type Sticker = Face | null;
export type Facelets = Sticker[];

export const SOLVED: Face[] = FACES.flatMap((f) => Array<Face>(9).fill(f));

export const COLORS: Record<Face, { hex: string }> = {
  U: { hex: '#f4f4f4' }, // vit
  R: { hex: '#d0213b' }, // röd
  F: { hex: '#0aa34f' }, // grön
  D: { hex: '#ffd31a' }, // gul
  L: { hex: '#ff6a13' }, // orange
  B: { hex: '#1663d6' }, // blå
};
export const UNKNOWN_HEX = '#5b6270';

export type Vec3 = [number, number, number];

const NORMALS: Record<Face, Vec3> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

/** Bitens position för klistermärke (rad r, kolumn c) på en sida. */
function cubiePos(face: Face, r: number, c: number): Vec3 {
  switch (face) {
    case 'U':
      return [c - 1, 1, r - 1];
    case 'R':
      return [1, 1 - r, 1 - c];
    case 'F':
      return [c - 1, 1 - r, 1];
    case 'D':
      return [c - 1, -1, 1 - r];
    case 'L':
      return [-1, 1 - r, c - 1];
    case 'B':
      return [1 - c, 1 - r, -1];
  }
}

export interface StickerGeom {
  index: number;
  face: Face;
  pos: Vec3; // bitens position
  normal: Vec3;
}

export const GEOMETRY: StickerGeom[] = FACES.flatMap((face, fi) =>
  Array.from({ length: 9 }, (_, i) => ({
    index: fi * 9 + i,
    face,
    pos: cubiePos(face, Math.floor(i / 3), i % 3),
    normal: NORMALS[face],
  })),
);

const key = (p: Vec3) => p.join(',');
const POINT_TO_INDEX = new Map<string, number>(
  GEOMETRY.map((g) => [key(g.pos.map((v, i) => 2 * v + g.normal[i]) as Vec3), g.index]),
);

/** Vrid en punkt 90° (quarter = +1) eller -90° (quarter = -1) kring en axel. */
export function rotate(p: Vec3, axis: 0 | 1 | 2, quarter: 1 | -1): Vec3 {
  const [x, y, z] = p;
  const s = quarter;
  if (axis === 0) return [x, -s * z, s * y];
  if (axis === 1) return [s * z, y, -s * x];
  return [-s * y, s * x, z];
}

/** Hur varje sidvridning (medurs) ser ut i 3D. */
export const MOVE_DEFS: Record<Face, { axis: 0 | 1 | 2; layer: 1 | -1; quarter: 1 | -1 }> = {
  U: { axis: 1, layer: 1, quarter: -1 },
  D: { axis: 1, layer: -1, quarter: 1 },
  R: { axis: 0, layer: 1, quarter: -1 },
  L: { axis: 0, layer: -1, quarter: 1 },
  F: { axis: 2, layer: 1, quarter: -1 },
  B: { axis: 2, layer: -1, quarter: 1 },
};

export interface Move {
  face: Face;
  /** 1 = medurs, 2 = halvvarv, 3 = moturs */
  turns: 1 | 2 | 3;
}

export function moveToString(m: Move): string {
  return m.face + (m.turns === 1 ? '' : m.turns === 2 ? '2' : "'");
}

export function parseAlg(alg: string): Move[] {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const face = tok[0] as Face;
      if (!FACES.includes(face)) throw new Error(`Okänt drag: ${tok}`);
      const suffix = tok.slice(1);
      const turns = suffix === '' ? 1 : suffix === '2' ? 2 : suffix === "'" ? 3 : null;
      if (turns === null) throw new Error(`Okänt drag: ${tok}`);
      return { face, turns };
    });
}

export function invertMove(m: Move): Move {
  return { face: m.face, turns: (4 - m.turns) as 1 | 2 | 3 };
}

/** Permutation för en medurs kvartsvridning: nytt[perm[i]] = gammalt[i]. */
const QUARTER_PERMS: Record<Face, number[]> = Object.fromEntries(
  FACES.map((face) => {
    const { axis, layer, quarter } = MOVE_DEFS[face];
    const perm = GEOMETRY.map((g) => {
      const p = g.pos.map((v, i) => 2 * v + g.normal[i]) as Vec3;
      if (p[axis] * layer < 2) return g.index;
      const target = POINT_TO_INDEX.get(key(rotate(p, axis, quarter)));
      if (target === undefined) throw new Error('Trasig geometri');
      return target;
    });
    return [face, perm];
  }),
) as Record<Face, number[]>;

export function applyMove<T>(state: T[], m: Move): T[] {
  let cur = state;
  for (let t = 0; t < m.turns; t++) {
    const perm = QUARTER_PERMS[m.face];
    const next = new Array<T>(54);
    for (let i = 0; i < 54; i++) next[perm[i]] = cur[i];
    cur = next;
  }
  return cur;
}

export function applyMoves<T>(state: T[], moves: Move[]): T[] {
  return moves.reduce((s, m) => applyMove(s, m), state);
}

export function isSolved(state: Facelets): boolean {
  return state.every((s, i) => s === SOLVED[i]);
}

export function toKociembaString(state: Facelets): string {
  return state.map((s) => s ?? '?').join('');
}

export function randomScramble(length = 25, rand: () => number = Math.random): Move[] {
  const moves: Move[] = [];
  const opposite: Record<Face, Face> = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };
  while (moves.length < length) {
    const face = FACES[Math.floor(rand() * 6)];
    const prev = moves[moves.length - 1];
    const prev2 = moves[moves.length - 2];
    if (prev && prev.face === face) continue;
    // Undvik t.ex. "R L R" som bara är onödigt långt.
    if (prev && prev2 && prev2.face === face && opposite[face] === prev.face) continue;
    moves.push({ face, turns: (1 + Math.floor(rand() * 3)) as 1 | 2 | 3 });
  }
  return moves;
}

/** Klistermärken i mitten av varje sida – de flyttar sig aldrig. */
export const CENTER_INDICES = FACES.map((_, fi) => fi * 9 + 4);
