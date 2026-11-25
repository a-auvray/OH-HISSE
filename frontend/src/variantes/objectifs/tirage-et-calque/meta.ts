import type { MetaVariante } from '../../types'

/** Léger : seul ce fichier est dans le paquet de départ, le dessin n'arrive qu'au premier choix. */
export default {
  id: 'tirage-et-calque',
  espace: 'objectifs',
  nom: 'Tirage et Calque',
  description:
    'Chaque objectif est une planche : le réalisé en assises hachurées de 2,5 kg, le plan sur un calque qui se cale sur ton e1RM actuel.',
  charger: () => import('./index'),
} satisfies MetaVariante<'objectifs'>
