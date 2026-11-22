# Kubhjälpen

En webbapp som hjälper dig att lösa din Rubiks kub. Fyll i färgerna på din kub
och få en lösning steg för steg, med en 3D-animation av varje drag.

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver på http://localhost:5173
npm test         # enhetstester
npm run build    # produktionsbygge till dist/
```

## Publicering

Varje push till `main` testas, byggs och publiceras på GitHub Pages via
`.github/workflows/deploy.yml`. Pull requests testas och byggs men publiceras
inte. Pages måste vara påslaget en gång i repots inställningar:
**Settings → Pages → Source: GitHub Actions**.

## Så fungerar det

1. **Fyll i kuben** – håll kuben med vit mitt uppåt och grön mitt mot dig, välj
   en färg och tryck (eller dra) över rutorna i den utvikta kuben.
2. **Kontroll** – appen kontrollerar att varje färg finns 9 gånger och att kuben
   faktiskt går att lösa (inga vridna hörn, vända kanter eller bytta bitar) och
   markerar rutor som verkar fel.
3. **Lösning** – Kociembas tvåfasalgoritm (via [`cubejs`](https://github.com/ldez/cubejs))
   hittar en lösning på högst ~22 drag. Den körs i en Web Worker så att sidan inte
   fryser.
4. **Följ dragen** – spela upp, stega fram/bak eller hoppa till valfritt drag.
   Varje drag förklaras i klartext.

## Struktur

| Fil | Innehåll |
| --- | --- |
| `src/cube/model.ts` | Kubmodell (54 klistermärken i Kociemba-ordning), drag, blandning |
| `src/cube/validate.ts` | Kontroll av att en ifylld kub går att lösa |
| `src/cube/solver*.ts` | Lösaren i en Web Worker |
| `src/cube/explain.ts` | Förklaring av drag på svenska |
| `src/components/cubeScene.ts` | Three.js-scen med animerade drag |
| `src/components/NetEditor.tsx` | Utvikt kub för att fylla i färger |
| `src/components/SolutionPlayer.tsx` | Uppspelning av lösningen |

## Kommande

- **Version 2:** läs av kuben från två foton (tre sidor per bild) med steg för
  att rätta felavlästa färger.
- **Version 3:** läget "Lär dig" med nybörjarmetoden lager för lager.
