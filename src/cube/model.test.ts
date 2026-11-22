import Cube from 'cubejs';
import { describe, expect, it } from 'vitest';
import {
  applyMove,
  applyMoves,
  FACES,
  invertMove,
  isSolved,
  moveToString,
  parseAlg,
  randomScramble,
  SOLVED,
  type Facelets,
} from './model';
import { validate } from './validate';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

describe('kubmodell', () => {
  it('fyra kvartsvridningar ger tillbaka samma kub', () => {
    for (const face of FACES) {
      const s = applyMoves(SOLVED, parseAlg(`${face} ${face} ${face} ${face}`));
      expect(isSolved(s)).toBe(true);
      expect(isSolved(applyMove(SOLVED, { face, turns: 1 }))).toBe(false);
    }
  });

  it('stämmer överens med cubejs för alla drag', () => {
    const rand = seeded(42);
    for (let n = 0; n < 50; n++) {
      const alg = randomScramble(20, rand).map(moveToString).join(' ');
      const ours = applyMoves(SOLVED, parseAlg(alg)).join('');
      const theirs = new Cube().move(alg).asString();
      expect(ours).toBe(theirs);
    }
  });

  it('en algoritm följd av sin invers ger löst kub', () => {
    const moves = randomScramble(30, seeded(7));
    const inverse = [...moves].reverse().map(invertMove);
    expect(isSolved(applyMoves(applyMoves(SOLVED, moves), inverse))).toBe(true);
  });
});

describe('lösare', () => {
  it('lösningen från cubejs löser kuben i vår modell', () => {
    Cube.initSolver();
    const rand = seeded(99);
    for (let n = 0; n < 5; n++) {
      const scrambled = applyMoves(SOLVED, randomScramble(25, rand));
      const solution = parseAlg(Cube.fromString(scrambled.join('')).solve());
      expect(solution.length).toBeLessThanOrEqual(22);
      expect(isSolved(applyMoves(scrambled, solution))).toBe(true);
    }
  }, 30_000);
});

describe('validering', () => {
  it('godkänner lösta och blandade kuber', () => {
    expect(validate(SOLVED).ok).toBe(true);
    const rand = seeded(3);
    for (let n = 0; n < 50; n++) {
      expect(validate(applyMoves(SOLVED, randomScramble(25, rand))).ok).toBe(true);
    }
  });

  it('hittar tomma rutor', () => {
    const s: Facelets = [...SOLVED];
    s[0] = null;
    const r = validate(s);
    expect(r.ok).toBe(false);
  });

  it('hittar fel antal av en färg', () => {
    const s: Facelets = [...SOLVED];
    s[0] = 'R';
    expect(validate(s)).toMatchObject({ ok: false, message: expect.stringContaining('9 gånger') });
  });

  it('hittar ett vridet hörn', () => {
    const s: Facelets = [...SOLVED];
    // URF-hörnet: U9=8, R1=9, F3=20 – vrid det ett steg
    [s[8], s[9], s[20]] = [s[20], s[8], s[9]];
    expect(validate(s)).toMatchObject({ ok: false, message: expect.stringContaining('vridet') });
  });

  it('hittar en vänd kant', () => {
    const s: Facelets = [...SOLVED];
    // UF-kanten: U8=7, F2=19
    [s[7], s[19]] = [s[19], s[7]];
    expect(validate(s)).toMatchObject({ ok: false, message: expect.stringContaining('vänd') });
  });

  it('hittar två kanter som bytt plats', () => {
    let s: Facelets = [...SOLVED];
    // Byt UF och UR
    const swap = (a: number, b: number) => ([s[a], s[b]] = [s[b], s[a]]);
    swap(7, 5);
    swap(19, 10);
    expect(validate(s)).toMatchObject({ ok: false, message: expect.stringContaining('bytt plats') });
    s = applyMoves(s, parseAlg('R U F'));
    expect(validate(s).ok).toBe(false);
  });
});
