import { useEffect, useState } from 'react'

import { api } from '../api/client'

export type EtatApi = { statut: 'chargement' } | { statut: 'ok'; version: string } | { statut: 'injoignable' }

/** Interroge `/api/sante` une fois au montage. */
export function useEtatApi(): EtatApi {
  const [etat, setEtat] = useState<EtatApi>({ statut: 'chargement' })

  useEffect(() => {
    let actif = true
    api
      .GET('/api/sante')
      .then(({ data }) => {
        if (actif) setEtat(data ? { statut: 'ok', version: data.version } : { statut: 'injoignable' })
      })
      .catch(() => {
        if (actif) setEtat({ statut: 'injoignable' })
      })
    return () => {
      actif = false
    }
  }, [])

  return etat
}
