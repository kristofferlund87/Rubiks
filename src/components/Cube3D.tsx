import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Facelets, Move } from '../cube/model';
import { CubeScene } from './cubeScene';

export interface Cube3DHandle {
  animateMove(move: Move, after: Facelets, durationMs?: number): Promise<void>;
  resetView(): void;
}

interface Props {
  state: Facelets;
  highlight?: Set<number>;
}

export const Cube3D = forwardRef<Cube3DHandle, Props>(function Cube3D({ state, highlight }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CubeScene | null>(null);

  useEffect(() => {
    const scene = new CubeScene(containerRef.current!);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setState(state, highlight);
  }, [state, highlight]);

  useImperativeHandle(ref, () => ({
    animateMove: (move, after, durationMs) =>
      sceneRef.current?.animateMove(move, after, durationMs) ?? Promise.resolve(),
    resetView: () => sceneRef.current?.resetView(),
  }));

  return (
    <div className="cube3d" ref={containerRef} aria-label="3D-vy av kuben. Dra för att vrida på den." />
  );
});
