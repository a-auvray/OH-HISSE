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
  {
    id: 'papier',
    nom: 'Papier',
    description:
      'Feuille crème aux bords repliés, encres d’imprimerie, un ton soir. Accueil seulement pour l’instant.',
    apercu: ['#efe9dd', '#b4471a', '#0067a5', '#2f6e5a', '#6a4c9c'],
    charger: () => import('./papier'),
  },
]

export const THEME_PAR_DEFAUT = 'classique'

export function metaTheme(id: string, themes: readonly MetaTheme[] = THEMES): MetaTheme | undefined {
  return themes.find((t) => t.id === id)
}
