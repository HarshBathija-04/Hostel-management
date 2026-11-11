import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5212, strictPort: true },
  preview: { port: 5212, strictPort: true },
  test: { environment: 'node' },
});
