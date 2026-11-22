import { useEffect, useMemo, useRef, useState } from 'react';
import { Cube3D, type Cube3DHandle } from './components/Cube3D';
import { NetEditor } from './components/NetEditor';
import { SolutionPlayer } from './components/SolutionPlayer';
import {
  applyMoves,
  CENTER_INDICES,
  COLORS,
  FACES,
  isSolved,
  randomScramble,
  SOLVED,
  type Face,
  type Facelets,
  type Move,
} from './cube/model';
import { solve, warmUpSolver } from './cube/solver';
import { colorCounts, validate } from './cube/validate';

const STORAGE_KEY = 'kubhjalpen.state.v1';

const emptyCube = (): Facelets => SOLVED.map((f, i) => (CENTER_INDICES.includes(i) ? f : null));

function loadSaved(): Facelets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 54) return parsed;
    }
  } catch {
    /* ignorera */
  }
  return emptyCube();
}

type View = { mode: 'edit' } | { mode: 'solution'; start: Facelets; moves: Move[] };

export default function App() {
  const [cube, setCube] = useState<Facelets>(loadSaved);
  const [shown, setShown] = useState<Facelets>(cube);
  const [brush, setBrush] = useState<Face>('U');
  const [view, setView] = useState<View>({ mode: 'edit' });
  const [solverReady, setSolverReady] = useState(false);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<{ message: string; stickers?: number[] } | null>(null);
  const cube3d = useRef<Cube3DHandle>(null);

  useEffect(() => {
    warmUpSolver().then(() => setSolverReady(true));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cube));
    } catch {
      /* ignorera */
    }
    if (view.mode === 'edit') setShown(cube);
  }, [cube, view.mode]);

  const counts = useMemo(() => colorCounts(cube), [cube]);
  const highlight = useMemo(() => (error?.stickers ? new Set(error.stickers) : undefined), [error]);
  const filled = cube.filter(Boolean).length;

  const updateCube = (next: Facelets) => {
    setCube(next);
    setError(null);
  };

  const paint = (i: number) => {
    if (CENTER_INDICES.includes(i)) return;
    setCube((prev) => {
      const next = [...prev];
      next[i] = brush;
      return next;
    });
    setError(null);
  };

  const onSolve = async () => {
    const result = validate(cube);
    if (!result.ok) {
      setError(result);
      return;
    }
    if (isSolved(cube)) {
      setError({ message: 'Kuben är redan löst! Fyll i hur din kub ser ut just nu.' });
      return;
    }
    setSolving(true);
    try {
      const moves = await solve(cube);
      setShown(cube);
      setView({ mode: 'solution', start: cube, moves });
      cube3d.current?.resetView();
    } catch {
      setError({ message: 'Något gick fel när kuben skulle lösas. Kontrollera färgerna och försök igen.' });
    } finally {
      setSolving(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>
          <span className="logo" aria-hidden="true" />
          Kubhjälpen
        </h1>
        <p className="tagline">Fyll i din kub – få en lösning steg för steg.</p>
      </header>

      <main className={view.mode === 'solution' ? 'solution-mode' : 'edit-mode'}>
        <section className="stage">
          <Cube3D ref={cube3d} state={shown} highlight={view.mode === 'edit' ? highlight : undefined} />
          <p className="stage-hint">Dra för att snurra på kuben</p>
        </section>

        {view.mode === 'edit' ? (
          <section className="panel">
            <div className="instructions">
              <h2>1. Fyll i färgerna</h2>
              <p>
                Håll kuben med <strong>vit mitt uppåt</strong> och <strong>grön mitt mot dig</strong>.
                Välj en färg och tryck på rutorna. Mittrutorna är redan ifyllda – de flyttar sig aldrig.
              </p>
            </div>

            <div className="palette" role="radiogroup" aria-label="Välj färg">
              {FACES.map((f) => (
                <button
                  key={f}
                  role="radio"
                  aria-checked={brush === f}
                  className={'swatch' + (brush === f ? ' selected' : '')}
                  onClick={() => setBrush(f)}
                  style={{ '--swatch': COLORS[f].hex } as React.CSSProperties}
                >
                  <span className="swatch-color" />
                  <span className="swatch-name">{COLORS[f].name}</span>
                  <span className={'swatch-count' + (counts[f] > 9 ? ' over' : counts[f] === 9 ? ' full' : '')}>
                    {counts[f]}/9
                  </span>
                </button>
              ))}
            </div>

            <NetEditor state={cube} highlight={highlight} onPaint={paint} />

            {error && (
              <div className="error-box" role="alert">
                {error.message}
              </div>
            )}

            <div className="actions">
              <button className="primary big" onClick={onSolve} disabled={!solverReady || solving}>
                {!solverReady ? 'Förbereder lösaren…' : solving ? 'Löser…' : `Lös kuben (${filled}/54)`}
              </button>
              <div className="secondary-actions">
                <button onClick={() => updateCube(applyMoves(SOLVED, randomScramble()))}>
                  Slumpa en kub
                </button>
                <button onClick={() => updateCube(emptyCube())}>Rensa</button>
              </div>
            </div>
          </section>
        ) : (
          <section className="panel">
            <div className="instructions">
              <h2>2. Följ dragen</h2>
              <p>
                Håll fortfarande kuben med <strong>vit uppåt</strong> och <strong>grön mot dig</strong>.
                Gör ett drag i taget och jämför med bilden.
              </p>
            </div>
            <SolutionPlayer start={view.start} moves={view.moves} cube={cube3d} onShow={setShown} />
            <details className="notation">
              <summary>Vad betyder bokstäverna?</summary>
              <ul>
                <li><strong>U</strong> = ovansidan (up), <strong>D</strong> = undersidan (down)</li>
                <li><strong>R</strong> = högra sidan, <strong>L</strong> = vänstra sidan</li>
                <li><strong>F</strong> = framsidan, <strong>B</strong> = baksidan</li>
                <li>Bara bokstaven = ett kvarts varv medurs, sett rakt mot den sidan</li>
                <li><strong>'</strong> (t.ex. R') = ett kvarts varv moturs</li>
                <li><strong>2</strong> (t.ex. R2) = ett halvt varv</li>
              </ul>
            </details>
            <div className="actions">
              <button
                onClick={() => {
                  setView({ mode: 'edit' });
                  setShown(cube);
                }}
              >
                ← Ändra kuben
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
