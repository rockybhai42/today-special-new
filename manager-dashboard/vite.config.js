import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Staff-facing dashboard runs on regular, current browsers — no legacy
// build needed here (that requirement is specific to the TV player, which
// must run on old webOS Chromium).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
