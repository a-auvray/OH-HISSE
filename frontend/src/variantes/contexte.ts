import { createContext, useContext } from 'react'

import type { IdEspace } from '../espaces/espaces'
import type { MetaVariante, VuesParEspace } from './types'

export interface ContexteVariantesValeur {
  variantes: Readonly<Record<IdEspace, readonly MetaVariante[]>>
  /** L'identifiant de la variante choisie pour l'espace, ou null : les vues du thème. */
  choisie: (espace: IdEspace) => string | null
  /** Les vues de la variante choisie, une fois chargées. */
  vues: { [E in IdEspace]?: VuesParEspace[E] }
  /** Une variante est en train de se charger : le thème montre ses vues le temps qu'elle arrive. */
  enChargement: (espace: IdEspace) => boolean
  choisir: (espace: IdEspace, id: string | null) => void
  /** Commence à télécharger une variante sans l'activer (au survol, par exemple). */
  prechauffer: (espace: IdEspace, id: string) => void
  erreur: string | null
}

export const ContexteVariantes = createContext<ContexteVariantesValeur | null>(null)

export function useVariantes(): ContexteVariantesValeur {
  const valeur = useContext(ContexteVariantes)
  if (!valeur) throw new Error('useVariantes doit être utilisé sous <FournisseurVariantes>')
  return valeur
}
