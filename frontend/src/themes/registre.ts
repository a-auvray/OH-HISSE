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
      'Feuille crème aux bords repliés, encres d’imprimerie, jour ou sombre. Complet : accueil et quatre espaces.',
    apercu: ['#efe9dd', '#b4471a', '#0067a5', '#2f6e5a', '#6a4c9c'],
    charger: () => import('./papier'),
  },
  {
    id: 'estampe',
    nom: 'Estampe',
    description:
      'Des fils d’encre partent des quatre bords : chaque faisceau dit une donnée par son mouvement. Jour ou sombre.',
    apercu: ['#ece7da', '#9c3d2a', '#1f4e6b', '#4c6b4a', '#5b4a7a'],
    charger: () => import('./estampe'),
  },
]

/** Le thème des nouveaux visiteurs, et celui sur lequel on retombe si le choisi ne se charge pas. */
export const THEME_PAR_DEFAUT = 'papier'
export const THEME_DE_SECOURS = 'classique'

export function metaTheme(id: string, themes: readonly MetaTheme[] = THEMES): MetaTheme | undefined {
  return themes.find((t) => t.id === id)
}
