import type { BlocLu, ObjectifLu, PointEvolution } from '../../../api/types'
import { isoDe, jourDe } from './modele'

/*
 * Des données simulées pour les tests : de vrais objets de l'API, jamais lus par le code de l'appli.
 * Les jours sont des décalages en jours depuis le 1er janvier 2026, pour que les calculs se vérifient à la main.
 */

export const JOUR_ZERO = '2026-01-01'

/** La date ISO située `n` jours après le 1er janvier 2026. */
export function iso(n: number): string {
  return isoDe(jourDe(JOUR_ZERO) + n)
}

export function point(n: number, e1rm: number | null): PointEvolution {
  return {
    seance_id: n,
    date: iso(n),
    e1rm_lest_kg: e1rm,
    e1rm_total_kg: null,
    tonnage_kg: 0,
    series: 3,
    reps: 5,
    rpe_moyen: null,
    poids_du_corps_kg: null,
  }
}

export function objectif(modif: Partial<ObjectifLu> = {}): ObjectifLu {
  return {
    id: 1,
    titre: 'Traction +50 kg',
    type: 'max',
    exercice_id: 1,
    exercice: 'Tractions',
    valeur_cible_kg: 50,
    date_cible: '2027-03-15',
    principal: true,
    statut: 'en_cours',
    jours_restants: 110,
    blocs: [],
    progression: { e1rm_lest_kg: 38.5, le: '2026-11-21', pourcentage: 77, cible_atteinte: false },
    ...modif,
  }
}

export function bloc(modif: Partial<BlocLu> = {}): BlocLu {
  return {
    id: 9,
    nom: 'Force',
    type: 'force',
    cycles: 4,
    seances: [],
    debut: '2026-09-01',
    fin: '2026-10-31',
    objectif_id: 1,
    seances_realisees: 8,
    seances_total: 12,
    actif: false,
    ...modif,
  }
}
