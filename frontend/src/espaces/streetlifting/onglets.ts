/** Onglets de l'espace, communs à tous les thèmes. */
export const ONGLETS = [
  { chemin: '/streetlifting', libelle: 'Séance du jour', fin: true },
  { chemin: '/streetlifting/saisie', libelle: 'Saisie', fin: false },
  { chemin: '/streetlifting/calendrier', libelle: 'Calendrier', fin: false },
  { chemin: '/streetlifting/analyse', libelle: 'Analyse', fin: false },
  { chemin: '/streetlifting/blocs', libelle: 'Blocs', fin: false },
] as const
