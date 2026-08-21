import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Use relative paths for assets so ComfyUI server can host them anywhere
  build: {
    outDir: '../web', // Build directly into the timeline_bridge/web directory
    target: 'esnext' // Modern browser features like WebCodecs
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
