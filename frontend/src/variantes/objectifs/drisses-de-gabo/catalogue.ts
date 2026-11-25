export type Onglet = 'en-cours' | 'atteints' | 'detendus'

/** Les trois statuts, dans l'ordre du rail ; la touche est celle qui y mène d'où l'on est. */
export const ONGLETS: readonly { id: Onglet; nom: string; touche: string }[] = [
  { id: 'en-cours', nom: 'En cours', touche: '1' },
  { id: 'atteints', nom: 'Atteints', touche: '2' },
  { id: 'detendus', nom: 'Détendus', touche: '3' },
]

/** L'identifiant du panneau que pilotent les onglets (un seul, dont le contenu change). */
export const PANNEAU = 'drisses-panneau'
