/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'

import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * MapLibre 6 charge son travailleur depuis un fichier à part, `maplibre-gl-worker.mjs`, qu'il
 * cherche à côté du morceau de la carte. Vite ne l'embarque pas : sans lui la carte reste vide
 * (le serveur répond 404). On le livre sous un nom en `.js`, que tout serveur sert en JavaScript.
 */
export const FICHIER_TRAVAILLEUR = 'assets/maplibre-gl-worker.js'

function travailleurMapLibre(): Plugin {
  return {
    name: 'travailleur-maplibre',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: FICHIER_TRAVAILLEUR,
        source: readFileSync(
          new URL('./node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url),
        ),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), travailleurMapLibre()],
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
