import { useEffect, useMemo, useRef, useState } from 'react';
import { explainMove } from '../cube/explain';
import { applyMove, invertMove, moveToString, type Facelets, type Move } from '../cube/model';
import type { Cube3DHandle } from './Cube3D';

interface Props {
  start: Facelets;
  moves: Move[];
  cube: React.RefObject<Cube3DHandle | null>;
  /** Anropas när kubens visade tillstånd ändras utan animation. */
  onShow(state: Facelets): void;
}

export function SolutionPlayer({ start, moves, cube, onShow }: Props) {
  const states = useMemo(() => {
    const s: Facelets[] = [start];
    for (const m of moves) s.push(applyMove(s[s.length - 1], m));
    return s;
  }, [start, moves]);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const busy = useRef(false);
  const chipsRef = useRef<HTMLOListElement>(null);

  const forward = async () => {
    if (busy.current || step >= moves.length) return false;
    busy.current = true;
    await cube.current?.animateMove(moves[step], states[step + 1]);
    onShow(states[step + 1]);
    setStep(step + 1);
    busy.current = false;
    return true;
  };

  const back = async () => {
    if (busy.current || step <= 0) return;
    busy.current = true;
    setPlaying(false);
    await cube.current?.animateMove(invertMove(moves[step - 1]), states[step - 1]);
    onShow(states[step - 1]);
    setStep(step - 1);
    busy.current = false;
  };

  const jump = (k: number) => {
    if (busy.current) return;
    setPlaying(false);
    onShow(states[k]);
    setStep(k);
  };

  // Automatisk uppspelning: ta nästa drag när föregående är klart.
  useEffect(() => {
    if (!playing) return;
    if (step >= moves.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => void forward(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, step]);

  useEffect(() => {
    const el = chipsRef.current?.querySelector<HTMLElement>('.current');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [step]);

  const done = step >= moves.length;
  const next = done ? null : moves[step];
  const info = next ? explainMove(next) : null;

  return (
    <div className="player">
      <div className="now">
        {next && info ? (
          <>
            <div className="now-move">{moveToString(next)}</div>
            <div>
              <div className="now-step">
                Drag {step + 1} av {moves.length}
              </div>
              <div className="now-title">{info.title}</div>
              <div className="now-hint">{info.hint}</div>
            </div>
          </>
        ) : (
          <>
            <div className="now-move done">✓</div>
            <div>
              <div className="now-title">Klart! Kuben är löst 🎉</div>
              <div className="now-hint">
                {moves.length} drag totalt. Tryck på ett drag nedan för att se hur kuben såg ut då.
              </div>
            </div>
          </>
        )}
      </div>

      <div className="controls">
        <button onClick={() => jump(0)} disabled={step === 0} aria-label="Till början">
          ⏮
        </button>
        <button onClick={() => void back()} disabled={step === 0} aria-label="Föregående drag">
          ◀
        </button>
        <button
          className="primary"
          onClick={() => (done ? jump(0) : playing ? setPlaying(false) : setPlaying(true))}
        >
          {done ? 'Börja om' : playing ? 'Pausa' : step === 0 ? 'Spela upp' : 'Fortsätt'}
        </button>
        <button
          onClick={() => {
            setPlaying(false);
            void forward();
          }}
          disabled={done}
          aria-label="Nästa drag"
        >
          ▶
        </button>
        <button onClick={() => jump(moves.length)} disabled={done} aria-label="Till slutet">
          ⏭
        </button>
      </div>

      <ol className="chips" ref={chipsRef}>
        {moves.map((m, i) => (
          <li key={i}>
            <button
              className={i === step ? 'current' : i < step ? 'past' : ''}
              onClick={() => jump(i)}
              title={`Gå till drag ${i + 1}`}
            >
              {moveToString(m)}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
