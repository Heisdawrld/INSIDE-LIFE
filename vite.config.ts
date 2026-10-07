import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2022', rollupOptions: { output: { manualChunks: (id) => id.includes('/three/') ? 'three' : undefined } } },
  server: { port: 4173, strictPort: true },
});
