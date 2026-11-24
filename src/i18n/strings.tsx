import type { Face, Move } from '../cube/model';
import type { ValidationError } from '../cube/validate';

export const APP_NAME = 'Cube Helper';

const en = {
  tagline: 'Enter your cube – get a step-by-step solution.',
  dragHint: 'Drag to rotate the cube',
  cube3dLabel: '3D view of the cube. Drag to rotate it.',
  languageLabel: 'Language',

  colors: { U: 'White', R: 'Red', F: 'Green', D: 'Yellow', L: 'Orange', B: 'Blue' } as Record<Face, string>,
  faces: { U: 'Top', R: 'Right', F: 'Front', D: 'Bottom', L: 'Left', B: 'Back' } as Record<Face, string>,
  stickerLabel: (face: string, n: number, color: string | null) =>
    `${face} face, square ${n}: ${color ?? 'no color'}`,
  pickColor: 'Pick a color',

  step1Title: '1. Enter the colors',
  step1Text: (
    <>
      Hold the cube with the <strong>white center on top</strong> and the{' '}
      <strong>green center facing you</strong>. Pick a color and tap the squares. The centers are
      already filled in – they never move.
    </>
  ),
  solveButton: (filled: number) => `Solve the cube (${filled}/54)`,
  preparingSolver: 'Preparing solver…',
  solving: 'Solving…',
  randomCube: 'Random cube',
  clear: 'Clear',
  alreadySolved: 'The cube is already solved! Enter what your cube looks like right now.',
  solveFailed: 'Something went wrong while solving. Check the colors and try again.',

  step2Title: '2. Follow the moves',
  step2Text: (
    <>
      Keep holding the cube with <strong>white on top</strong> and <strong>green facing you</strong>.
      Do one move at a time and compare with the picture.
    </>
  ),
  editCube: '← Edit the cube',
  moveOf: (n: number, total: number) => `Move ${n} of ${total}`,
  solvedTitle: 'Done! The cube is solved 🎉',
  solvedText: (total: number) =>
    `${total} moves in total. Tap a move below to see what the cube looked like then.`,
  toStart: 'Go to start',
  previous: 'Previous move',
  next: 'Next move',
  toEnd: 'Go to end',
  restart: 'Start over',
  pause: 'Pause',
  play: 'Play',
  resume: 'Continue',
  goToMove: (n: number) => `Go to move ${n}`,

  notationTitle: 'What do the letters mean?',
  notation: (
    <ul>
      <li><strong>U</strong> = up (top), <strong>D</strong> = down (bottom)</li>
      <li><strong>R</strong> = right, <strong>L</strong> = left</li>
      <li><strong>F</strong> = front, <strong>B</strong> = back</li>
      <li>Letter only = a quarter turn clockwise, looking straight at that face</li>
      <li><strong>'</strong> (e.g. R') = a quarter turn counterclockwise</li>
      <li><strong>2</strong> (e.g. R2) = a half turn</li>
    </ul>
  ),

  explain: (m: Move) => {
    const layer = { U: 'the top layer', D: 'the bottom layer', R: 'the right face', L: 'the left face', F: 'the front face', B: 'the back face' }[m.face];
    const lookAt = { U: 'the top', D: 'the bottom', R: 'the right face', L: 'the left face', F: 'the front face', B: 'the back face' }[m.face];
    if (m.turns === 2) return { title: `Turn ${layer} half a turn`, hint: 'Either direction works.' };
    const cw = m.turns === 1;
    const effect = {
      U: `the front's top row moves ${cw ? 'left' : 'right'}`,
      D: `the front's bottom row moves ${cw ? 'right' : 'left'}`,
      R: `the front's right column moves ${cw ? 'up' : 'down'}`,
      L: `the front's left column moves ${cw ? 'down' : 'up'}`,
      F: `the top's front row moves ${cw ? 'right' : 'left'}`,
      B: `the top's back row moves ${cw ? 'left' : 'right'}`,
    }[m.face];
    return {
      title: `Turn ${layer} a quarter turn ${cw ? 'clockwise' : 'counterclockwise'}`,
      hint: `Clockwise is as seen when looking straight at ${lookAt}. That means ${effect}.`,
    };
  },

  validation: (e: ValidationError, color: (f: Face | null) => string): string => {
    const list = (fs: (Face | null)[]) => fs.map(color).join(', ');
    switch (e.code) {
      case 'missing':
        return `${e.count} ${e.count === 1 ? 'square has' : 'squares have'} no color.`;
      case 'wrongCount':
        return `Each color must appear exactly 9 times. Wrong count: ${e.counts.map(([f, n]) => `${color(f)} (${n})`).join(', ')}.`;
      case 'noCorner':
        return `There is no corner with the colors ${list(e.faces)}. Check the highlighted squares.`;
      case 'noEdge':
        return `There is no edge with the colors ${list(e.faces)}. Check the highlighted squares.`;
      case 'dupCorner':
        return `The ${list(e.faces)} corner appears more than once.`;
      case 'dupEdge':
        return `The ${list(e.faces)} edge appears more than once.`;
      case 'twist':
        return 'A corner seems to be twisted. That can’t happen with normal turns – check the corner colors (or whether the cube has been taken apart).';
      case 'flip':
        return 'An edge seems to be flipped. Check the edge colors (or whether the cube has been taken apart).';
      case 'parity':
        return 'Two pieces seem to have swapped places. Check that everything is entered correctly – such a cube can’t be solved.';
    }
  },
};

export type Strings = typeof en;

const sv: Strings = {
  tagline: 'Fyll i din kub – få en lösning steg för steg.',
  dragHint: 'Dra för att snurra på kuben',
  cube3dLabel: '3D-vy av kuben. Dra för att vrida på den.',
  languageLabel: 'Språk',

  colors: { U: 'Vit', R: 'Röd', F: 'Grön', D: 'Gul', L: 'Orange', B: 'Blå' },
  faces: { U: 'Ovansidan', R: 'Högersidan', F: 'Framsidan', D: 'Undersidan', L: 'Vänstersidan', B: 'Baksidan' },
  stickerLabel: (face, n, color) => `${face} ruta ${n}: ${color ?? 'ingen färg'}`,
  pickColor: 'Välj färg',

  step1Title: '1. Fyll i färgerna',
  step1Text: (
    <>
      Håll kuben med <strong>vit mitt uppåt</strong> och <strong>grön mitt mot dig</strong>. Välj en
      färg och tryck på rutorna. Mittrutorna är redan ifyllda – de flyttar sig aldrig.
    </>
  ),
  solveButton: (filled) => `Lös kuben (${filled}/54)`,
  preparingSolver: 'Förbereder lösaren…',
  solving: 'Löser…',
  randomCube: 'Slumpa en kub',
  clear: 'Rensa',
  alreadySolved: 'Kuben är redan löst! Fyll i hur din kub ser ut just nu.',
  solveFailed: 'Något gick fel när kuben skulle lösas. Kontrollera färgerna och försök igen.',

  step2Title: '2. Följ dragen',
  step2Text: (
    <>
      Håll fortfarande kuben med <strong>vit uppåt</strong> och <strong>grön mot dig</strong>. Gör
      ett drag i taget och jämför med bilden.
    </>
  ),
  editCube: '← Ändra kuben',
  moveOf: (n, total) => `Drag ${n} av ${total}`,
  solvedTitle: 'Klart! Kuben är löst 🎉',
  solvedText: (total) =>
    `${total} drag totalt. Tryck på ett drag nedan för att se hur kuben såg ut då.`,
  toStart: 'Till början',
  previous: 'Föregående drag',
  next: 'Nästa drag',
  toEnd: 'Till slutet',
  restart: 'Börja om',
  pause: 'Pausa',
  play: 'Spela upp',
  resume: 'Fortsätt',
  goToMove: (n) => `Gå till drag ${n}`,

  notationTitle: 'Vad betyder bokstäverna?',
  notation: (
    <ul>
      <li><strong>U</strong> = ovansidan (up), <strong>D</strong> = undersidan (down)</li>
      <li><strong>R</strong> = högra sidan, <strong>L</strong> = vänstra sidan</li>
      <li><strong>F</strong> = framsidan, <strong>B</strong> = baksidan</li>
      <li>Bara bokstaven = ett kvarts varv medurs, sett rakt mot den sidan</li>
      <li><strong>'</strong> (t.ex. R') = ett kvarts varv moturs</li>
      <li><strong>2</strong> (t.ex. R2) = ett halvt varv</li>
    </ul>
  ),

  explain: (m) => {
    const layer = { U: 'översta lagret', D: 'nedersta lagret', R: 'högra sidan', L: 'vänstra sidan', F: 'framsidan', B: 'baksidan' }[m.face];
    const lookAt = { U: 'ovansidan', D: 'undersidan', R: 'högra sidan', L: 'vänstra sidan', F: 'framsidan', B: 'baksidan' }[m.face];
    if (m.turns === 2) return { title: `Vrid ${layer} ett halvt varv`, hint: 'Det spelar ingen roll åt vilket håll.' };
    const cw = m.turns === 1;
    const effect = {
      U: `framsidans översta rad flyttas åt ${cw ? 'vänster' : 'höger'}`,
      D: `framsidans nedersta rad flyttas åt ${cw ? 'höger' : 'vänster'}`,
      R: `framsidans högra kolumn flyttas ${cw ? 'uppåt' : 'nedåt'}`,
      L: `framsidans vänstra kolumn flyttas ${cw ? 'nedåt' : 'uppåt'}`,
      F: `ovansidans främre rad flyttas åt ${cw ? 'höger' : 'vänster'}`,
      B: `ovansidans bakre rad flyttas åt ${cw ? 'vänster' : 'höger'}`,
    }[m.face];
    return {
      title: `Vrid ${layer} ett kvarts varv ${cw ? 'medurs' : 'moturs'}`,
      hint: `Medurs räknas som om du tittade rakt på ${lookAt}. Det betyder att ${effect}.`,
    };
  },

  validation: (e, color) => {
    const list = (fs: (Face | null)[]) => fs.map(color).join(', ');
    switch (e.code) {
      case 'missing':
        return `${e.count} ${e.count === 1 ? 'ruta saknar' : 'rutor saknar'} färg.`;
      case 'wrongCount':
        return `Varje färg ska finnas exakt 9 gånger. Fel antal: ${e.counts.map(([f, n]) => `${color(f)} (${n})`).join(', ')}.`;
      case 'noCorner':
        return `Det finns inget hörn med färgerna ${list(e.faces)}. Kolla de markerade rutorna.`;
      case 'noEdge':
        return `Det finns ingen kantbit med färgerna ${list(e.faces)}. Kolla de markerade rutorna.`;
      case 'dupCorner':
        return `Hörnet ${list(e.faces)} finns mer än en gång.`;
      case 'dupEdge':
        return `Kantbiten ${list(e.faces)} finns mer än en gång.`;
      case 'twist':
        return 'Ett hörn verkar vara vridet. Det kan inte hända med vanliga vridningar – kolla att färgerna på hörnen stämmer (eller om kuben har plockats isär).';
      case 'flip':
        return 'En kantbit verkar vara vänd åt fel håll. Kolla att färgerna på kanterna stämmer (eller om kuben har plockats isär).';
      case 'parity':
        return 'Två bitar verkar ha bytt plats med varandra. Kolla att du har fyllt i rätt – en sådan kub går inte att lösa.';
    }
  },
};

export type Lang = 'en' | 'sv';
export const STRINGS: Record<Lang, Strings> = { en, sv };
export const LANG_NAMES: Record<Lang, string> = { en: 'English', sv: 'Svenska' };
