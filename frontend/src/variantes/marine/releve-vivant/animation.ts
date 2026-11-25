import { useSyncExternalStore } from 'react'

import type { NiveauAnimation } from '../../../themes/types'

function lire(): NiveauAnimation {
  const v = document.documentElement.dataset.animations
  return v === 'sobre' || v === 'immobile' ? v : 'cinema'
}

function abonner(rappel: () => void) {
  const observateur = new MutationObserver(rappel)
  observateur.observe(document.documentElement, { attributes: true, attributeFilter: ['data-animations'] })
  return () => observateur.disconnect()
}

/**
 * Le niveau d'animation réglé (« cinéma », « sobre » ou « immobile »), lu sur `<html data-animations>`.
 * On le lit là plutôt que dans le fournisseur de thème : la vue marche aussi sans lui, et suit le réglage en direct.
 */
export function useNiveauAnimation(): NiveauAnimation {
  return useSyncExternalStore(abonner, lire, () => 'cinema')
}
