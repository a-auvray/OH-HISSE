import type { MetaVariante } from '../../types'

/* Seul fichier de la variante chargé au démarrage : le code des Drisses de Gabo n'arrive qu'à son premier choix. */
export default {
  id: 'drisses-de-gabo',
  espace: 'objectifs',
  nom: 'Drisses de Gabo',
  description:
    'Chaque objectif est une drisse qu’on hisse vers la tête de mât, l’objectif ouvert porte une sculpture de 96 fils qui se resserre avec sa progression, et le héros est la pente à tenir face à celle qu’on tient.',
  charger: () => import('./index'),
} satisfies MetaVariante<'objectifs'>
