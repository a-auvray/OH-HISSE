/**
 * Logique du formulaire de séance, sans React : passage depuis la séance du
 * jour ou une séance enregistrée, et vers ce que l'API attend.
 */
import type { SeanceDuJour, SeanceEcrite, SeanceLue } from '../../api/types'
import { aujourdhui } from '../../commun/format'

export interface Prevu {
  reps: number
  lest: number | null
  rpe: number
}

export interface LigneSerie {
  cle: string
  reps: string
  lest: string
  rpe: string // '' = non renseigné
  echec: boolean
  prevu: Prevu | null
}

export interface Groupe {
  cle: string
  exercice_id: number
  series: LigneSerie[]
}

export interface Formulaire {
  date: string
  nom: string
  ressenti: number | null
  note: string
  bloc_id: number | null
  rang_modele: number | null
  groupes: Groupe[]
}

export const RPE_POSSIBLES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

let compteur = 0
export const nouvelleCle = () => `c${++compteur}`

export function ligneVide(depuis?: LigneSerie): LigneSerie {
  return {
    cle: nouvelleCle(),
    reps: depuis?.reps ?? '',
    lest: depuis?.lest ?? '0',
    rpe: '',
    echec: false,
    prevu: depuis?.prevu ?? null,
  }
}

export function formulaireVierge(exerciceId: number): Formulaire {
  return {
    date: aujourdhui(),
    nom: '',
    ressenti: null,
    note: '',
    bloc_id: null,
    rang_modele: null,
    groupes: [{ cle: nouvelleCle(), exercice_id: exerciceId, series: [ligneVide()] }],
  }
}

/** Pré-remplit avec la séance proposée : le prévu reste affiché à côté du réalisé. */
export function depuisSeanceDuJour(seance: SeanceDuJour): Formulaire {
  return {
    date: aujourdhui(),
    nom: seance.nom ?? '',
    ressenti: null,
    note: '',
    bloc_id: seance.bloc?.id ?? null,
    rang_modele: seance.bloc?.rang_modele ?? null,
    groupes: seance.propositions.map((p) => {
      const prevu: Prevu = { reps: p.reps, lest: p.lest_kg ?? null, rpe: p.rpe_cible }
      return {
        cle: nouvelleCle(),
        exercice_id: p.exercice_id,
        series: Array.from({ length: p.series }, () => ({
          cle: nouvelleCle(),
          reps: String(p.reps),
          lest: p.lest_kg === null || p.lest_kg === undefined ? '' : String(p.lest_kg),
          rpe: '',
          echec: false,
          prevu,
        })),
      }
    }),
  }
}

/** Séance enregistrée → formulaire ; les séries consécutives d'un même exercice sont regroupées. */
export function depuisSeance(seance: SeanceLue): Formulaire {
  const groupes: Groupe[] = []
  for (const s of seance.series) {
    const dernier = groupes.at(-1)
    const ligne: LigneSerie = {
      cle: nouvelleCle(),
      reps: String(s.reps),
      lest: String(s.lest_kg ?? 0),
      rpe: s.rpe === null || s.rpe === undefined ? '' : String(s.rpe),
      echec: s.echec ?? false,
      prevu:
        s.reps_prevues !== null && s.reps_prevues !== undefined
          ? { reps: s.reps_prevues, lest: s.lest_prevu_kg ?? null, rpe: s.rpe_cible ?? 0 }
          : null,
    }
    if (dernier && dernier.exercice_id === s.exercice_id) dernier.series.push(ligne)
    else groupes.push({ cle: nouvelleCle(), exercice_id: s.exercice_id, series: [ligne] })
  }
  return {
    date: seance.date,
    nom: seance.nom ?? '',
    ressenti: seance.ressenti ?? null,
    note: seance.note ?? '',
    bloc_id: seance.bloc_id ?? null,
    rang_modele: seance.rang_modele ?? null,
    groupes,
  }
}

const decimal = (texte: string) => Number(texte.replace(',', '.'))

/** Formulaire → corps de la requête. Renvoie la liste des problèmes s'il n'est pas complet. */
export function versEcriture(formulaire: Formulaire): SeanceEcrite | string[] {
  const problemes: string[] = []
  const series: SeanceEcrite['series'] = []
  formulaire.groupes.forEach((groupe, g) => {
    groupe.series.forEach((ligne, i) => {
      const position = `Exercice ${g + 1}, série ${i + 1}`
      const reps = Number(ligne.reps)
      const lest = ligne.lest.trim() === '' ? 0 : decimal(ligne.lest)
      if (ligne.reps.trim() === '' || !Number.isInteger(reps) || reps < 0) {
        problemes.push(`${position} : nombre de répétitions manquant.`)
      }
      if (Number.isNaN(lest) || lest < 0) problemes.push(`${position} : lest invalide.`)
      series.push({
        exercice_id: groupe.exercice_id,
        reps,
        lest_kg: lest,
        rpe: ligne.rpe === '' ? null : Number(ligne.rpe),
        echec: ligne.echec,
        reps_prevues: ligne.prevu?.reps ?? null,
        lest_prevu_kg: ligne.prevu?.lest ?? null,
        rpe_cible: ligne.prevu?.rpe || null,
      })
    })
  })
  if (series.length === 0) problemes.push('Ajoute au moins une série.')
  if (problemes.length) return problemes
  return {
    date: formulaire.date,
    nom: formulaire.nom.trim() || null,
    ressenti: formulaire.ressenti,
    note: formulaire.note.trim() || null,
    bloc_id: formulaire.bloc_id,
    rang_modele: formulaire.rang_modele,
    series,
  }
}
