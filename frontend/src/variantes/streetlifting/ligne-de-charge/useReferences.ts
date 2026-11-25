import { api } from '../../../api/client'
import type { ObjectifLu, PointEvolution } from '../../../api/types'
import { useDonnees } from '../../../commun/useDonnees'
import { recordTotal } from './modele'

export interface ReferenceExercice {
  /** Les séances passées de l'exercice, de la plus ancienne à la plus récente. */
  evolution: PointEvolution[]
  /** Meilleur e1RM total de l'historique : ce à quoi on compare la charge du jour. */
  record: number | null
}

export interface References {
  /** Une entrée par exercice de la séance dont l'historique a pu être lu. */
  parExercice: ReadonlyMap<number, ReferenceExercice>
  /** L'objectif en cours qui vise un exercice de la séance (le principal d'abord), s'il y en a un. */
  objectif: ObjectifLu | null
  /** Faux si au moins une lecture a échoué : la page le dit au lieu de faire comme si de rien n'était. */
  complet: boolean
}

const VIDES: References = { parExercice: new Map(), objectif: null, complet: true }

/** L'objectif à tracer : un objectif en cours sur un exercice de la séance, le principal de préférence. */
export function objectifDeLaSeance(
  objectifs: readonly ObjectifLu[],
  ids: readonly number[],
): ObjectifLu | null {
  const candidats = objectifs.filter((o) => o.statut === 'en_cours' && ids.includes(o.exercice_id))
  return candidats.find((o) => o.principal) ?? candidats[0] ?? null
}

async function charger(ids: readonly number[]): Promise<References> {
  if (ids.length === 0) return VIDES
  let complet = true

  // Les objectifs sont un plus : s'ils ne se lisent pas, la page se passe de la ligne de cible.
  let objectifs: ObjectifLu[] = []
  try {
    const reponse = await api.GET('/api/objectifs')
    if (reponse.data) objectifs = reponse.data
    else complet = false
  } catch {
    complet = false
  }

  const lectures = await Promise.all(
    ids.map(async (id): Promise<[number, ReferenceExercice] | null> => {
      try {
        const reponse = await api.GET('/api/streetlifting/evolution/{exercice_id}', {
          params: { path: { exercice_id: id } },
        })
        if (!reponse.data) return null
        return [id, { evolution: reponse.data, record: recordTotal(reponse.data) }]
      } catch {
        return null
      }
    }),
  )
  if (lectures.some((l) => l === null)) complet = false

  return {
    parExercice: new Map(lectures.filter((l): l is [number, ReferenceExercice] => l !== null)),
    objectif: objectifDeLaSeance(objectifs, ids),
    complet,
  }
}

/**
 * Ce qu'il faut pour situer les charges du jour : l'historique de chaque exercice (donc son record) et
 * l'objectif visé. Les données viennent de l'API ; une lecture qui échoue n'empêche pas la séance de
 * s'afficher, elle manque seulement à la profondeur.
 */
export function useReferences(ids: readonly number[]): References {
  const cle = [...new Set(ids)].sort((a, b) => a - b).join(',')
  const [donnees] = useDonnees(() => charger(cle === '' ? [] : cle.split(',').map(Number)), [cle])
  return donnees.etat === 'pret' ? donnees.valeur : VIDES
}
