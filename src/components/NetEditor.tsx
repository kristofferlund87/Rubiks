import { useRef } from 'react';
import { CENTER_INDICES, COLORS, FACE_NAMES, FACES, UNKNOWN_HEX, type Facelets } from '../cube/model';

interface Props {
  state: Facelets;
  highlight?: Set<number>;
  onPaint(index: number): void;
}

/** Utvikt kub där man målar rutor genom att trycka eller dra. */
export function NetEditor({ state, highlight, onPaint }: Props) {
  const painting = useRef(false);
  const last = useRef<number | null>(null);

  const paintAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const idx = el?.dataset.index;
    if (idx === undefined) return;
    const i = Number(idx);
    if (i === last.current || CENTER_INDICES.includes(i)) return;
    last.current = i;
    onPaint(i);
  };

  return (
    <div
      className="net"
      onPointerDown={(e) => {
        painting.current = true;
        last.current = null;
        paintAt(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => painting.current && paintAt(e.clientX, e.clientY)}
      onPointerUp={() => (painting.current = false)}
      onPointerLeave={() => (painting.current = false)}
      onPointerCancel={() => (painting.current = false)}
    >
      {FACES.map((face, fi) => (
        <div key={face} className={`net-face net-${face}`} title={FACE_NAMES[face]}>
          {Array.from({ length: 9 }, (_, i) => {
            const index = fi * 9 + i;
            const s = state[index];
            const center = i === 4;
            return (
              <div
                key={index}
                data-index={index}
                className={
                  'net-cell' + (center ? ' center' : '') + (highlight?.has(index) ? ' error' : '')
                }
                style={{ background: s ? COLORS[s].hex : UNKNOWN_HEX }}
                aria-label={`${FACE_NAMES[face]} ruta ${i + 1}: ${s ? COLORS[s].name : 'ingen färg'}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
