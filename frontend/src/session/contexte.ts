import { createContext, useContext } from 'react'

import type { components } from '../api/schema'

export type Utilisateur = components['schemas']['UtilisateurPublic']

export type EtatSession =
  { statut: 'chargement' } | { statut: 'anonyme' } | { statut: 'connecte'; utilisateur: Utilisateur }

export interface Session {
  etat: EtatSession
  /** Renvoie un message d'erreur à afficher, ou null si la connexion a réussi. */
  seConnecter: (email: string, motDePasse: string) => Promise<string | null>
  entrerEnDemo: () => Promise<string | null>
  seDeconnecter: () => Promise<void>
}

export const ContexteSession = createContext<Session | null>(null)

export function useSession(): Session {
  const session = useContext(ContexteSession)
  if (!session) throw new Error('useSession doit être utilisé sous <FournisseurSession>')
  return session
}
