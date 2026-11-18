/**
 * Les quatre espaces et leur place autour de l'accueil (note 11 du CDC) :
 * Vie courante en haut, Objectifs en bas, Streetlifting à gauche, Marine à droite.
 */

export type IdEspace = 'streetlifting' | 'marine' | 'vie-courante' | 'objectifs'
export type Direction = 'haut' | 'bas' | 'gauche' | 'droite'

export interface Espace {
  id: IdEspace
  nom: string
  chemin: `/${IdEspace}`
  direction: Direction
  devise: string
  /** Ce que l'espace contiendra (périmètre V1, note 02 du CDC). */
  fonctionnalites: readonly string[]
}

export const ESPACES: readonly Espace[] = [
  {
    id: 'vie-courante',
    nom: 'Vie courante',
    chemin: '/vie-courante',
    direction: 'haut',
    devise: 'Sommeil, récupération, écarts mérités',
    fonctionnalites: [
      'Suivi du sommeil',
      'Pesée hebdomadaire',
      'Jauge de récupération',
      'Verdict cheat meal',
      'Briefings du jour, de la semaine et des blocs',
    ],
  },
  {
    id: 'streetlifting',
    nom: 'Streetlifting',
    chemin: '/streetlifting',
    direction: 'gauche',
    devise: 'Le carnet qui calcule la séance suivante',
    fonctionnalites: [
      'Saisie des séances (reps, lest, RPE, ressenti)',
      'Historique en calendrier',
      '1RM estimé sur poids du corps + lest',
      'Graphiques d’évolution',
      'Blocs force, volume, deload',
      'Séance du jour auto-régulée',
    ],
  },
  {
    id: 'marine',
    nom: 'Marine',
    chemin: '/marine',
    direction: 'droite',
    devise: 'Quand y aller, avec quoi, par où nager',
    fonctionnalites: [
      'Météo marine en direct',
      'Meilleur créneau selon la marée et la lumière',
      'Tenue, durée et direction de nage conseillées',
      'Niveau de danger vert, rouge, noir',
      'Carte animée de la côte',
      'Carnet de sortie : baignade, nage, plongée',
    ],
  },
  {
    id: 'objectifs',
    nom: 'Objectifs',
    chemin: '/objectifs',
    direction: 'bas',
    devise: 'Le cap qui structure les blocs',
    fonctionnalites: [
      'Objectifs : un max, une compétition',
      'Progression vers la cible',
      'Blocs d’entraînement qui y mènent',
    ],
  },
]

export function espaceParId(id: IdEspace): Espace {
  const espace = ESPACES.find((e) => e.id === id)
  if (!espace) throw new Error(`Espace inconnu : ${id}`)
  return espace
}
