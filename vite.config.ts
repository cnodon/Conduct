import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/gui/renderer'),
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/gui'),
    emptyOutDir: true,
  },
});
