import { useState } from 'react'

import { api } from '../../api/client'
import { messageErreur } from '../../api/types'
import { exiger, useDonnees } from '../../commun/useDonnees'

/**
 * Ce que l'espace Marine sait à tout moment : les plages, celle qui est
 * choisie (la première par défaut) et ses conditions. Commun à tous les thèmes.
 */
export function useMarine() {
  const [spots] = useDonnees(
    async () => exiger(await api.GET('/api/marine/spots'), (e) => messageErreur(e)),
    [],
  )
  const [choix, choisirSpot] = useState<number | null>(null)
  const spotId = choix ?? (spots.etat === 'pret' ? (spots.valeur[0]?.id ?? null) : null)

  const [conditions, recharger] = useDonnees(
    async () =>
      spotId === null
        ? null
        : exiger(await api.GET('/api/marine/conditions', { params: { query: { spot_id: spotId } } }), (e) =>
            messageErreur(e, 'Conditions indisponibles.'),
          ),
    [spotId],
  )

  return { spots, spotId, choisirSpot, conditions, recharger }
}
