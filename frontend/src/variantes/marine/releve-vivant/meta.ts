import type { MetaVariante } from '../../types'

/** Léger à dessein : seul ce fichier est dans le paquet de départ, le reste se charge au premier choix. */
export default {
  id: 'releve-vivant',
  espace: 'marine',
  nom: 'Le Relevé Vivant',
  description:
    'Conditions en feuille de levé : le verdict d’abord, la courbe de marée qu’on fait glisser, et la plage en coupe où l’eau monte et recule.',
  charger: () => import('./index'),
} satisfies MetaVariante<'marine'>
