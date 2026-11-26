import { useEffect, useMemo, useRef, useState } from 'react';
import type { Facelets } from '../cube/model';
import { useI18n } from '../i18n';
import { assemble, isUnreliable } from '../scan/assemble';
import {
  flipHexagon,
  gridLines,
  HEX_KEYS,
  regularHexagon,
  SLOTS,
  stickerPoints,
  type Hexagon,
  type HexKey,
  type Point,
} from '../scan/geometry';
import { fitScore, photoIssues, sampleHexagon, toImageData } from '../scan/sample';
import { PhotoIcon, ScanGuide } from './ScanGuide';

interface Photo {
  data: ImageData;
  url: string;
  hex: Hexagon;
}

interface Props {
  onDone(facelets: Facelets, uncertain: number[]): void;
  onCancel(): void;
}

/** Ramens storlek i förhållande till bildens kortaste sida. */
const HEX_RADIUS = 0.36;

const initialHex = (w: number, h: number) => regularHexagon(w / 2, h / 2, Math.min(w, h) * HEX_RADIUS);

/**
 * Välj åt vilket håll ramen ska vara (Y eller upp-och-nervänt Y) utifrån vilket
 * som passar bilden bäst. Byter bara om det andra hållet är tydligt bättre.
 */
function bestOrientation(img: ImageData, hex: Hexagon): Hexagon {
  const alt = flipHexagon(hex);
  return fitScore(sampleHexagon(img, alt)) < 0.75 * fitScore(sampleHexagon(img, hex)) ? alt : hex;
}

/** Ramen: sexhörning med rutnät för de tre sidorna. */
function HexOutline({ hex, stroke }: { hex: Hexagon; stroke: number }) {
  return (
    <g className="hex-outline" strokeWidth={stroke}>
      {SLOTS.flatMap((slot) =>
        gridLines(hex, slot).map(([a, b], i) => (
          <line key={`${slot}${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        )),
      )}
    </g>
  );
}

export function Scanner({ onDone, onCancel }: Props) {
  const { t } = useI18n();
  const [photos, setPhotos] = useState<(Photo | null)[]>([null, null]);
  const [k, setK] = useState(0);
  const [mode, setMode] = useState<'intro' | 'live' | 'adjust'>('intro');
  const [cameraError, setCameraError] = useState(false);
  const [scanError, setScanError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Starta kameran när vi är i live-läge.
  useEffect(() => {
    if (mode !== 'live') return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setCameraError(false);
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((tr) => tr.stop());
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
      } catch {
        if (!cancelled) setCameraError(true);
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [mode, k]);

  const photo = photos[k];

  const setPhoto = (p: Photo) => {
    setPhotos((prev) => prev.map((x, i) => (i === k ? p : x)));
    setMode('adjust');
    setScanError(false);
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const s = Math.min(v.videoWidth, v.videoHeight);
    const crop = { x: (v.videoWidth - s) / 2, y: (v.videoHeight - s) / 2, w: s, h: s };
    const { data, url } = toImageData(v, v.videoWidth, v.videoHeight, crop);
    setPhoto({ data, url, hex: bestOrientation(data, initialHex(data.width, data.height)) });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const bitmap = await createImageBitmap(file);
    const { data, url } = toImageData(bitmap, bitmap.width, bitmap.height);
    bitmap.close();
    setPhoto({ data, url, hex: bestOrientation(data, initialHex(data.width, data.height)) });
  };

  const usePhoto = () => {
    if (k === 0) {
      setK(1);
      setMode(photos[1] ? 'adjust' : 'live');
      return;
    }
    const [p1, p2] = photos;
    if (!p1 || !p2) return;
    const result = assemble(sampleHexagon(p1.data, p1.hex), sampleHexagon(p2.data, p2.hex));
    if (!result.ok) {
      setScanError(true);
      return;
    }
    onDone(result.facelets, result.uncertain);
  };

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      hidden
      onChange={(e) => {
        void onFile(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );

  return (
    <div className="scanner" role="dialog" aria-modal="true" aria-label={t.scanTitle(k + 1)}>
      <div className="scanner-inner">
        <div className="scanner-head">
          <div className="scanner-steps">
            {[0, 1].map((i) => (
              <span key={i} className={'dot' + (i === k ? ' active' : photos[i] ? ' done' : '')} />
            ))}
            <h2>{t.scanTitle(k + 1)}</h2>
          </div>
          <button onClick={onCancel}>{t.cancel}</button>
        </div>

        {mode === 'live' && (
          <div className="scanner-instr">
            <PhotoIcon step={k as 0 | 1} />
            <p className="scanner-text">{k === 0 ? t.scanInstr1 : t.scanInstr2}</p>
            <button className="link" onClick={() => setMode('intro')}>
              {t.showGuide}
            </button>
          </div>
        )}
        {mode === 'adjust' && <p className="scanner-text">{t.adjustInstr}</p>}

        {mode === 'intro' ? (
          <ScanGuide onStart={() => setMode('live')} onUpload={() => fileRef.current?.click()} />
        ) : mode === 'live' ? (
          <>
            <div className="viewfinder">
              {cameraError ? (
                <div className="no-camera">{t.noCamera}</div>
              ) : (
                <>
                  <video ref={videoRef} playsInline muted autoPlay />
                  <svg viewBox="0 0 100 100" className="overlay" aria-hidden="true">
                    <HexOutline hex={initialHex(100, 100)} stroke={0.5} />
                  </svg>
                </>
              )}
            </div>
            <p className="scanner-tip">{t.scanTip}</p>
            <div className="scanner-actions">
              <button onClick={() => fileRef.current?.click()}>{t.upload}</button>
              <button className="primary" onClick={capture} disabled={cameraError}>
                {t.capture}
              </button>
            </div>
          </>
        ) : photo ? (
          <>
            <Adjuster
              photo={photo}
              onChange={(hex) => setPhotos((prev) => prev.map((x, i) => (i === k && x ? { ...x, hex } : x)))}
            />
            {scanError && (
              <div className="error-box" role="alert">
                {t.scanError}
              </div>
            )}
            <div className="scanner-actions">
              {k === 1 && (
                <button
                  onClick={() => {
                    setK(0);
                    setMode('adjust');
                    setScanError(false);
                  }}
                >
                  {t.backToPhoto1}
                </button>
              )}
              <button onClick={() => setMode('live')}>{t.retake}</button>
              <button className="primary" onClick={usePhoto}>
                {k === 0 ? t.nextPhoto : t.usePhotos}
              </button>
            </div>
          </>
        ) : null}
        {fileInput}
      </div>
    </div>
  );
}

/** Bilden med en ram vars hörn går att dra. Visar färgproverna live. */
function Adjuster({ photo, onChange }: { photo: Photo; onChange(hex: Hexagon): void }) {
  const { t } = useI18n();
  const { data, url, hex } = photo;
  const W = data.width,
    H = data.height;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ key: HexKey | 'all'; start: Point; hex: Hexagon } | null>(null);

  const samples = useMemo(() => sampleHexagon(data, hex), [data, hex]);
  const issues = useMemo(() => photoIssues(samples), [samples]);
  const points = useMemo(() => SLOTS.flatMap((s) => stickerPoints(hex, s)), [hex]);
  const unit = Math.min(W, H) / 100;

  const toSvg = (e: React.PointerEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const onDown = (key: HexKey | 'all') => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { key, start: toSvg(e), hex };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(e);
    const dx = p.x - d.start.x,
      dy = p.y - d.start.y;
    const clamp = (q: Point) => ({ x: Math.max(0, Math.min(W, q.x)), y: Math.max(0, Math.min(H, q.y)) });
    if (d.key === 'all') {
      const next = { ...d.hex };
      for (const key of HEX_KEYS) next[key] = clamp({ x: d.hex[key].x + dx, y: d.hex[key].y + dy });
      onChange(next);
    } else {
      onChange({ ...d.hex, [d.key]: clamp({ x: d.hex[d.key].x + dx, y: d.hex[d.key].y + dy }) });
    }
  };

  const outline = (['T', 'TR', 'BR', 'B', 'BL', 'TL'] as HexKey[])
    .map((key) => `${hex[key].x},${hex[key].y}`)
    .join(' ');

  return (
    <>
      <div
        className="viewfinder adjust"
        style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, calc(62vh * ${W / H}))` }}
      >
        <img src={url} alt="" draggable={false} />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="overlay interactive"
          onPointerMove={onMove}
          onPointerUp={() => {
            if (drag.current) onChange(bestOrientation(data, hex));
            drag.current = null;
          }}
          onPointerCancel={() => (drag.current = null)}
        >
          <polygon points={outline} className="hex-fill" onPointerDown={onDown('all')} />
          <HexOutline hex={hex} stroke={unit * 0.4} />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={unit * 1.6}
              fill={`rgb(${samples[i].rgb.map(Math.round).join(',')})`}
              className={'sample' + (isUnreliable(samples[i]) ? ' noisy' : '')}
              strokeWidth={unit * 0.35}
            />
          ))}
          {HEX_KEYS.map((key) => (
            <g key={key} className="handle" onPointerDown={onDown(key)}>
              <circle cx={hex[key].x} cy={hex[key].y} r={unit * 6} className="handle-hit" />
              <circle
                cx={hex[key].x}
                cy={hex[key].y}
                r={unit * 2.2}
                className="handle-dot"
                strokeWidth={unit * 0.5}
              />
            </g>
          ))}
        </svg>
        <span className="sr-only">{t.adjustInstr}</span>
      </div>
      <div className="adjust-tools">
        <button onClick={() => onChange(flipHexagon(hex))}>{t.flipOutline}</button>
        <a className="link-button" href={url} download="cube-photo.jpg">
          {t.savePhoto}
        </a>
      </div>
      {issues.length > 0 && (
        <div className="warn-box" role="status">
          {issues.map((issue) => (
            <p key={issue}>{t.photoIssue[issue]}</p>
          ))}
        </div>
      )}
    </>
  );
}
