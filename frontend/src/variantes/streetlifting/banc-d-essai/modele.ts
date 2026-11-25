/**
 * Le modèle du Banc d'essai : tout ce qui se calcule, sans React ni DOM.
 *
 * La table RPE est celle du backend (`backend/app/moteurs/rpe.py`), qui reste la source de
 * vérité de l'e1RM consigné : ici elle ne sert qu'à dessiner la courbe caractéristique et à
 * dire à quelle intensité chaque série est prévue. Les tests la comparent à des valeurs de la table.
 */
import type { ObjectifLu, PointEvolution, Proposition } from '../../../api/types'
import { depuisIso, lest, nombre } from '../../../commun/format'
import type { Point } from '../../../espaces/streetlifting/chronologie'

// --- La table RPE ---------------------------------------------------------------------------

/** % du 1RM pour un effort équivalent de 1 à 16 (ligne « RPE 10 » de la table de Tuchscherer). */
export const POURCENTAGES: readonly number[] = [
  100, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68, 65.3, 62.6, 59.9, 57.3,
]
export const EFFORT_MAX = POURCENTAGES.length
const REPS_MAX = 12
const RPE_MIN = 6
const RPE_MAX = 10

/** Répétitions + répétitions en réserve (réserve = 10 − RPE) : ce que la table ordonne vraiment. */
export function effortEquivalent(reps: number, rpe: number): number {
  return reps + (10 - rpe)
}

/** Fraction du 1RM (0 à 1) pour un effort équivalent, interpolée entre deux lignes ; null hors de la table. */
export function pourcentageEffort(effort: number): number | null {
  if (!Number.isFinite(effort) || effort < 1 || effort > EFFORT_MAX) return null
  const bas = Math.floor(effort)
  const p0 = POURCENTAGES[bas - 1]
  if (p0 === undefined) return null
  if (effort === bas) return p0 / 100
  const p1 = POURCENTAGES[bas]
  if (p1 === undefined) return null
  return (p0 + (p1 - p0) * (effort - bas)) / 100
}

/** Comme le backend : la série doit être dans la table (1 à 12 reps, RPE de 6 à 10 par demi-points). */
export function pourcentageSerie(reps: number, rpe: number): number | null {
  if (reps < 1 || reps > REPS_MAX || rpe < RPE_MIN || rpe > RPE_MAX || (rpe * 2) % 1 !== 0) return null
  return pourcentageEffort(effortEquivalent(reps, rpe))
}

// --- La référence d'un exercice -------------------------------------------------------------

/** La limite de l'éprouvette : le dernier 1RM estimé d'un exercice, et le poids du corps avec lequel il a été calculé. */
export interface Reference {
  e1rmTotal: number
  e1rmLest: number
  poidsDuCorps: number
  date: string
}

/** Le dernier point d'évolution qui permet d'estimer un 1RM ; null si l'exercice n'a pas encore de série avec RPE. */
export function referenceDepuis(points: readonly PointEvolution[]): Reference | null {
  const ordonnes = [...points].sort((a, b) => a.date.localeCompare(b.date))
  for (let i = ordonnes.length - 1; i >= 0; i--) {
    const p = ordonnes[i]
    if (p && p.e1rm_total_kg !== null && p.e1rm_lest_kg !== null) {
      return {
        e1rmTotal: p.e1rm_total_kg,
        e1rmLest: p.e1rm_lest_kg,
        poidsDuCorps: p.e1rm_total_kg - p.e1rm_lest_kg,
        date: p.date,
      }
    }
  }
  return null
}

/** L'historique du 1RM en lest sur les 12 dernières semaines (par rapport à la dernière séance connue). */
export function historiqueDouzeSemaines(
  points: readonly PointEvolution[],
): { date: string; valeur: number }[] {
  const utiles = points
    .filter((p): p is PointEvolution & { e1rm_lest_kg: number } => p.e1rm_lest_kg !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
  const dernier = utiles.at(-1)
  if (!dernier) return []
  const debut = +depuisIso(dernier.date) - 12 * 7 * 864e5
  return utiles
    .filter((p) => +depuisIso(p.date) >= debut)
    .map((p) => ({ date: p.date, valeur: p.e1rm_lest_kg }))
}

/** L'objectif en cours d'un exercice (le principal d'abord) : la « limite visée ». */
export function objectifDeLExercice(
  objectifs: readonly ObjectifLu[],
  exerciceId: number,
): ObjectifLu | undefined {
  const enCours = objectifs.filter((o) => o.exercice_id === exerciceId && o.statut === 'en_cours')
  return enCours.find((o) => o.principal) ?? enCours[0]
}

// --- Les séries prévues ---------------------------------------------------------------------

/** Une série prévue par l'auto-régulation, avec sa place sur la courbe. */
export interface SeriePrevue {
  indice: number
  reps: number
  rpe: number
  effort: number
  /** Null tant que le lest est « à choisir » ou que le poids du corps manque. */
  chargeTotale: number | null
  /** Fraction du 1RM (0 à 1) : charge totale ÷ 1RM total si on les connaît, sinon celle que la table vise. */
  intensite: number | null
}

export function seriesPrevues(
  p: Proposition,
  poidsDuCorps: number | null,
  e1rmTotal: number | null,
): SeriePrevue[] {
  const chargeTotale = p.lest_kg !== null && poidsDuCorps !== null ? poidsDuCorps + p.lest_kg : null
  const visee = pourcentageSerie(p.reps, p.rpe_cible)
  const intensite = chargeTotale !== null && e1rmTotal ? chargeTotale / e1rmTotal : visee
  return Array.from({ length: Math.max(0, p.series) }, (_, i) => ({
    indice: i + 1,
    reps: p.reps,
    rpe: p.rpe_cible,
    effort: effortEquivalent(p.reps, p.rpe_cible),
    chargeTotale,
    intensite,
  }))
}

/** Un point de la courbe : les séries identiques (même effort, même charge) se superposent. */
export interface PointDeSerie {
  effort: number
  charge: number
  reps: number
  rpe: number
  nombre: number
}

export function regrouperSeries(series: readonly SeriePrevue[]): PointDeSerie[] {
  const groupes = new Map<string, PointDeSerie>()
  for (const s of series) {
    if (s.chargeTotale === null || pourcentageEffort(s.effort) === null) continue
    const cle = `${s.effort}|${s.chargeTotale}`
    const connu = groupes.get(cle)
    if (connu) connu.nombre += 1
    else groupes.set(cle, { effort: s.effort, charge: s.chargeTotale, reps: s.reps, rpe: s.rpe, nombre: 1 })
  }
  return [...groupes.values()].sort((a, b) => b.effort - a.effort)
}

/** L'intensité du jour : la moyenne des intensités des séries prévues qu'on sait situer (0 à 1), ou null. */
export function intensiteDuJour(series: readonly SeriePrevue[]): number | null {
  const valeurs = series.flatMap((s) => (s.intensite === null ? [] : [s.intensite]))
  return valeurs.length === 0 ? null : valeurs.reduce((somme, v) => somme + v, 0) / valeurs.length
}

// --- La typographie sous charge -------------------------------------------------------------

export interface TypoIntensite {
  /** Axe de largeur, de 50 à 150, pour une police qui en a un. */
  largeur: number
  /** Axe de graisse, de 500 à 900. */
  graisse: number
  /** Espacement des lettres, en em : seul effet sur les polices sans axe de largeur. */
  suivi: number
}

/**
 * Le titre encaisse la charge : 70 % d'intensité donne le titre le plus étroit et le plus maigre,
 * 100 % le plus large et le plus gras. La largeur d'une police fixe ne bouge pas : l'espacement
 * des lettres porte alors la même idée.
 */
export function typoIntensite(intensite: number | null): TypoIntensite {
  const t = intensite === null ? 0.5 : Math.min(1, Math.max(0, (intensite - 0.7) / 0.3))
  return { largeur: 50 + 100 * t, graisse: 500 + 400 * t, suivi: 0.01 + 0.07 * t }
}

// --- La courbe caractéristique --------------------------------------------------------------

export interface Marges {
  haut: number
  droite: number
  bas: number
  gauche: number
}

/** Pas « ronds » (1, 2, 5 × 10ⁿ) qui encadrent [min, max] pour environ `cible` graduations. */
export function graduations(min: number, max: number, cible = 5): number[] {
  if (!(max > min)) return [min]
  const brut = (max - min) / cible
  const puissance = 10 ** Math.floor(Math.log10(brut))
  const pas = ([1, 2, 5, 10].map((m) => m * puissance).find((p) => p >= brut) ?? 10 * puissance) || 1
  const debut = Math.ceil(min / pas - 1e-9) * pas
  const n = Math.floor((max - debut) / pas + 1e-9)
  return Array.from({ length: n + 1 }, (_, i) => Number((debut + i * pas).toFixed(6)))
}

export interface EntreeCourbe {
  largeur: number
  hauteur: number
  e1rmTotal: number
  points: readonly { effort: number; charge: number }[]
  /** Charge totale de la limite visée, si un objectif existe. */
  limiteVisee: number | null
}

export interface MiseEnPageCourbe {
  marges: Marges
  zone: { largeur: number; hauteur: number }
  effortMax: number
  domaineCharge: [number, number]
  x: (effort: number) => number
  y: (charge: number) => number
  /** L'effort que désigne une abscisse en pixels, au demi-point près. */
  effortA: (px: number) => number
  graduationsX: number[]
  graduationsY: number[]
  chemin: string
  limite: { x: number; y: number }
}

/** Charge totale d'un effort équivalent sur la courbe d'un exercice. */
export function chargeSurCourbe(e1rmTotal: number, effort: number): number | null {
  const p = pourcentageEffort(effort)
  return p === null ? null : e1rmTotal * p
}

/**
 * La feuille de la courbe : l'abscisse est l'effort équivalent, inversé (12 reps à gauche, 1 à droite)
 * pour que la courbe monte vers sa limite ; l'ordonnée est la charge totale (poids du corps + lest).
 */
export function miseEnPageCourbe(e: EntreeCourbe): MiseEnPageCourbe {
  const marges: Marges = { haut: 30, droite: 30, bas: 56, gauche: 62 }
  const l = Math.max(1, e.largeur - marges.gauche - marges.droite)
  const h = Math.max(1, e.hauteur - marges.haut - marges.bas)

  const effortMax = Math.min(
    EFFORT_MAX,
    Math.max(12, Math.ceil(Math.max(0, ...e.points.map((p) => p.effort)))),
  )
  const bas = chargeSurCourbe(e.e1rmTotal, effortMax) ?? e.e1rmTotal
  const charges = e.points.map((p) => p.charge)
  const min = Math.min(bas, ...charges)
  const max = Math.max(e.e1rmTotal, e.limiteVisee ?? 0, ...charges)
  const marge = (max - min) * 0.08 || 1
  const domaineCharge: [number, number] = [Math.max(0, min - marge), max + marge]

  const x = (effort: number) => marges.gauche + ((effortMax - effort) / (effortMax - 1)) * l
  const y = (charge: number) =>
    marges.haut + (1 - (charge - domaineCharge[0]) / (domaineCharge[1] - domaineCharge[0])) * h
  const effortA = (px: number) => {
    const brut = effortMax - ((px - marges.gauche) / l) * (effortMax - 1)
    return Math.min(effortMax, Math.max(1, Math.round(brut * 2) / 2))
  }

  const pas = l >= 360 ? 2 : 4
  const graduationsX: number[] = []
  for (let effort = effortMax; effort >= 2; effort -= pas) graduationsX.push(effort)
  graduationsX.push(1)

  const segments: string[] = []
  for (let effort = effortMax; effort >= 1; effort -= 0.5) {
    const charge = chargeSurCourbe(e.e1rmTotal, effort)
    if (charge !== null)
      segments.push(`${segments.length === 0 ? 'M' : 'L'}${x(effort).toFixed(1)},${y(charge).toFixed(1)}`)
  }

  return {
    marges,
    zone: { largeur: l, hauteur: h },
    effortMax,
    domaineCharge,
    x,
    y,
    effortA,
    graduationsX,
    graduationsY: graduations(domaineCharge[0], domaineCharge[1]),
    chemin: segments.join(' '),
    limite: { x: x(1), y: y(e.e1rmTotal) },
  }
}

// --- Les séries dans le temps (Analyse) -----------------------------------------------------

export interface EntreeSerie {
  largeur: number
  hauteur: number
  points: readonly Point[]
  /** Des barres (tonnage) plutôt qu'un trait. */
  barres: boolean
}

export interface ElementDeSerie {
  point: Point
  x: number
  y: number
}

export interface MiseEnPageSerie {
  marges: Marges
  zone: { largeur: number; hauteur: number }
  domaine: [number, number]
  graduationsY: number[]
  y: (valeur: number) => number
  elements: ElementDeSerie[]
  largeurBarre: number
  /** Quelques repères de date, jamais plus de six. */
  reperesX: { x: number; date: string }[]
}

export function miseEnPageSerie(e: EntreeSerie): MiseEnPageSerie {
  const marges: Marges = { haut: e.barres ? 36 : 26, droite: 26, bas: 42, gauche: 58 }
  const l = Math.max(1, e.largeur - marges.gauche - marges.droite)
  const h = Math.max(1, e.hauteur - marges.haut - marges.bas)
  const valeurs = e.points.map((p) => p.valeur)
  const min = Math.min(...valeurs)
  const max = Math.max(...valeurs)

  let domaine: [number, number]
  if (e.barres) domaine = [0, max > 0 ? max * 1.05 : 1]
  else {
    const marge = (max - min) * 0.15 || Math.max(1, max * 0.1)
    domaine = [Math.max(0, min - marge), max + marge]
  }
  const y = (valeur: number) => marges.haut + (1 - (valeur - domaine[0]) / (domaine[1] - domaine[0])) * h

  const n = e.points.length
  const temps = e.points.map((p) => +depuisIso(p.date))
  const t0 = temps[0] ?? 0
  const ecart = (temps.at(-1) ?? 0) - t0
  const pasBarre = l / Math.max(1, n)
  const elements = e.points.map((point, i) => ({
    point,
    x: e.barres
      ? marges.gauche + (i + 0.5) * pasBarre
      : marges.gauche + (n > 1 && ecart > 0 ? (((temps[i] ?? 0) - t0) / ecart) * l : l / 2),
    y: y(point.valeur),
  }))

  const saut = Math.max(1, Math.ceil(n / 6))
  const reperesX = elements.flatMap((el, i) => (i % saut === 0 ? [{ x: el.x, date: el.point.date }] : []))

  return {
    marges,
    zone: { largeur: l, hauteur: h },
    domaine,
    graduationsY: graduations(domaine[0], domaine[1], 4),
    y,
    elements,
    largeurBarre: e.barres ? Math.min(48, pasBarre * 0.7) : 0,
    reperesX,
  }
}

/** L'élément le plus proche d'une abscisse en pixels (le repère « s'aimante » aux mesures). */
export function indexLePlusProche(elements: readonly ElementDeSerie[], px: number): number {
  let meilleur = 0
  elements.forEach((el, i) => {
    if (Math.abs(el.x - px) < Math.abs((elements[meilleur]?.x ?? Infinity) - px)) meilleur = i
  })
  return meilleur
}

// --- Les phrases, toujours calculées à partir des données -----------------------------------

/** « Reste 8,5 kg avant la limite visée de +50 kg. » ou le dépassement. */
export function phraseLimiteVisee(e1rmLest: number, cibleLest: number): string {
  const reste = cibleLest - e1rmLest
  return reste > 0
    ? `Reste ${nombre(Math.round(reste * 10) / 10)} kg avant la limite visée de ${lest(cibleLest)}.`
    : `Limite visée de ${lest(cibleLest)} dépassée de ${nombre(Math.round(-reste * 10) / 10)} kg.`
}

/** La lecture d'un point de la courbe, au survol ou au clavier : « 5 reps éq. · 106,7 kg · 3 @ RPE 8 ». */
export function lectureCourbe(effort: number, charge: number, serie: PointDeSerie | undefined): string {
  const base = `${nombre(effort)} reps éq. · ${nombre(Math.round(charge * 10) / 10)} kg`
  return serie
    ? `${base} · ${serie.reps} @ RPE ${nombre(serie.rpe)}${serie.nombre > 1 ? ` (×${serie.nombre})` : ''}`
    : base
}

/** Date de procès-verbal : 2026-11-25 → « 25.11.2026 ». */
export function dateDePV(iso: string): string {
  const [annee, mois, jour] = iso.split('-')
  return `${jour}.${mois}.${annee}`
}
