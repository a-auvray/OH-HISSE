import type { ElementType, ReactNode } from 'react'

import type { Direction, IdEspace } from '../espaces/espaces'

/** Réglage global (pas par thème) : jusqu'où les animations vont. */
export type NiveauAnimation = 'cinema' | 'sobre' | 'immobile'

export interface PropsScene {
  /** Sens du trajet, ou null s'il n'y en a pas (premier affichage, sous-pages). */
  sens: Direction | null
  children: ReactNode
}

/**
 * Un thème est un paquet complet qui va ensemble : l'accueil, les quatre
 * espaces et la façon de passer de l'un à l'autre. Il ne fait que présenter :
 * les données et la logique viennent de l'application, jamais du thème.
 * Les routes, les URL et ce qui est affiché au minimum restent communs (docs/THEMES.md).
 */
export interface Theme {
  Accueil: ElementType
  Espaces: Record<IdEspace, ElementType>
  /** Transition d'une page à l'autre, propre au thème. */
  Scene: ElementType<PropsScene>
  /** Libère ce que le thème a pris (contexte WebGL, boucles d'animation…) quand on le quitte. */
  liberer?: () => void
}

/**
 * Ce que l'on sait d'un thème sans le charger : de quoi le montrer dans le
 * sélecteur. Le thème lui-même (son code, ses polices) n'est téléchargé qu'au premier choix.
 */
export interface MetaTheme {
  id: string
  nom: string
  description: string
  /** Quelques couleurs pour l'aperçu : fond d'abord, puis les teintes marquantes. */
  apercu: readonly string[]
  charger: () => Promise<{ default: Theme }>
}
