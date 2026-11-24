/**
 * Sätter ihop två bilder (27 färgprover var) till en hel kub.
 *
 * Proverna kommer i ordningen top(9), left(9), right(9) där index 4, 13 och 22
 * är mittrutorna.
 */
import { FACES, NORMALS, type Face, type Facelets } from '../cube/model';
import { labDistance, NOMINAL, permutations, rgbToLab, type Lab, type RGB } from './color';
import { faceletIndicesForView, isValidCorner, SLOTS } from './geometry';

export const CENTER_SAMPLES = [4, 13, 22];

export type AssembleResult =
  | { ok: true; facelets: Facelets; views: [Face[], Face[]] }
  | { ok: false; error: 'centers' };

/**
 * Bestäm vilken sida varje mittruta tillhör. Provar alla sätt att para ihop de
 * sex mittfärgerna med de sex sidorna och väljer det som liknar standardfärgerna
 * mest bland de som är fysiskt möjliga (två motstående hörn med rätt handighet).
 */
function identifyCenters(centers: Lab[]): [Face[], Face[]] | null {
  let best: { cost: number; faces: Face[] } | null = null;
  for (const perm of permutations(FACES)) {
    const v1 = perm.slice(0, 3), v2 = perm.slice(3);
    if (!isValidCorner(NORMALS[v1[0]], NORMALS[v1[1]], NORMALS[v1[2]])) continue;
    if (!isValidCorner(NORMALS[v2[0]], NORMALS[v2[1]], NORMALS[v2[2]])) continue;
    const cost = perm.reduce((s, f, i) => s + labDistance(centers[i], NOMINAL[f]), 0);
    if (!best || cost < best.cost) best = { cost, faces: perm };
  }
  return best ? [best.faces.slice(0, 3), best.faces.slice(3)] : null;
}

export function assemble(photo1: RGB[], photo2: RGB[]): AssembleResult {
  const labs = [...photo1, ...photo2].map(rgbToLab);
  const centerIdx = [...CENTER_SAMPLES, ...CENTER_SAMPLES.map((i) => i + 27)];
  const views = identifyCenters(centerIdx.map((i) => labs[i]));
  if (!views) return { ok: false, error: 'centers' };

  // Vilket facelet-index varje prov hör till.
  const indices = views.flatMap(([top, left, right]) =>
    faceletIndicesForView(NORMALS[top], NORMALS[left], NORMALS[right]),
  );

  // Fördela övriga rutor på sidorna så att varje färg får exakt 9 rutor.
  // Startreferens = mittrutans färg, sedan medelvärdet av det som tilldelats.
  const centerFace = new Map<number, Face>();
  views.forEach((faces, v) => SLOTS.forEach((_, s) => centerFace.set(v * 27 + s * 9 + 4, faces[s])));
  const refs = {} as Record<Face, Lab>;
  centerFace.forEach((f, i) => (refs[f] = labs[i]));

  const others = labs.map((_, i) => i).filter((i) => !centerFace.has(i));
  let assignment = new Map<number, Face>();
  for (let iter = 0; iter < 5; iter++) {
    const pairs: { i: number; f: Face; d: number }[] = [];
    for (const i of others) for (const f of FACES) pairs.push({ i, f, d: labDistance(labs[i], refs[f]) });
    pairs.sort((a, b) => a.d - b.d);
    const next = new Map<number, Face>();
    const used = Object.fromEntries(FACES.map((f) => [f, 0])) as Record<Face, number>;
    for (const { i, f } of pairs) {
      if (next.has(i) || used[f] >= 8) continue;
      next.set(i, f);
      used[f]++;
    }
    assignment = next;
    for (const f of FACES) {
      const members = [...assignment].filter(([, g]) => g === f).map(([i]) => labs[i]);
      [...centerFace].filter(([, g]) => g === f).forEach(([i]) => members.push(labs[i]));
      refs[f] = [0, 1, 2].map((k) => members.reduce((s, m) => s + m[k], 0) / members.length) as Lab;
    }
  }

  const facelets: Facelets = new Array(54).fill(null);
  labs.forEach((_, i) => {
    facelets[indices[i]] = centerFace.get(i) ?? assignment.get(i) ?? null;
  });
  return { ok: true, facelets, views };
}
