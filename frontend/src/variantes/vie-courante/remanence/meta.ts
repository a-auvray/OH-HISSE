import type { MetaVariante } from '../../types'

/** Seule partie de la variante dans le paquet de départ : le code (index.tsx et voisins) vient au premier choix. */
export default {
  id: 'remanence',
  espace: 'vie-courante',
  nom: 'Rémanence',
  description:
    'Un mur de nuit où chaque nuit laisse une empreinte de lumière, la récupération en colonne qui respire et le cheat meal en braise sur le rebord.',
  charger: () => import('./index'),
} satisfies MetaVariante<'vie-courante'>
