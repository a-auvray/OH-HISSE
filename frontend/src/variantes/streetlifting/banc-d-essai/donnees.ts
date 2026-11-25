import { api } from '../../../api/client'
import { messageErreur, type ObjectifLu, type PointEvolution } from '../../../api/types'
import { type Donnees, exiger, useDonnees } from '../../../commun/useDonnees'

/** L'évolution de chaque exercice demandé, par identifiant ; ceux qui n'ont pas pu être lus sont listés à part. */
export interface Evolutions {
  parExercice: Readonly<Record<number, readonly PointEvolution[]>>
  manquants: readonly number[]
}

/**
 * L'historique des exercices de la séance : il donne à chaque exercice sa limite (le dernier 1RM
 * estimé). Une lecture qui échoue n'empêche pas la page : l'exercice reste sans courbe.
 * `ids` est null tant que la séance n'est pas arrivée.
 */
export function useEvolutions(ids: readonly number[] | null): Donnees<Evolutions> {
  const uniques = ids === null ? null : [...new Set(ids)].sort((a, b) => a - b)
  const [donnees] = useDonnees(async (): Promise<Evolutions> => {
    const liste = uniques ?? []
    const reponses = await Promise.allSettled(
      liste.map(async (id) =>
        exiger(
          await api.GET('/api/streetlifting/evolution/{exercice_id}', {
            params: { path: { exercice_id: id } },
          }),
          (e) => messageErreur(e),
        ),
      ),
    )
    const parExercice: Record<number, readonly PointEvolution[]> = {}
    const manquants: number[] = []
    reponses.forEach((r, i) => {
      const id = liste[i]
      if (id === undefined) return
      if (r.status === 'fulfilled') parExercice[id] = r.value
      else manquants.push(id)
    })
    return { parExercice, manquants }
  }, [uniques?.join(',') ?? null])
  return donnees
}

/** Les objectifs : la limite visée d'un exercice en vient. Sans eux, la courbe n'a simplement pas de ligne visée. */
export function useObjectifsDuBanc(): Donnees<ObjectifLu[]> {
  const [donnees] = useDonnees(
    async () => exiger(await api.GET('/api/objectifs'), (e) => messageErreur(e)),
    [],
  )
  return donnees
}
