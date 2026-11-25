import { api } from '../../../api/client'
import { messageErreur } from '../../../api/types'
import { exiger, useDonnees } from '../../../commun/useDonnees'

/**
 * Ce que l'assistant de Marine dit du moment, pour un spot : le meilleur créneau de nage (40 min,
 * sans combinaison) et les durées conseillées en eau froide. Une seule requête, et jamais bloquante :
 * si l'assistant ne répond pas, la page garde tout le reste.
 */
export function useReleve(spotId: number | null) {
  const [reponse] = useDonnees(async () => {
    if (spotId === null) return null
    const assistant = exiger(
      await api.GET('/api/marine/assistant', {
        params: { query: { spot_id: spotId, mode: 'nage', duree_min: 40, combinaison: false } },
      }),
      (e) => messageErreur(e, 'Assistant indisponible.'),
    )
    return { creneau: assistant.creneaux[0] ?? null, durees: assistant.recommandations?.durees ?? null }
  }, [spotId])
  return reponse.etat === 'pret' && reponse.valeur ? reponse.valeur : { creneau: null, durees: null }
}
