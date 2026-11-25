import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { api } from '../../../api/client'
import type { PointEvolution } from '../../../api/types'
import { messageErreur } from '../../../api/types'
import { exiger } from '../../../commun/useDonnees'
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

async function chargerEvolution(id: number): Promise<[number, readonly PointEvolution[]]> {
  try {
    const points = exiger(
      await api.GET('/api/streetlifting/evolution/{exercice_id}', { params: { path: { exercice_id: id } } }),
      (e) => messageErreur(e),
    )
    return [id, points]
  } catch {
    return [id, []]
  }
}

/**
 * L'historique d'e1RM de chaque mouvement visé, pour calculer la pente réelle. Chaque mouvement n'est téléchargé
 * qu'une fois : changer d'objectif ou de statut ne relance que les mouvements encore inconnus, et les points déjà
 * connus restent servis pendant ce temps. `chargement` est vrai tant qu'un mouvement visé n'a pas répondu.
 * Un mouvement dont l'historique ne se charge pas n'empêche rien : sa pente est simplement inconnue.
 */
export function useEvolutions(exerciceIds: readonly number[]): {
  evolutions: Evolutions
  chargement: boolean
} {
  const ids = [...new Set(exerciceIds)].sort((a, b) => a - b)
  const cle = ids.join(',')
  const [connues, setConnues] = useState<Evolutions>(AUCUNE)
  const demandees = useRef(new Set<number>())

  useEffect(() => {
    const aCharger = (cle === '' ? [] : cle.split(',').map(Number)).filter((id) => !demandees.current.has(id))
    if (aCharger.length === 0) return
    for (const id of aCharger) demandees.current.add(id)
    void Promise.all(aCharger.map(chargerEvolution)).then((lots) =>
      setConnues((avant) => new Map([...avant, ...lots])),
    )
  }, [cle])

  return { evolutions: connues, chargement: ids.some((id) => !connues.has(id)) }
}
