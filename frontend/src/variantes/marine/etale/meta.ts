import type { MetaVariante } from '../../types'

/** Seul fichier de la variante dans le paquet de départ : le reste (index.tsx et ses voisins) se charge au premier choix. */
export default {
  id: 'etale',
  espace: 'marine',
  nom: 'L’Étale',
  description:
    'La plage en coupe : le vrai profil du sable, le niveau d’eau de l’heure choisie, la distance à marcher et un verdict dit à l’étale.',
  charger: () => import('./index'),
} satisfies MetaVariante<'marine'>
