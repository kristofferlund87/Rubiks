/// <reference lib="webworker" />
import Cube from 'cubejs';

type Request = { id: number; facelets: string };

// Tabellerna tar några sekunder att bygga – gör det direkt när workern startar.
Cube.initSolver();
self.postMessage({ type: 'ready' });

self.onmessage = (e: MessageEvent<Request>) => {
  const { id, facelets } = e.data;
  try {
    const cube = Cube.fromString(facelets);
    const solution = cube.isSolved() ? '' : cube.solve();
    self.postMessage({ type: 'solution', id, solution });
  } catch (err) {
    self.postMessage({ type: 'error', id, message: String(err) });
  }
};
