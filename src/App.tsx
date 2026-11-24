import { useEffect, useMemo, useRef, useState } from 'react';
import { Cube3D, type Cube3DHandle } from './components/Cube3D';
import { NetEditor } from './components/NetEditor';
import { Scanner } from './components/Scanner';
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
import { colorCounts, validate, type ValidationError } from './cube/validate';
import { useI18n } from './i18n';
import { APP_NAME, LANG_NAMES, type Lang } from './i18n/strings';

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
    /* ignore */
  }
  return emptyCube();
}

type View = { mode: 'edit' } | { mode: 'solution'; start: Facelets; moves: Move[] };

/** Fel sparas som data (inte text) så att de översätts om man byter språk. */
type AppError =
  | { kind: 'validation'; error: ValidationError; stickers?: number[] }
  | { kind: 'alreadySolved' }
  | { kind: 'solveFailed' };

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [cube, setCube] = useState<Facelets>(loadSaved);
  const [shown, setShown] = useState<Facelets>(cube);
  const [brush, setBrush] = useState<Face>('U');
  const [view, setView] = useState<View>({ mode: 'edit' });
  const [solverReady, setSolverReady] = useState(false);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState(false);
  const cube3d = useRef<Cube3DHandle>(null);

  useEffect(() => {
    document.title = APP_NAME;
    warmUpSolver().then(() => setSolverReady(true));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cube));
    } catch {
      /* ignore */
    }
    if (view.mode === 'edit') setShown(cube);
  }, [cube, view.mode]);

  const counts = useMemo(() => colorCounts(cube), [cube]);
  const highlight = useMemo(
    () => (error?.kind === 'validation' && error.stickers ? new Set(error.stickers) : undefined),
    [error],
  );
  const filled = cube.filter(Boolean).length;

  const errorText = !error
    ? null
    : error.kind === 'validation'
      ? t.validation(error.error, (f) => (f ? t.colors[f].toLowerCase() : '?'))
      : error.kind === 'alreadySolved'
        ? t.alreadySolved
        : t.solveFailed;

  const updateCube = (next: Facelets) => {
    setCube(next);
    setError(null);
    setNotice(false);
  };

  const onScanned = (facelets: Facelets) => {
    setScanning(false);
    setCube(facelets);
    setNotice(true);
    const result = validate(facelets);
    setError(result.ok ? null : { kind: 'validation', error: result.error, stickers: result.stickers });
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
      setError({ kind: 'validation', error: result.error, stickers: result.stickers });
      return;
    }
    if (isSolved(cube)) {
      setError({ kind: 'alreadySolved' });
      return;
    }
    setSolving(true);
    try {
      const moves = await solve(cube);
      setShown(cube);
      setView({ mode: 'solution', start: cube, moves });
      cube3d.current?.resetView();
    } catch {
      setError({ kind: 'solveFailed' });
    } finally {
      setSolving(false);
    }
  };

  return (
    <div className="app">
      <header>
        <div className="header-row">
          <h1>
            <span className="logo" aria-hidden="true" />
            {APP_NAME}
          </h1>
          <select
            className="lang"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            aria-label={t.languageLabel}
          >
            {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
              <option key={l} value={l}>
                {LANG_NAMES[l]}
              </option>
            ))}
          </select>
        </div>
        <p className="tagline">{t.tagline}</p>
      </header>

      <main className={view.mode === 'solution' ? 'solution-mode' : 'edit-mode'}>
        <section className="stage">
          <Cube3D ref={cube3d} state={shown} highlight={view.mode === 'edit' ? highlight : undefined} />
          <p className="stage-hint">{t.dragHint}</p>
        </section>

        {view.mode === 'edit' ? (
          <section className="panel">
            <div className="instructions">
              <h2>{t.step1Title}</h2>
              <p>{t.step1Text}</p>
            </div>

            <button className="scan-button" onClick={() => setScanning(true)}>
              {t.scanButton}
            </button>

            {notice && <div className="info-box">{t.scanDone}</div>}

            <div className="palette" role="radiogroup" aria-label={t.pickColor}>
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
                  <span className="swatch-name">{t.colors[f]}</span>
                  <span className={'swatch-count' + (counts[f] > 9 ? ' over' : counts[f] === 9 ? ' full' : '')}>
                    {counts[f]}/9
                  </span>
                </button>
              ))}
            </div>

            <NetEditor state={cube} highlight={highlight} onPaint={paint} />

            {errorText && (
              <div className="error-box" role="alert">
                {errorText}
              </div>
            )}

            <div className="actions">
              <button className="primary big" onClick={onSolve} disabled={!solverReady || solving}>
                {!solverReady ? t.preparingSolver : solving ? t.solving : t.solveButton(filled)}
              </button>
              <div className="secondary-actions">
                <button onClick={() => updateCube(applyMoves(SOLVED, randomScramble()))}>{t.randomCube}</button>
                <button onClick={() => updateCube(emptyCube())}>{t.clear}</button>
              </div>
            </div>
          </section>
        ) : (
          <section className="panel">
            <div className="instructions">
              <h2>{t.step2Title}</h2>
              <p>{t.step2Text}</p>
            </div>
            <SolutionPlayer start={view.start} moves={view.moves} cube={cube3d} onShow={setShown} />
            <details className="notation">
              <summary>{t.notationTitle}</summary>
              {t.notation}
            </details>
            <div className="actions">
              <button
                onClick={() => {
                  setView({ mode: 'edit' });
                  setShown(cube);
                }}
              >
                {t.editCube}
              </button>
            </div>
          </section>
        )}
      </main>

      {scanning && <Scanner onDone={onScanned} onCancel={() => setScanning(false)} />}
    </div>
  );
}
