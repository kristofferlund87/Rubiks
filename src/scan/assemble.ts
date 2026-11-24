/**
 * Sätter ihop två bilder (27 färgprover var) till en hel kub.
 *
 * Proverna kommer i ordningen top(9), left(9), right(9) där index 4, 13 och 22
 * är mittrutorna.
 */
import { FACES, NORMALS, type Face, type Facelets } from '../cube/model';
import { labDistance, NOMINAL, permutations, rgbToLab, type Lab } from './color';
import { isBlownOut, SPREAD_LIMIT, type Sample } from './sample';
import { faceletIndicesForView, isValidCorner, SLOTS } from './geometry';

export const CENTER_SAMPLES = [4, 13, 22];

/**
 * En ruta räknas som osäker om dess färg ligger nästan lika nära en annan
 * färg som den tilldelade (avståndskvot över denna gräns).
 */
export const AMBIGUITY_LIMIT = 0.6;

export type AssembleResult =
  | {
      ok: true;
      facelets: Facelets;
      views: [Face[], Face[]];
      /** Facelet-index för rutor som appen är osäker på. */
      uncertain: number[];
    }
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

/** Reflex (överexponerat) eller ojämn färg i provet. */
export function isUnreliable(s: Sample): boolean {
  return s.spread > SPREAD_LIMIT || isBlownOut(s.rgb);
}

export function assemble(photo1: Sample[], photo2: Sample[]): AssembleResult {
  const samples = [...photo1, ...photo2];
  const labs = samples.map((s) => rgbToLab(s.rgb));
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
  // Opålitliga prov (reflex/ojämn färg) får sin färg sist och påverkar inte referenserna.
  const unreliable = new Set(others.filter((i) => isUnreliable(samples[i])));
  let assignment = new Map<number, Face>();
  for (let iter = 0; iter < 5; iter++) {
    const pairs: { i: number; f: Face; d: number }[] = [];
    for (const i of others) for (const f of FACES) pairs.push({ i, f, d: labDistance(labs[i], refs[f]) });
    pairs.sort((a, b) => Number(unreliable.has(a.i)) - Number(unreliable.has(b.i)) || a.d - b.d);
    const next = new Map<number, Face>();
    const used = Object.fromEntries(FACES.map((f) => [f, 0])) as Record<Face, number>;
    for (const { i, f } of pairs) {
      if (next.has(i) || used[f] >= 8) continue;
      next.set(i, f);
      used[f]++;
    }
    assignment = next;
    for (const f of FACES) {
      const members = [...assignment]
        .filter(([i, g]) => g === f && !unreliable.has(i))
        .map(([i]) => labs[i]);
      [...centerFace].filter(([, g]) => g === f).forEach(([i]) => members.push(labs[i]));
      refs[f] = [0, 1, 2].map((k) => members.reduce((s, m) => s + m[k], 0) / members.length) as Lab;
    }
  }

  const facelets: Facelets = new Array(54).fill(null);
  labs.forEach((_, i) => {
    facelets[indices[i]] = centerFace.get(i) ?? assignment.get(i) ?? null;
  });

  // Osäkerhet: ojämnt prov (reflex/kant), eller nästan lika nära en annan färg.
  const uncertain = others
    .filter((i) => {
      if (unreliable.has(i)) return true;
      const own = assignment.get(i)!;
      const dOwn = labDistance(labs[i], refs[own]);
      const dOther = Math.min(...FACES.filter((f) => f !== own).map((f) => labDistance(labs[i], refs[f])));
      return dOwn / Math.max(dOther, 1e-6) > AMBIGUITY_LIMIT;
    })
    .map((i) => indices[i]);

  return { ok: true, facelets, views, uncertain };
}
