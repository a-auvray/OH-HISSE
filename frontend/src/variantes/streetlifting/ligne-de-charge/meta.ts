import type { MetaVariante } from '../../types'

/** Seul fichier de la variante dans le paquet de départ : le reste se charge au premier choix. */
export default {
  id: 'ligne-de-charge',
  espace: 'streetlifting',
  nom: 'Ligne de charge',
  description:
    'Le bord de la page est une poutre que la série du jour fait ployer, et chaque exercice y pend à la profondeur de son pourcentage d’e1RM.',
  charger: () => import('./index'),
} satisfies MetaVariante<'streetlifting'>
