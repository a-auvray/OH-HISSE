/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // En local, /api est servi par FastAPI (uv run uvicorn app.main:app --reload).
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    // La carte (MapLibre, ~1 Mo) est un morceau à part, chargé seulement à l'ouverture de son onglet.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
