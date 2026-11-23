/** Onglets de l'espace, communs à tous les thèmes. */
export const ONGLETS = [
  { chemin: '/vie-courante', libelle: 'Aujourd’hui', fin: true },
  { chemin: '/vie-courante/sommeil', libelle: 'Sommeil', fin: false },
  { chemin: '/vie-courante/briefings', libelle: 'Briefings', fin: false },
] as const
