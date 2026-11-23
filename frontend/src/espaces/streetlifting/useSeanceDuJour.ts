import { api } from '../../api/client'
import { messageErreur, type SeanceDuJour } from '../../api/types'
import { exiger, useDonnees } from '../../commun/useDonnees'

/** La séance calculée par l'auto-régulation, avec de quoi la recharger après une pesée. Commun à tous les thèmes. */
export function useSeanceDuJour() {
  const [donnees, recharger] = useDonnees(
    async (): Promise<SeanceDuJour> =>
      exiger(await api.GET('/api/streetlifting/seance-du-jour'), (e) => messageErreur(e)),
    [],
  )
  return { donnees, recharger }
}
