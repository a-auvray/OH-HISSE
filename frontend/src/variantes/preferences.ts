import { ESPACES, type IdEspace } from '../espaces/espaces'
import { metaVariante, VARIANTES } from './registre'
import type { MetaVariante } from './types'

export const CLE_VARIANTES = 'oh-hisse.variantes'

/** La variante choisie pour chaque espace ; un espace absent montre les vues de son thème. */
export type ChoixVariantes = Partial<Record<IdEspace, string>>

/** Choix mémorisés dans ce navigateur ; une variante disparue ou un stockage abîmé retombe sur le thème. */
export function lireChoix(
  variantes: Readonly<Record<IdEspace, readonly MetaVariante[]>> = VARIANTES,
): ChoixVariantes {
  try {
    const brut: unknown = JSON.parse(localStorage.getItem(CLE_VARIANTES) ?? 'null')
    if (typeof brut !== 'object' || brut === null) return {}
    const choix: ChoixVariantes = {}
    for (const { id } of ESPACES) {
      const valeur = (brut as Record<string, unknown>)[id]
      if (typeof valeur === 'string' && metaVariante(id, valeur, variantes)) choix[id] = valeur
    }
    return choix
  } catch {
    return {}
  }
}

export function ecrireChoix(choix: ChoixVariantes): void {
  try {
    localStorage.setItem(CLE_VARIANTES, JSON.stringify(choix))
  } catch {
    // Stockage indisponible (navigation privée…) : le choix vaut pour cette visite seulement.
  }
}
