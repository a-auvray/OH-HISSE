import { useState } from 'react'

import { api } from '../../api/client'
import { messageErreur } from '../../api/types'
import { exiger, useDonnees } from '../../commun/useDonnees'
import { agreger, type Metrique, type Periode } from './chronologie'
import { METRIQUES } from './metriques'

/**
 * Ce que l'analyse sait : l'exercice choisi, la grandeur, la période, et les
 * points qui en résultent. Commun à tous les thèmes, qui choisissent seulement
 * comment les dessiner.
 */
export function useAnalyse() {
  const [exercices] = useDonnees(
    async () => exiger(await api.GET('/api/streetlifting/exercices'), (e) => messageErreur(e)),
    [],
  )
  const [choix, choisirExercice] = useState<number | null>(null)
  const [metrique, choisirMetrique] = useState<Metrique>('e1rm_lest_kg')
  const [periode, choisirPeriode] = useState<Periode>('seance')

  const exerciceId = choix ?? (exercices.etat === 'pret' ? (exercices.valeur[0]?.id ?? null) : null)
  const [evolution] = useDonnees(
    async () =>
      exerciceId === null
        ? []
        : exiger(
            await api.GET('/api/streetlifting/evolution/{exercice_id}', {
              params: { path: { exercice_id: exerciceId } },
            }),
            (e) => messageErreur(e),
          ),
    [exerciceId],
  )

  const brut = evolution.etat === 'pret' ? evolution.valeur : []
  const definition = METRIQUES.find((m) => m.id === metrique) ?? METRIQUES[0]!
  const points = agreger(brut, metrique, periode)
  const records = agreger(brut, 'e1rm_lest_kg', 'seance')
  const meilleur = records.reduce<(typeof records)[number] | undefined>(
    (m, p) => (!m || p.valeur > m.valeur ? p : m),
    undefined,
  )

  return {
    exercices,
    exerciceId,
    choisirExercice,
    metrique,
    choisirMetrique,
    periode,
    choisirPeriode,
    evolution,
    definition,
    points,
    /** Une courbe par grandeur, pour pouvoir les comparer d'un coup d'œil. */
    parMetrique: METRIQUES.map((m) => ({ ...m, points: agreger(brut, m.id, periode) })),
    premier: records[0],
    dernier: records.at(-1),
    meilleur,
  }
}
