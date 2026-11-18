/** Logique du calendrier et de l'analyse (le temps qui passe), sans React. */
import type { BlocLu, PointEvolution } from '../../api/types'
import { depuisIso, isoLocal } from '../../commun/format'

export const TYPES_BLOC = {
  force: 'Force',
  volume: 'Volume',
  deload: 'Deload',
  specifique: 'Spécifique',
} as const

/** Semaines (du lundi au dimanche) qui couvrent le mois `mois` (0 = janvier). */
export function grilleDuMois(annee: number, mois: number): string[][] {
  const premier = new Date(annee, mois, 1, 12)
  const decalage = (premier.getDay() + 6) % 7 // lundi = 0
  const debut = new Date(annee, mois, 1 - decalage, 12)
  const semaines: string[][] = []
  const jour = new Date(debut)
  do {
    const semaine: string[] = []
    for (let i = 0; i < 7; i++) {
      semaine.push(isoLocal(jour))
      jour.setDate(jour.getDate() + 1)
    }
    semaines.push(semaine)
  } while (jour.getMonth() === mois)
  return semaines
}

/** Ce dont le calendrier a besoin d'un bloc. */
export type PeriodeBloc = Pick<BlocLu, 'id' | 'nom' | 'type' | 'debut' | 'fin' | 'actif'>

/** Le bloc qui couvre ce jour (le plus récent l'emporte en cas de chevauchement). */
export function blocDuJour<B extends PeriodeBloc>(
  blocs: B[],
  iso: string,
  aujourdhui: string,
): B | undefined {
  return blocs
    .filter((b) => {
      const fin = b.fin ?? (b.actif ? aujourdhui : null)
      return b.debut <= iso && (fin === null || iso <= fin)
    })
    .sort((a, b) => b.debut.localeCompare(a.debut))[0]
}

export type Periode = 'seance' | 'semaine' | 'mois'
export type Metrique = 'e1rm_lest_kg' | 'tonnage_kg' | 'series' | 'reps' | 'rpe_moyen'

export interface Point {
  /** Date représentative (séance, lundi de la semaine, 1er du mois). */
  date: string
  valeur: number
  seances: number
}

function cle(iso: string, periode: Periode): string {
  if (periode === 'seance') return iso
  if (periode === 'mois') return `${iso.slice(0, 7)}-01`
  const d = depuisIso(iso)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return isoLocal(d)
}

/**
 * Regroupe les points d'évolution par période. Le 1RM garde le meilleur de
 * la période, le RPE sa moyenne, le reste s'additionne.
 */
export function agreger(points: PointEvolution[], metrique: Metrique, periode: Periode): Point[] {
  const groupes = new Map<string, number[]>()
  for (const p of points) {
    const v = p[metrique]
    if (v === null || v === undefined) continue
    const k = cle(p.date, periode)
    groupes.set(k, [...(groupes.get(k) ?? []), v])
  }
  return [...groupes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, valeurs]) => {
      let valeur: number
      if (metrique === 'e1rm_lest_kg') valeur = Math.max(...valeurs)
      else if (metrique === 'rpe_moyen') valeur = valeurs.reduce((s, v) => s + v, 0) / valeurs.length
      else valeur = valeurs.reduce((s, v) => s + v, 0)
      return { date, valeur: Math.round(valeur * 10) / 10, seances: valeurs.length }
    })
}
