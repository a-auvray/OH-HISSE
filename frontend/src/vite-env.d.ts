/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de l'API en production ; vide en local (proxy Vite). */
  readonly VITE_API_URL?: string
}
