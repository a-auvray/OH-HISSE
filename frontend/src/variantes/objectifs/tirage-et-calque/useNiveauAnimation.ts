import { useSyncExternalStore } from 'react'

import type { NiveauAnimation } from '../../../themes/types'

const NIVEAUX: readonly NiveauAnimation[] = ['cinema', 'sobre', 'immobile']

function lire(): NiveauAnimation {
  const valeur = document.documentElement.dataset.animations
  return NIVEAUX.find((n) => n === valeur) ?? 'cinema'
}

function abonner(rappel: () => void) {
  const observateur = new MutationObserver(rappel)
  observateur.observe(document.documentElement, { attributes: true, attributeFilter: ['data-animations'] })
  return () => observateur.disconnect()
}

/**
 * Le niveau d'animation choisi dans les réglages (`data-animations` sur <html>). On le lit là, et
 * non dans le contexte du thème : la variante doit aussi se dessiner seule, comme dans ses tests.
 */
export function useNiveauAnimation(): NiveauAnimation {
  return useSyncExternalStore(abonner, lire, () => 'cinema')
}
