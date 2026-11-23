import type { MetaTheme } from './types'

/**
 * Les thèmes disponibles. Ajouter un thème = un dossier `themes/<id>/` qui
 * exporte un `Theme` par défaut, plus une ligne ici. Le `import()` garde son
 * code hors du paquet de départ.
 */
export const THEMES: readonly MetaTheme[] = [
  {
    id: 'classique',
    nom: 'Classique',
    description: 'Le design d’origine : fond nuit, une couleur par espace.',
    apercu: ['#0b0d10', '#e0782a', '#2f8fe0', '#3fae5e', '#a54ec2'],
    charger: () => import('./classique'),
  },
]

export const THEME_PAR_DEFAUT = 'classique'

export function metaTheme(id: string, themes: readonly MetaTheme[] = THEMES): MetaTheme | undefined {
  return themes.find((t) => t.id === id)
}
