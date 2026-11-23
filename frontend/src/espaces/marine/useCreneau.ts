import { api } from '../../api/client'
import { messageErreur } from '../../api/types'
import { exiger, useDonnees } from '../../commun/useDonnees'

/**
 * Le meilleur créneau de nage des prochains jours pour une plage (40 min,
 * sans combinaison) : la réponse que tout thème montre en premier. Null quand
 * l'assistant n'en trouve pas ; l'erreur ne bloque jamais la page.
 */
export function useCreneau(spotId: number | null) {
  const [reponse] = useDonnees(
    async () =>
      spotId === null
        ? null
        : (exiger(
            await api.GET('/api/marine/assistant', {
              params: { query: { spot_id: spotId, mode: 'nage', duree_min: 40, combinaison: false } },
            }),
            (e) => messageErreur(e, 'Assistant indisponible.'),
          ).creneaux[0] ?? null),
    [spotId],
  )
  return reponse.etat === 'pret' ? reponse.valeur : null
}
