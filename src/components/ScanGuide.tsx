import { useI18n } from '../i18n';
import { flipHexagon, gridLines, regularHexagon, SLOTS, type Hexagon, type HexKey } from '../scan/geometry';

/** Sidornas hörn i ritordning (för att fylla dem). */
const FACE_POLYS: [HexKey, HexKey, HexKey, HexKey][] = [
  ['T', 'TR', 'C', 'TL'],
  ['TL', 'C', 'B', 'BL'],
  ['C', 'TR', 'BR', 'B'],
];

/**
 * En schematisk kub sedd med ett hörn mot kameran. Sidorna är numrerade så att
 * det syns att två bilder tillsammans visar alla sex sidor.
 */
export function CubeIcon({
  flipped = false,
  labels,
  tones,
  cornerLabel,
}: {
  flipped?: boolean;
  labels: string[];
  tones: string[];
  cornerLabel?: string;
}) {
  const base = regularHexagon(50, 50, 40);
  const hex: Hexagon = flipped ? flipHexagon(base) : base;
  return (
    <svg viewBox="0 0 100 100" className="cube-icon" aria-hidden="true">
      {FACE_POLYS.map((keys, i) => {
        const pts = keys.map((k) => hex[k]);
        const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
        const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
        return (
          <g key={i}>
            <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill={tones[i]} />
            <text x={cx} y={cy + 4.5} textAnchor="middle" className="cube-icon-label">
              {labels[i]}
            </text>
          </g>
        );
      })}
      <g className="cube-icon-grid">
        {SLOTS.flatMap((slot) =>
          gridLines(hex, slot).map(([a, b], j) => <line key={`${slot}${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />),
        )}
      </g>
      <circle cx={50} cy={50} r={4.5} className="cube-icon-corner" />
      {cornerLabel && <title>{cornerLabel}</title>}
    </svg>
  );
}

const TONES_1 = ['#7fb0ff', '#3d7be0', '#2a5cb0'];
const TONES_2 = ['#ffc56b', '#e0952a', '#b06d16'];

export function PhotoIcon({ step }: { step: 0 | 1 }) {
  const { t } = useI18n();
  return step === 0 ? (
    <CubeIcon labels={['1', '2', '3']} tones={TONES_1} cornerLabel={t.guideCorner} />
  ) : (
    <CubeIcon flipped labels={['4', '5', '6']} tones={TONES_2} cornerLabel={t.guideCorner} />
  );
}

/** Introduktion: hur många bilder och hur kuben ska hållas. */
export function ScanGuide({ onStart, onUpload }: { onStart(): void; onUpload(): void }) {
  const { t } = useI18n();
  return (
    <div className="guide">
      <h3>{t.guideTitle}</h3>
      <p className="guide-intro">{t.guideIntro}</p>

      <div className="guide-steps">
        <div className="guide-step">
          <PhotoIcon step={0} />
          <p>{t.guideStep1}</p>
        </div>
        <div className="guide-turn" aria-hidden="true">
          <span>↻</span>
          {t.guideTurn}
        </div>
        <div className="guide-step">
          <PhotoIcon step={1} />
          <p>{t.guideStep2}</p>
        </div>
      </div>
      <p className="guide-corner-hint">
        <span className="dot-red" aria-hidden="true" /> = {t.guideCorner}
      </p>

      <ul className="guide-tips">
        {t.guideTips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      <div className="scanner-actions">
        <button onClick={onUpload}>{t.upload}</button>
        <button className="primary" onClick={onStart}>
          {t.startCamera}
        </button>
      </div>
    </div>
  );
}
