import type { MetaVariante } from '../../types'

/*
 * Seul fichier de la variante qui est dans le paquet de départ : le reste (`index.tsx` et ses
 * voisins) n'est téléchargé qu'au premier choix de la variante.
 */
export default {
  id: 'banc-d-essai',
  espace: 'streetlifting',
  nom: 'Banc d’essai',
  description:
    'Un procès-verbal d’essai de traction : la courbe caractéristique de chaque exercice, sa limite (le 1RM estimé) et les séries du jour en blocs, entre deux mors.',
  charger: () => import('./index'),
} satisfies MetaVariante<'streetlifting'>
