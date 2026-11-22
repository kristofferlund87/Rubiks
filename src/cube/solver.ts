import { parseAlg, toKociembaString, type Facelets, type Move } from './model';

type Response =
  | { type: 'ready' }
  | { type: 'solution'; id: number; solution: string }
  | { type: 'error'; id: number; message: string };

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (m: Move[]) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
  readyPromise = new Promise((resolve) => {
    worker!.addEventListener('message', (e: MessageEvent<Response>) => {
      const msg = e.data;
      if (msg.type === 'ready') return resolve();
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.type === 'solution') p.resolve(parseAlg(msg.solution));
      else p.reject(new Error(msg.message));
    });
  });
  return worker;
}

/** Starta lösaren i bakgrunden. Resolvar när den är redo. */
export function warmUpSolver(): Promise<void> {
  getWorker();
  return readyPromise!;
}

export function solve(state: Facelets): Promise<Move[]> {
  const w = getWorker();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, facelets: toKociembaString(state) });
  });
}
