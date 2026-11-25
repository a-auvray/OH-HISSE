import { useMemo } from 'react'

import { api } from '../../../api/client'
import type { BlocLu, ObjectifLu, PointEvolution } from '../../../api/types'
import { aujourdhui } from '../../../commun/format'
import { useDonnees } from '../../../commun/useDonnees'
import { useObjectifs } from '../../../espaces/objectifs/useObjectifs'
import { type Analyse, analyser } from './modele'

export interface Planche {
  objectif: ObjectifLu
  analyse: Analyse
  /** Faux si l'historique d'e1RM n'a pas pu être lu : la planche n'a alors ni courbe ni plan. */
  historique: boolean
}

interface Historiques {
  cle: string
  parExercice: Map<number, PointEvolution[] | null>
  blocs: BlocLu[] | null
}

/**
 * Les objectifs de l'application (les mêmes gestes que toutes les pages) et, pour chacun, ce qu'il
 * faut pour dessiner sa planche : l'historique d'e1RM de son mouvement et ses blocs. Ces deux
 * lectures sont des compléments : si l'une échoue, la planche se dessine sans elle, sans rien inventer.
 */
export function useTirage(jour: string = aujourdhui()) {
  const base = useObjectifs()
  const identifiants = [...new Set(base.liste.map((o) => o.exercice_id))].sort((a, b) => a - b)
  const cle = identifiants.join(',')

  const [lectures] = useDonnees<Historiques>(async () => {
    const parExercice = new Map<number, PointEvolution[] | null>()
    await Promise.all(
      identifiants.map(async (id) => {
        try {
          const { data } = await api.GET('/api/streetlifting/evolution/{exercice_id}', {
            params: { path: { exercice_id: id } },
          })
          parExercice.set(id, Array.isArray(data) ? data : null)
        } catch {
          parExercice.set(id, null)
        }
      }),
    )
    let blocs: BlocLu[] | null = null
    if (identifiants.length > 0) {
      try {
        const { data } = await api.GET('/api/streetlifting/blocs')
        blocs = Array.isArray(data) ? data : null
      } catch {
        blocs = null
      }
    }
    return { cle, parExercice, blocs }
    // `identifiants` découle de `cle` : seule la liste des mouvements relance les lectures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle])

  // Tant que les lectures ne correspondent pas aux objectifs affichés, on n'invente pas de planche à moitié dessinée.
  const prete = lectures.etat === 'pret' && lectures.valeur.cle === cle
  const lecturesPretes = lectures.etat === 'pret' ? lectures.valeur : null

  const planches: Planche[] | null = useMemo(() => {
    if (base.objectifs.etat !== 'pret') return null
    if (!prete && cle !== '') return null
    return base.liste.map((objectif) => {
      const evolution = lecturesPretes?.parExercice.get(objectif.exercice_id) ?? null
      return {
        objectif,
        historique: evolution !== null,
        analyse: analyser(objectif, evolution, lecturesPretes?.blocs ?? null, jour),
      }
    })
  }, [base.objectifs.etat, base.liste, prete, cle, lecturesPretes, jour])

  return { ...base, planches, jour }
}
