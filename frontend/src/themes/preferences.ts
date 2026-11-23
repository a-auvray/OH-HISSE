import { metaTheme, THEME_PAR_DEFAUT } from './registre'
import type { MetaTheme, NiveauAnimation } from './types'

const CLE = 'oh-hisse.themes'

export interface Preferences {
  theme: string
  favoris: string[]
  animation: NiveauAnimation
}

const NIVEAUX: readonly NiveauAnimation[] = ['cinema', 'sobre', 'immobile']

/** Réglages mémorisés dans ce navigateur ; tout ce qui est inconnu ou abîmé retombe sur le défaut. */
export function lirePreferences(themes?: readonly MetaTheme[]): Preferences {
  const defaut: Preferences = { theme: THEME_PAR_DEFAUT, favoris: [], animation: 'cinema' }
  try {
    const brut: unknown = JSON.parse(localStorage.getItem(CLE) ?? 'null')
    if (typeof brut !== 'object' || brut === null) return defaut
    const { theme, favoris, animation } = brut as Record<string, unknown>
    return {
      theme: typeof theme === 'string' && metaTheme(theme, themes) ? theme : defaut.theme,
      favoris: Array.isArray(favoris)
        ? favoris.filter((f): f is string => typeof f === 'string' && !!metaTheme(f, themes))
        : [],
      animation: NIVEAUX.find((n) => n === animation) ?? defaut.animation,
    }
  } catch {
    return defaut
  }
}

export function ecrirePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(preferences))
  } catch {
    // Stockage indisponible (navigation privée…) : le réglage vaut pour cette visite seulement.
  }
}
