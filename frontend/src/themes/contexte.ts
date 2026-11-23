import { createContext, useContext } from 'react'

import type { MetaTheme, NiveauAnimation, Theme } from './types'

export interface ContexteThemeValeur {
  /** Thème affiché, ou null le temps de son premier chargement. */
  theme: Theme | null
  id: string
  themes: readonly MetaTheme[]
  /** Un changement de thème est en cours (le nouveau se charge). */
  enChangement: boolean
  /** Message à afficher si le dernier changement a échoué (le thème précédent reste en place). */
  erreur: string | null
  choisir: (id: string) => Promise<void>
  /** Commence à télécharger un thème sans l'activer (au survol, par exemple). */
  prechauffer: (id: string) => void
  favoris: readonly string[]
  basculerFavori: (id: string) => void
  animation: NiveauAnimation
  reglerAnimation: (niveau: NiveauAnimation) => void
}

export const ContexteTheme = createContext<ContexteThemeValeur | null>(null)

export function useTheme(): ContexteThemeValeur {
  const valeur = useContext(ContexteTheme)
  if (!valeur) throw new Error('useTheme doit être utilisé sous <FournisseurTheme>')
  return valeur
}
