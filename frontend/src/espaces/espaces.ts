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
}

export const ESPACES: readonly Espace[] = [
  {
    id: 'vie-courante',
    nom: 'Vie courante',
    chemin: '/vie-courante',
    direction: 'haut',
    devise: 'Sommeil, récupération, écarts mérités',
  },
  {
    id: 'streetlifting',
    nom: 'Streetlifting',
    chemin: '/streetlifting',
    direction: 'gauche',
    devise: 'Le carnet qui calcule la séance suivante',
  },
  {
    id: 'marine',
    nom: 'Marine',
    chemin: '/marine',
    direction: 'droite',
    devise: 'Quand y aller, avec quoi, par où nager',
  },
  {
    id: 'objectifs',
    nom: 'Objectifs',
    chemin: '/objectifs',
    direction: 'bas',
    devise: 'Le cap qui structure les blocs',
  },
]

export function espaceParId(id: IdEspace): Espace {
  const espace = ESPACES.find((e) => e.id === id)
  if (!espace) throw new Error(`Espace inconnu : ${id}`)
  return espace
}
