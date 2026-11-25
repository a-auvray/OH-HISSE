import { animate } from 'motion/react'
import { useContext, useEffect, useRef, useState } from 'react'

import { api } from '../../../api/client'
import { type Assistant, messageErreur } from '../../../api/types'
import { exiger, useDonnees } from '../../../commun/useDonnees'
import { ContexteTheme } from '../../../themes/contexte'
import type { NiveauAnimation } from '../../../themes/types'

export type Creneau = Assistant['creneaux'][number]
export type Durees = NonNullable<Assistant['recommandations']>['durees']

/** Le niveau d'animation choisi dans les réglages ; sans fournisseur de thème (tests), celui de `<html>`. */
export function useNiveauAnimation(): NiveauAnimation {
  const contexte = useContext(ContexteTheme)
  if (contexte) return contexte.animation
  const attribut = document.documentElement.dataset.animations
  return attribut === 'sobre' || attribut === 'immobile' ? attribut : 'cinema'
}

/**
 * Une valeur qui glisse vers sa cible (ressort amorti) au lieu d'y sauter : c'est le trait d'eau qui
 * avance sur le sable et le chiffre de distance qui se recompte. En « immobile », elle saute.
 */
export function useLisse(cible: number, animation: NiveauAnimation): number {
  const [valeur, setValeur] = useState(cible)
  const depart = useRef(cible)
  useEffect(() => {
    if (animation === 'immobile') {
      depart.current = cible
      return
    }
    const lecture = animate(depart.current, cible, {
      duration: animation === 'sobre' ? 0.35 : 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        depart.current = v
        setValeur(v)
      },
    })
    return () => lecture.stop()
  }, [cible, animation])
  return animation === 'immobile' ? cible : valeur
}

/**
 * Le meilleur créneau de nage (40 min, sans combinaison) et les durées conseillées pour l'eau d'aujourd'hui :
 * la même requête que les autres vues de la mer. Elle ne bloque jamais la page : sans réponse, on n'affiche pas de créneau.
 */
export function useAssistantEtale(spotId: number | null): {
  creneau: Creneau | null
  durees: Durees | null
} {
  const [reponse] = useDonnees(
    async () =>
      spotId === null
        ? null
        : exiger(
            await api.GET('/api/marine/assistant', {
              params: { query: { spot_id: spotId, mode: 'nage', duree_min: 40, combinaison: false } },
            }),
            (e) => messageErreur(e, 'Assistant indisponible.'),
          ),
    [spotId],
  )
  const assistant = reponse.etat === 'pret' ? reponse.valeur : null
  return { creneau: assistant?.creneaux?.[0] ?? null, durees: assistant?.recommandations?.durees ?? null }
}
