# Cube Helper

A web app that helps you solve your 3×3 cube. Enter the colors of your cube and
get a step-by-step solution with a 3D animation of every move.

Available in English and Swedish – the language follows the device setting and
can be changed in the app.

**Live:** https://kristofferlund87.github.io/Rubiks/

## Getting started

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # unit tests
npm run build    # production build to dist/
```

## Deployment

Every push to `main` is tested, built and published to GitHub Pages by
`.github/workflows/deploy.yml`. Pull requests are tested and built but not
published.

## How it works

1. **Scan or enter the cube** – take two photos with a corner pointing at the
   camera (three faces per photo, opposite corners). Drag the outline to fit the
   cube; the app works out which faces it sees from the center colors, so the
   cube can be held in any rotation – also upside down (the app picks the
   orientation of the outline that fits best). Colors are compared by hue and
   saturation rather than brightness, so shadows and different lighting between
   the photos matter less, and squares the app is unsure about are marked. Or pick a color and tap (or drag across)
   the squares of the unfolded cube. Scanned colors can be corrected the same way.
2. **Validation** – the app checks that every color appears 9 times and that the
   cube is actually solvable (no twisted corners, flipped edges or swapped
   pieces) and highlights squares that look wrong.
3. **Solution** – Kociemba's two-phase algorithm (via
   [`cubejs`](https://github.com/ldez/cubejs)) finds a solution of at most ~22
   moves. It runs in a Web Worker so the page never freezes.
4. **Follow the moves** – play, step forward/back or jump to any move. Each move
   is explained in plain language.

## Structure

| File | Contents |
| --- | --- |
| `src/cube/model.ts` | Cube model (54 stickers in Kociemba order), moves, scrambles |
| `src/cube/validate.ts` | Checks that an entered cube is solvable |
| `src/cube/solver*.ts` | The solver, running in a Web Worker |
| `src/scan/geometry.ts` | Corner-view geometry: outline, perspective mapping, which sticker is where |
| `src/scan/assemble.ts` | Turns two photos' color samples into a cube (center detection + balanced color assignment) |
| `src/components/Scanner.tsx` | Camera / photo upload and adjustable outline |
| `src/i18n/` | Translations (English, Swedish) and language selection |
| `src/components/cubeScene.ts` | Three.js scene with animated moves |
| `src/components/NetEditor.tsx` | Unfolded cube for entering colors |
| `src/components/SolutionPlayer.tsx` | Solution playback |

## Adding a language

Copy the `sv` object in `src/i18n/strings.tsx`, translate it, and add it to
`STRINGS` and `LANG_NAMES`. TypeScript reports any missing strings.
