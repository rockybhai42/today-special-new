import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deliberately separate from vite.config.js: the legacy build plugin there
// targets old webOS Chromium at build time and has no bearing on how tests
// run under Node/jsdom.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    mockReset: true,
  },
});
