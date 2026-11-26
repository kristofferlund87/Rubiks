/**
 * Sätter ihop två bilder (27 färgprover var) till en hel kub.
 *
 * Proverna kommer i ordningen top(9), left(9), right(9) där index 4, 13 och 22
 * är mittrutorna.
 */
import { FACES, NORMALS, type Face, type Facelets } from '../cube/model';
import { featureDistance, NOMINAL, permutations, rgbToFeature, type Feature } from './color';
import type { RGB } from './color';
import { isBlownOut, isTooDark, SPREAD_LIMIT, type Sample } from './sample';
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
function identifyCenters(centers: Feature[]): [Face[], Face[]] | null {
  let best: { cost: number; faces: Face[] } | null = null;
  for (const perm of permutations(FACES)) {
    const v1 = perm.slice(0, 3), v2 = perm.slice(3);
    if (!isValidCorner(NORMALS[v1[0]], NORMALS[v1[1]], NORMALS[v1[2]])) continue;
    if (!isValidCorner(NORMALS[v2[0]], NORMALS[v2[1]], NORMALS[v2[2]])) continue;
    const cost = perm.reduce((s, f, i) => s + featureDistance(centers[i], NOMINAL[f]), 0);
    if (!best || cost < best.cost) best = { cost, faces: perm };
  }
  return best ? [best.faces.slice(0, 3), best.faces.slice(3)] : null;
}

/** Reflex (överexponerat), ojämn färg eller för mörkt (skugga/svart plast) i provet. */
export function isUnreliable(s: Sample): boolean {
  return s.spread > SPREAD_LIMIT || isBlownOut(s.rgb) || isTooDark(s.rgb);
}

/** En avläsning utan vitbalansering. `rawUnreliable` = opålitliga prov (index 0–53). */
function assembleOnce(
  samples: Sample[],
  rawUnreliable: Set<number>,
): (AssembleResult & { ok: true; sampleFaces: Face[]; ambiguity: number }) | (AssembleResult & { ok: false }) {
  const feats = samples.map((s) => rgbToFeature(s.rgb));
  const centerIdx = [...CENTER_SAMPLES, ...CENTER_SAMPLES.map((i) => i + 27)];
  const views = identifyCenters(centerIdx.map((i) => feats[i]));
  if (!views) return { ok: false, error: 'centers' };

  // Vilket facelet-index varje prov hör till.
  const indices = views.flatMap(([top, left, right]) =>
    faceletIndicesForView(NORMALS[top], NORMALS[left], NORMALS[right]),
  );

  // Fördela övriga rutor på sidorna så att varje färg får exakt 9 rutor.
  // Startreferens = mittrutans färg, sedan medelvärdet av det som tilldelats.
  const centerFace = new Map<number, Face>();
  views.forEach((faces, v) => SLOTS.forEach((_, s) => centerFace.set(v * 27 + s * 9 + 4, faces[s])));
  const refs = {} as Record<Face, Feature>;
  centerFace.forEach((f, i) => (refs[f] = feats[i]));

  const others = feats.map((_, i) => i).filter((i) => !centerFace.has(i));
  const refFor = (_i: number, f: Face) => refs[f];
  // Opålitliga prov (reflex/ojämn färg) får sin färg sist och påverkar inte referenserna.
  const unreliable = new Set(others.filter((i) => rawUnreliable.has(i)));
  let assignment = new Map<number, Face>();
  for (let iter = 0; iter < 5; iter++) {
    const pairs: { i: number; f: Face; d: number }[] = [];
    for (const i of others)
      for (const f of FACES) pairs.push({ i, f, d: featureDistance(feats[i], refFor(i, f)) });
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
      const members = [...assignment, ...centerFace]
        .filter(([i, g]) => g === f && !unreliable.has(i))
        .map(([i]) => feats[i]);
      refs[f] = [0, 1, 2].map((k) => members.reduce((s, m) => s + m[k], 0) / members.length) as Feature;
    }
  }

  const facelets: Facelets = new Array(54).fill(null);
  feats.forEach((_, i) => {
    facelets[indices[i]] = centerFace.get(i) ?? assignment.get(i) ?? null;
  });

  // Osäkerhet: ojämnt prov (reflex/kant), eller nästan lika nära en annan färg.
  // `ambiguity` summerar hur tvetydiga de pålitliga rutorna är – används för att
  // välja mellan avläsningar med och utan vitbalans.
  let ambiguity = 0;
  const uncertain = others
    .filter((i) => {
      if (unreliable.has(i)) return true;
      const own = assignment.get(i)!;
      const dOwn = featureDistance(feats[i], refFor(i, own));
      const dOther = Math.min(...FACES.filter((f) => f !== own).map((f) => featureDistance(feats[i], refFor(i, f))));
      const ratio = dOwn / Math.max(dOther, 1e-6);
      ambiguity += Math.min(ratio, 1.5);
      return ratio > AMBIGUITY_LIMIT;
    })
    .map((i) => indices[i]);

  const sampleFaces = indices.map((idx) => facelets[idx]!);
  return { ok: true, facelets, views, uncertain, sampleFaces, ambiguity };
}

type Gains = RGB;

const saturation = ([r, g, b]: RGB) => {
  const max = Math.max(r, g, b);
  return max > 0 ? (max - Math.min(r, g, b)) / max : 0;
};

/** Förstärkning per kanal som gör färgen `white` neutralt grå/vit. */
function gainsFrom(white: RGB): Gains {
  const avg = (white[0] + white[1] + white[2]) / 3;
  return white.map((c) => Math.min(2, Math.max(0.5, avg / Math.max(c, 1)))) as Gains;
}

const medianRGB = (cs: RGB[]): RGB =>
  [0, 1, 2].map((k) => {
    const v = cs.map((c) => c[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  }) as RGB;

function applyGains(samples: Sample[], g: Gains): Sample[] {
  return samples.map((s) => ({
    ...s,
    rgb: s.rgb.map((c, k) => Math.min(255, c * g[k])) as RGB,
  }));
}

/**
 * Första gissning av vitbalansen för en bild: de mest omättade, ljusa och
 * pålitliga rutorna är troligen vita (kuben har alltid vita rutor).
 */
function guessGains(photo: Sample[]): Gains {
  const candidates = photo
    .filter((s) => !isUnreliable(s) && Math.max(...s.rgb) > 90)
    .sort((a, b) => saturation(a.rgb) - saturation(b.rgb))
    .slice(0, 3);
  return candidates.length ? gainsFrom(medianRGB(candidates.map((s) => s.rgb))) : [1, 1, 1];
}

/** Vitbalanserad avläsning: gissa vitt, läs av, balansera om efter de vita rutorna, läs av igen. */
function assembleWhiteBalanced(raw: Sample[][], rawUnreliable: Set<number>) {
  const balanced = raw.map((p) => applyGains(p, guessGains(p)));
  const first = assembleOnce(balanced.flat(), rawUnreliable);
  if (!first.ok) return first;
  const refined = raw.map((p, v) => {
    const whites = p
      .filter((s, j) => first.sampleFaces[v * 27 + j] === 'U' && !isUnreliable(s))
      .map((s) => s.rgb);
    return whites.length >= 2 ? applyGains(p, gainsFrom(medianRGB(whites))) : balanced[v];
  });
  const second = assembleOnce(refined.flat(), rawUnreliable);
  return second.ok ? second : first;
}

/**
 * Läs av kuben från två bilder.
 *
 * Görs både med och utan automatisk vitbalans (som kompenserar för färgstick,
 * t.ex. olika ljus i de två bilderna), och den avläsning som är minst tvetydig
 * väljs. Vitbalans per bild hjälper när hela bilden har samma färgstick men kan
 * stjälpa när ljuset varierar mellan kubens sidor – därför får den inte alltid
 * bestämma.
 */
export function assemble(photo1: Sample[], photo2: Sample[]): AssembleResult {
  const raw = [photo1, photo2];
  const rawUnreliable = new Set(
    raw.flat().map((s, i) => (isUnreliable(s) ? i : -1)).filter((i) => i >= 0),
  );
  const candidates = [assembleOnce(raw.flat(), rawUnreliable), assembleWhiteBalanced(raw, rawUnreliable)].filter(
    (r) => r.ok,
  ) as (AssembleResult & { ok: true; ambiguity: number })[];
  if (!candidates.length) return { ok: false, error: 'centers' };
  const best = candidates.reduce((a, b) => (b.ambiguity < a.ambiguity ? b : a));
  return { ok: true, facelets: best.facelets, views: best.views, uncertain: best.uncertain };
}
