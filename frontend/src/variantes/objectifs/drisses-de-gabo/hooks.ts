import { useSyncExternalStore } from 'react'

import { api } from '../../../api/client'
import type { PointEvolution } from '../../../api/types'
import { messageErreur } from '../../../api/types'
import { exiger, useDonnees } from '../../../commun/useDonnees'
import type { NiveauAnimation } from '../../../themes/types'

function lireAnimation(): NiveauAnimation {
  const valeur = document.documentElement.dataset.animations
  return valeur === 'sobre' || valeur === 'immobile' ? valeur : 'cinema'
}

function abonner(rappel: () => void) {
  const observateur = new MutationObserver(rappel)
  observateur.observe(document.documentElement, { attributes: true, attributeFilter: ['data-animations'] })
  return () => observateur.disconnect()
}

/**
 * Le niveau d'animation réglé dans l'application, lu sur `<html data-animations>` : la variante ne dépend
 * pas du contexte du thème, elle reste donc utilisable (et testable) seule. Sans réglage, tout est permis.
 */
export function useNiveauAnimation(): NiveauAnimation {
  return useSyncExternalStore(abonner, lireAnimation, () => 'cinema')
}

export type Evolutions = ReadonlyMap<number, readonly PointEvolution[]>

const AUCUNE: Evolutions = new Map()

/**
 * L'historique d'e1RM de chaque mouvement visé, pour calculer la pente réelle. Un mouvement dont l'historique
 * ne se charge pas n'empêche rien : sa pente est simplement inconnue (« données insuffisantes »).
 */
export function useEvolutions(exerciceIds: readonly number[]): {
  evolutions: Evolutions
  chargement: boolean
} {
  const cle = [...new Set(exerciceIds)].sort((a, b) => a - b).join(',')
  const [donnees] = useDonnees(async (): Promise<Evolutions> => {
    const ids = cle === '' ? [] : cle.split(',').map(Number)
    const lots = await Promise.all(
      ids.map(async (id): Promise<[number, readonly PointEvolution[]]> => {
        try {
          const points = exiger(
            await api.GET('/api/streetlifting/evolution/{exercice_id}', {
              params: { path: { exercice_id: id } },
            }),
            (e) => messageErreur(e),
          )
          return [id, points]
        } catch {
          return [id, []]
        }
      }),
    )
    return new Map(lots)
  }, [cle])
  return donnees.etat === 'pret'
    ? { evolutions: donnees.valeur, chargement: false }
    : { evolutions: AUCUNE, chargement: donnees.etat === 'chargement' }
}
