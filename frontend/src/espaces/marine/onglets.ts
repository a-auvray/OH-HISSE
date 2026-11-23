/** Onglets de l'espace, communs à tous les thèmes. */
export const ONGLETS = [
  { chemin: '/marine', libelle: 'Conditions', fin: true },
  { chemin: '/marine/assistant', libelle: 'Assistant', fin: false },
  { chemin: '/marine/carte', libelle: 'Carte', fin: false },
  { chemin: '/marine/carnet', libelle: 'Carnet', fin: false },
] as const
