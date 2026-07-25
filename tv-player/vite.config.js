import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

// LG webOS's browser is pinned to whatever Chromium shipped with that TV's
// firmware (as old as Chrome 38 on webOS 3.x). Legacy chunks + polyfills
// keep the player running on hardware that never sees a browser update.
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 38', 'safari >= 10', 'not dead'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
  ],
  server: {
    port: 5174,
  },
});
