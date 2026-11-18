/**
 * Unique point de contact avec le backend.
 *
 * `API_URL` est la seule constante à changer pour passer du local à la
 * production (leçon du site tableaux). En développement, Vite redirige `/api`
 * vers FastAPI : le frontend et l'API partagent la même origine, ce qui permet
 * au cookie de session httpOnly de circuler sans configuration particulière.
 */
import createClient from 'openapi-fetch'

import type { paths } from './schema'

export const API_URL: string = import.meta.env.VITE_API_URL || window.location.origin

export const api = createClient<paths>({
  baseUrl: API_URL,
  credentials: 'include',
  // Résolu à chaque appel (et non à la création) : les tests peuvent simuler le réseau.
  fetch: (requete) => globalThis.fetch(requete),
})
