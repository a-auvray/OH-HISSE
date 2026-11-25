import type { MetaVariante } from '../../types'

export default {
  id: 'tirage-du-jour',
  espace: 'vie-courante',
  nom: 'Le Tirage du jour',
  description:
    'Une seule feuille éclairée par le vrai soleil de Ouistreham : la récupération en grand, et le rose du soir seulement si l’écart est mérité.',
  charger: () => import('./index'),
} satisfies MetaVariante<'vie-courante'>
