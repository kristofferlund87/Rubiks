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

  scanButton: '📷 Scan with camera',
  scanTitle: (n: number) => `Photo ${n} of 2`,
  scanInstr1: 'Point a corner of the cube at the camera so you see three faces, and fit it inside the outline.',
  scanInstr2:
    'Turn the cube over so the opposite corner points at the camera and you see the three other faces. Upside down is fine.',
  scanTip: 'Tip: even light without glare gives the best result.',
  capture: 'Take photo',
  upload: 'Choose photo',
  noCamera: 'The camera isn’t available. You can choose a photo instead.',
  adjustInstr:
    'Drag the blue dots to the corners of the cube so the lines follow its edges. The colored dots should land in the middle of each square.',
  flipOutline: '⇅ Flip outline',
  guideTitle: 'How to scan your cube',
  guideIntro: 'You take 2 photos – each one shows 3 faces, so together they show all 6.',
  guideStep1: (
    <>
      <strong>Photo 1:</strong> Point a corner of the cube straight at the camera. You should see three faces.
    </>
  ),
  guideStep2: (
    <>
      <strong>Photo 2:</strong> Turn the cube over so the <strong>opposite corner</strong> points at the camera. Now
      you see the three other faces. It doesn’t matter if the cube is upside down.
    </>
  ),
  guideTips: [
    'Hold the cube and phone still – blurry photos give wrong colors.',
    'Use even light and avoid glare and strong shadows.',
    'Let the cube fill most of the outline.',
  ],
  guideCorner: 'Corner towards the camera',
  guideTurn: 'Turn over',
  startCamera: 'Start camera',
  showGuide: 'How?',
  retake: 'Retake',
  nextPhoto: 'Next photo →',
  usePhotos: 'Read the cube',
  backToPhoto1: '← Photo 1',
  cancel: 'Cancel',
  scanError:
    'Couldn’t tell which faces are which from the center colors. Make sure the two photos show opposite corners, then adjust the outlines or retake the photos.',
  photoIssue: {
    dark: '⚠️ The photo looks dark. Turn on more light for a better result.',
    glare: '⚠️ Some squares are overexposed – probably glare. Tilt the cube slightly or avoid direct light.',
    uneven:
      '⚠️ Several squares (red dots) have uneven color – glare, shadow or the outline is off. Adjust the outline or retake the photo.',
  },
  scanUncertain: (n: number) =>
    `⚠️ The app is unsure about ${n} ${n === 1 ? 'square' : 'squares'} (marked with ?). Check ${n === 1 ? 'it' : 'them'} against your cube and tap to fix if needed.`,
  scanDone: 'Check that the colors match your cube and fix any mistakes by tapping the squares. Then press Solve.',

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

  scanButton: '📷 Skanna med kameran',
  scanTitle: (n) => `Bild ${n} av 2`,
  scanInstr1: 'Rikta ett hörn av kuben mot kameran så att du ser tre sidor, och passa in den i ramen.',
  scanInstr2:
    'Vänd kuben så att det motsatta hörnet pekar mot kameran och du ser de tre andra sidorna. Upp och ner går bra.',
  scanTip: 'Tips: jämnt ljus utan reflexer ger bäst resultat.',
  capture: 'Ta bild',
  upload: 'Välj bild',
  noCamera: 'Kameran är inte tillgänglig. Du kan välja en bild i stället.',
  adjustInstr:
    'Dra de blå prickarna till kubens hörn så att linjerna följer kanterna. De färgade prickarna ska hamna mitt i varje ruta.',
  flipOutline: '⇅ Vänd ramen',
  guideTitle: 'Så skannar du kuben',
  guideIntro: 'Du tar 2 bilder – var och en visar 3 sidor, så tillsammans syns alla 6.',
  guideStep1: (
    <>
      <strong>Bild 1:</strong> Rikta ett hörn av kuben rakt mot kameran. Då syns tre sidor.
    </>
  ),
  guideStep2: (
    <>
      <strong>Bild 2:</strong> Vänd kuben så att <strong>det motsatta hörnet</strong> pekar mot kameran. Nu syns de
      tre andra sidorna. Det gör inget om kuben står upp och ner.
    </>
  ),
  guideTips: [
    'Håll kuben och telefonen stilla – suddiga bilder ger fel färger.',
    'Använd jämnt ljus och undvik reflexer och skarpa skuggor.',
    'Låt kuben fylla det mesta av ramen.',
  ],
  guideCorner: 'Hörnet mot kameran',
  guideTurn: 'Vänd',
  startCamera: 'Starta kameran',
  showGuide: 'Hur?',
  retake: 'Ta om',
  nextPhoto: 'Nästa bild →',
  usePhotos: 'Läs av kuben',
  backToPhoto1: '← Bild 1',
  cancel: 'Avbryt',
  scanError:
    'Kunde inte avgöra vilken sida som är vilken från mittfärgerna. Kontrollera att bilderna visar motsatta hörn, och justera ramarna eller ta om bilderna.',
  photoIssue: {
    dark: '⚠️ Bilden ser mörk ut. Tänd mer ljus för bättre resultat.',
    glare: '⚠️ Några rutor är överexponerade – troligen reflexer. Vinkla kuben lite eller undvik direkt ljus.',
    uneven:
      '⚠️ Flera rutor (röda prickar) har ojämn färg – reflex, skugga eller så ligger ramen fel. Justera ramen eller ta om bilden.',
  },
  scanUncertain: (n) =>
    `⚠️ Appen är osäker på ${n} ${n === 1 ? 'ruta' : 'rutor'} (markerade med ?). Jämför med din kub och tryck för att rätta om det behövs.`,
  scanDone: 'Kontrollera att färgerna stämmer med din kub och rätta eventuella fel genom att trycka på rutorna. Tryck sedan på Lös.',

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
