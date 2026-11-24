import { useEffect, useState } from 'react'

import { niveauAnimation } from './tirage'

const MINUTE_MS = 60_000

/**
 * L'heure courante, remise à jour chaque minute : la lumière de la feuille dérive avec le soleil.
 * Rien ne tourne quand l'onglet est masqué (on rattrape à son retour), et en niveau « Immobile »
 * la lumière reste figée sur le palier de l'ouverture.
 */
export function useMaintenant(): Date {
  const [maintenant, setMaintenant] = useState(() => new Date())
  useEffect(() => {
    if (niveauAnimation() === 'immobile') return
    let minuteur: ReturnType<typeof setInterval> | undefined
    const arreter = () => {
      if (minuteur !== undefined) clearInterval(minuteur)
      minuteur = undefined
    }
    const demarrer = () => {
      arreter()
      minuteur = setInterval(() => setMaintenant(new Date()), MINUTE_MS)
    }
    const visibilite = () => {
      if (document.hidden) arreter()
      else {
        setMaintenant(new Date())
        demarrer()
      }
    }
    if (!document.hidden) demarrer()
    document.addEventListener('visibilitychange', visibilite)
    return () => {
      arreter()
      document.removeEventListener('visibilitychange', visibilite)
    }
  }, [])
  return maintenant
}
