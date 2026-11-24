import type { EtatDuJour } from '../../../api/types'

/*
 * Le modèle de la feuille : tout ce qui se calcule à partir des verdicts du jour, sans DOM.
 * Chaque chiffre dessiné ou écrit sort d'ici, jamais d'une valeur posée à la main.
 */

/** Au-delà de cette récupération restante, la séance est allégée (alerte du moteur de récupération). */
export const SEUIL_ALLEGEMENT_H = 24
/** Points d'écart nécessaires pour le feu vert (« t'as le droit ») et pour un petit écart. */
export const SEUIL_ECART = 3
export const SEUIL_PETIT_ECART = 2
/** En dessous, la nuit est dite courte. */
export const SEUIL_NUIT_COURTE_H = 6

/** Comment le rose du soir s'imprime : aplat plein, trame, ou absent (un simple cadre vide). */
export type Impression = 'aplat' | 'trame' | 'vide'

export function impressionDuVerdict(verdict: EtatDuJour['cheat_meal']['verdict']): Impression {
  return verdict === 'oui' ? 'aplat' : verdict === 'petit' ? 'trame' : 'vide'
}

const VERDICTS = {
  oui: 'Ce soir, t’as le droit.',
  petit: 'Un petit écart, oui.',
  non: 'Pas cette fois.',
} as const

/** Le libellé exact du verdict, toujours écrit en toutes lettres. */
export function libelleVerdict(verdict: EtatDuJour['cheat_meal']['verdict']): string {
  return VERDICTS[verdict]
}

export interface Une {
  titre: string
  surTitre: string
  impression: Impression
  /** La récupération passe devant : le verdict descend alors dans sa rubrique. */
  allegee: boolean
}

const surTitreEcart = (points: string) => `ÉCART · ${points} · SEUIL ${SEUIL_ECART}`.toUpperCase()

/**
 * Le moteur de priorité de la une : une récupération qui impose d'alléger passe avant tout ;
 * sinon c'est le verdict d'écart, avec le rose qu'il mérite. Une fois l'écart pris, la une le dit
 * et le rose sèche en trame.
 */
export function choisirUne(etat: EtatDuJour, pris: boolean): Une {
  const { cheat_meal: v, recuperation: r } = etat
  const points = `${v.points} pt${Math.abs(v.points) > 1 ? 's' : ''}`
  if (pris)
    return {
      titre: 'Écart pris.',
      surTitre: surTitreEcart(points),
      impression: v.verdict === 'non' ? 'vide' : 'trame',
      allegee: false,
    }
  if (!r.recupere && r.restant_h > SEUIL_ALLEGEMENT_H)
    return {
      titre: 'Séance allégée aujourd’hui.',
      surTitre: `RÉCUPÉRATION · ENCORE ${Math.round(r.restant_h)} H`,
      impression: 'vide',
      allegee: true,
    }
  return {
    titre: VERDICTS[v.verdict],
    surTitre: surTitreEcart(points),
    impression: impressionDuVerdict(v.verdict),
    allegee: false,
  }
}

/** 8,667 → « 8 h 40 » ; moins d'une heure → « 40 min » ; zéro → « 0 min ». */
export function dureeEnClair(heures: number): string {
  const minutes = Math.max(0, Math.round(heures * 60))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return `${h} h ${String(m).padStart(2, '0')}`
}

export interface Colonne {
  /** 0 à 100, tiré de la même formule que le temps restant. */
  pourcentage: number
  /** 0 à 1 : plus on est en dette de récupération, plus c'est haut. */
  dette: number
  /** Période de la respiration de la trame, en secondes : 12 s reposé, 6 s en dette. */
  periodeS: number
  /** Fraction de la colonne (depuis le bas) où le temps restant tombe à 24 h ; null si inconnue. */
  seuil: number | null
}

/** En dessous de cette récupération, le corps est en dette et la trame respire plus vite. */
const RECUPERE_BIEN = 0.82

export function colonneRecuperation(r: EtatDuJour['recuperation']): Colonne {
  const progression = Math.min(1, Math.max(0, r.progression))
  const dette =
    r.recupere || progression >= RECUPERE_BIEN
      ? 0
      : Math.min(1, Math.max(0, r.restant_h / SEUIL_ALLEGEMENT_H))
  // Le budget de récupération (total_h) est la hauteur de la colonne : le seuil des 24 h restantes y est fixe.
  const seuil = !r.recupere && r.total_h > SEUIL_ALLEGEMENT_H ? 1 - SEUIL_ALLEGEMENT_H / r.total_h : null
  return {
    pourcentage: Math.round(progression * 100),
    dette,
    periodeS: 12 - 6 * dette,
    seuil,
  }
}

export interface CaseEcart {
  libelle: string
  /** La case est remplie de rose (aplat ou trame selon le verdict). */
  remplie: boolean
  /** La case où l'on en est. */
  courante: boolean
  /** Un repère sous la case : le seuil du petit écart ou celui du feu vert. */
  repere: string | null
}

/**
 * La réglette « écart mérité ? » : cinq cases (≤ 0, 1, 2, 3, 4 et plus). Les cases atteintes se
 * remplissent à partir de 2 points ; en dessous, aucune : le rose n'a pas encore lieu d'être.
 */
export function reglette(points: number): readonly CaseEcart[] {
  const courant = Math.min(4, Math.max(0, points))
  return ['≤ 0', '1', '2', '3', '4 +'].map((libelle, i) => ({
    libelle,
    remplie: points >= SEUIL_PETIT_ECART && i >= 1 && i <= courant,
    courante: i === courant,
    repere: i === SEUIL_PETIT_ECART ? 'petit écart' : i === SEUIL_ECART ? 'feu vert' : null,
  }))
}

export interface BarreNuit {
  /** Fractions de l'échelle (0 à 10 h), de 0 à 1. */
  longueur: number
  moyenne: number | null
  courte: boolean
}

export const ECHELLE_NUIT_H = 10

export function barreNuit(
  derniere: number | null | undefined,
  moyenne: number | null | undefined,
): BarreNuit | null {
  if (derniere === null || derniere === undefined) return null
  const fraction = (h: number) => Math.min(1, Math.max(0, h / ECHELLE_NUIT_H))
  return {
    longueur: fraction(derniere),
    moyenne: moyenne === null || moyenne === undefined ? null : fraction(moyenne),
    courte: derniere < SEUIL_NUIT_COURTE_H,
  }
}

/** Le rayon d'un point de trame pour couvrir `densite` (0 à 1) de la cellule ; deux points se touchent à 0,78. */
export function rayonDeTrame(cellule: number, densite: number): number {
  const d = Math.min(0.78, Math.max(0, densite))
  return cellule * Math.sqrt(d / Math.PI)
}

/** La cellule d'une trame, arrondie aux pixels physiques pour éviter le moiré : round(6 × DPR) / DPR. */
export function celluleDeTrame(ratio: number): number {
  const dpr = Number.isFinite(ratio) && ratio > 0 ? ratio : 1
  return Math.round(6 * dpr) / dpr
}

/** La cellule de la trame pour l'écran courant. */
export function celluleDeLEcran(): number {
  return celluleDeTrame(typeof window === 'undefined' ? 1 : window.devicePixelRatio)
}

/** Le jour de l'année (1 à 366), heure de Paris. Le numéro du tirage est le rang du jour. */
export function jourDeLAnnee(date: Date): number {
  const parties = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })
    .format(date)
    .split('-')
    .map(Number)
  const [annee = 1970, mois = 1, jour = 1] = parties
  const debut = Date.UTC(annee, 0, 1)
  return Math.round((Date.UTC(annee, mois - 1, jour) - debut) / 86_400_000) + 1
}

/** La légende, toujours visible au pied de la tranche : le rang du jour et ce que dit sa ligne. */
export function legendeDeLaPile(jour: number, impression: Impression, pris: boolean): string {
  const base = `Jour ${jour} de l’année`
  if (pris) return `${base} · écart pris`
  if (impression === 'aplat') return `${base} · écart mérité`
  if (impression === 'trame') return `${base} · petit écart`
  return base
}
