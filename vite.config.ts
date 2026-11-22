import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relativa sökvägar så att appen fungerar under t.ex. /Rubiks/ på GitHub Pages.
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 1000 },
});
