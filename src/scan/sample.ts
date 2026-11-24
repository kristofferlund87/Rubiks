import type { RGB } from './color';
import { SLOTS, stickerPoints, type Hexagon, type Point } from './geometry';

/** Medelfärg i en liten ruta runt en punkt. */
export function samplePatch(img: ImageData, p: Point, radius: number): RGB {
  const r = Math.max(1, Math.round(radius));
  const x0 = Math.max(0, Math.round(p.x) - r), x1 = Math.min(img.width - 1, Math.round(p.x) + r);
  const y0 = Math.max(0, Math.round(p.y) - r), y1 = Math.min(img.height - 1, Math.round(p.y) + r);
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = (y * img.width + x) * 4;
      sr += img.data[i];
      sg += img.data[i + 1];
      sb += img.data[i + 2];
      n++;
    }
  return n ? [sr / n, sg / n, sb / n] : [0, 0, 0];
}

/** 27 färgprover (top, left, right) för en bild och ram. */
export function sampleHexagon(img: ImageData, hex: Hexagon): RGB[] {
  // Provets storlek: en del av avståndet mellan hörnet och sexhörningens kant.
  const size = Math.hypot(hex.T.x - hex.C.x, hex.T.y - hex.C.y);
  const radius = size * 0.06;
  return SLOTS.flatMap((slot) => stickerPoints(hex, slot).map((p) => samplePatch(img, p, radius)));
}

/** Rita en bildkälla till en canvas, nedskalad till högst `maxSize` pixlar. */
export function toImageData(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  crop?: { x: number; y: number; w: number; h: number },
  maxSize = 1024,
): { data: ImageData; url: string } {
  const c = crop ?? { x: 0, y: 0, w: sw, h: sh };
  const k = Math.min(1, maxSize / Math.max(c.w, c.h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(c.w * k);
  canvas.height = Math.round(c.h * k);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, c.x, c.y, c.w, c.h, 0, 0, canvas.width, canvas.height);
  return {
    data: ctx.getImageData(0, 0, canvas.width, canvas.height),
    url: canvas.toDataURL('image/jpeg', 0.9),
  };
}
