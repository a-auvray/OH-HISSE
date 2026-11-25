import { useEffect, useState } from 'react'

import type { Planche } from './donnees'
import { empreinte } from './modele'
import { developpementComplet, ecrireVisite, lireVisite, type Visite } from './visite'

export interface SessionVisite {
  /** Le passage en tireuse en entier : premier passage du jour, ou une donnée a changé depuis. */
  complet: boolean
  /** La visite d'avant, pour faire partir la ligne du jour et les compteurs de leur ancienne valeur. */
  precedente: Visite | null
}

/**
 * La visite qui commence : on lit la précédente une seule fois (avant de l'écraser), on décide si la
 * planche se développe en entier, puis on enregistre ce qu'on voit maintenant. Renvoie null tant que
 * les planches ne sont pas prêtes : rien ne se dessine à moitié.
 */
export function useVisite(planches: readonly Planche[] | null, jour: string): SessionVisite | null {
  const [session, setSession] = useState<SessionVisite | null>(null)
  const objectifs = planches?.map((p) => p.objectif)
  const cle = objectifs ? empreinte(objectifs) : null

  useEffect(() => {
    if (!objectifs || cle === null) return
    const precedente = lireVisite()
    setSession((deja) => deja ?? { complet: developpementComplet(precedente, jour, cle), precedente })
    ecrireVisite({
      jour,
      empreinte: cle,
      pourcentages: Object.fromEntries(
        (planches ?? []).map((p) => [String(p.objectif.id), Math.round(p.analyse.pourcentage)]),
      ),
    })
    // `cle` résume les objectifs et les pourcentages : elle seule relance l'enregistrement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, jour])

  return session
}
