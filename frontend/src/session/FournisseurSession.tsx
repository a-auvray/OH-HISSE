import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { api } from '../api/client'
import { ContexteSession, type EtatSession, type Session } from './contexte'

const INJOIGNABLE = 'Le serveur ne répond pas. Réessaie dans un instant.'

/**
 * Message lisible à partir d'une réponse en erreur. FastAPI renvoie `{ detail: "…" }` ; sans
 * ce détail, c'est que la requête n'a pas atteint l'API (serveur arrêté, proxy absent…).
 */
function messageErreur(erreur: unknown, statut: number, parDefaut: string): string {
  if (erreur && typeof erreur === 'object' && 'detail' in erreur && typeof erreur.detail === 'string') {
    return erreur.detail
  }
  return statut === 404 || statut >= 500 ? INJOIGNABLE : parDefaut
}

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatSession>({ statut: 'chargement' })

  // Au chargement : le cookie httpOnly est invisible pour le JavaScript, on demande donc à l'API.
  useEffect(() => {
    let actif = true
    api
      .GET('/api/auth/moi')
      .then(({ data }) => {
        if (actif) setEtat(data ? { statut: 'connecte', utilisateur: data } : { statut: 'anonyme' })
      })
      .catch(() => {
        if (actif) setEtat({ statut: 'anonyme' })
      })
    return () => {
      actif = false
    }
  }, [])

  const seConnecter = useCallback(async (email: string, motDePasse: string) => {
    try {
      const { data, error, response } = await api.POST('/api/auth/connexion', {
        body: { email, mot_de_passe: motDePasse },
      })
      if (!data) return messageErreur(error, response.status, 'Connexion impossible.')
      setEtat({ statut: 'connecte', utilisateur: data })
      return null
    } catch {
      return INJOIGNABLE
    }
  }, [])

  const entrerEnDemo = useCallback(async () => {
    try {
      const { data, error, response } = await api.POST('/api/auth/demo')
      if (!data) return messageErreur(error, response.status, 'Impossible d’ouvrir la démo.')
      setEtat({ statut: 'connecte', utilisateur: data })
      return null
    } catch {
      return INJOIGNABLE
    }
  }, [])

  const seDeconnecter = useCallback(async () => {
    try {
      await api.POST('/api/auth/deconnexion')
    } finally {
      setEtat({ statut: 'anonyme' })
    }
  }, [])

  const session = useMemo<Session>(
    () => ({ etat, seConnecter, entrerEnDemo, seDeconnecter }),
    [etat, seConnecter, entrerEnDemo, seDeconnecter],
  )

  return <ContexteSession value={session}>{children}</ContexteSession>
}
