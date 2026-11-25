import type { ObjectifLu, PointEvolution } from '../../../api/types'
import { dateCourte, depuisIso, nombre } from '../../../commun/format'
import { echeance } from '../../../espaces/objectifs/useObjectifs'

/*
 * Le modèle des Drisses de Gabo : tout ce qui se calcule, sans DOM ni canvas.
 * L'axe d'une drisse va de 0 kg de lest (la base, le poids du corps seul) à la cible (la tête de mât) :
 * c'est exactement ce que mesure `progression.pourcentage` côté API (1RM estimé / cible), la position
 * de la pince ne peut donc pas contredire le pourcentage affiché.
 */

export const NOMBRE_DE_FILS = 96
/** Fenêtre de la régression : les e1RM des quatre dernières semaines. */
export const FENETRE_JOURS = 28
/** Sous ce nombre de séances dans la fenêtre, la pente est instable : on dit qu'on ne sait pas. */
export const SEANCES_MINIMUM = 3
/** Torsion d'une selle au tout début d'un objectif : 90°, jamais plus (jamais un hyperboloïde vrillé). */
export const TORSION_MAX = Math.PI / 2

export const borner = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))
const melanger = (a: number, b: number, t: number) => a + (b - a) * t

/* ---------- Formats ---------- */

const NOMBRE_1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

/** « +0,52 », « −3,1 » : le signe est toujours écrit, et le moins est un vrai signe moins. */
export function signe(valeur: number, decimales: 1 | 2 = 2): string {
  const texte = decimales === 1 ? NOMBRE_1.format(Math.abs(valeur)) : nombre(Math.abs(valeur))
  return `${valeur < 0 ? '−' : '+'}${texte}`
}

/** 115 jours → « 16 semaines ». */
export function semaines(jours: number): string {
  const s = Math.max(1, Math.round(Math.abs(jours) / 7))
  return `${s} semaine${s > 1 ? 's' : ''}`
}

/* ---------- Progression et rythme ---------- */

/** La part du chemin déjà hissée, de 0 à 1 (celle de l'API). */
export function avancement(o: ObjectifLu): number {
  return borner((o.progression?.pourcentage ?? 0) / 100)
}

/** Les points d'évolution qui portent un e1RM de lest, triés par date. */
function e1rmParDate(points: readonly PointEvolution[]) {
  return points
    .flatMap((p) => (p.e1rm_lest_kg === null ? [] : [{ jour: p.date, e1rm: p.e1rm_lest_kg }]))
    .sort((a, b) => a.jour.localeCompare(b.jour))
}

const joursEntre = (de: string, a: string) =>
  Math.round((depuisIso(a).getTime() - depuisIso(de).getTime()) / 86_400_000)

/**
 * La pente réelle en kg par semaine : régression linéaire des e1RM des quatre dernières semaines.
 * `null` s'il y a moins de trois séances dans la fenêtre, ou si elles tombent toutes le même jour.
 */
export function penteReelle(points: readonly PointEvolution[], aujourdhui: string): number | null {
  const fenetre = e1rmParDate(points).filter((p) => {
    const age = joursEntre(p.jour, aujourdhui)
    return age >= 0 && age < FENETRE_JOURS
  })
  if (fenetre.length < SEANCES_MINIMUM) return null
  const x = fenetre.map((p) => joursEntre(fenetre[0]!.jour, p.jour) / 7)
  const y = fenetre.map((p) => p.e1rm)
  const n = x.length
  const mx = x.reduce((s, v) => s + v, 0) / n
  const my = y.reduce((s, v) => s + v, 0) / n
  const variance = x.reduce((s, v) => s + (v - mx) ** 2, 0)
  if (variance === 0) return null
  const covariance = x.reduce((s, v, i) => s + (v - mx) * (y[i]! - my), 0)
  return covariance / variance
}

export type Statut = 'tension' | 'retard' | 'verrouille' | 'detendu'

export interface Rythme {
  /** Semaines jusqu'à l'échéance (0 une fois passée). */
  semainesRestantes: number
  /** Pente à tenir pour arriver pile à la cible ; `null` si la cible est déjà atteinte, l'échéance passée ou le 1RM inconnu. */
  necessaire: number | null
  /** Pente réellement tenue sur quatre semaines ; `null` si les données manquent. */
  reel: number | null
  /** Où l'on arrive à l'échéance en gardant ce rythme. */
  projection: number | null
  /** Projection moins cible : négatif, on arrive sous la cible. */
  ecart: number | null
}

export function calculerRythme(o: ObjectifLu, points: readonly PointEvolution[], aujourdhui: string): Rythme {
  const actuel = o.progression?.e1rm_lest_kg ?? null
  const semainesRestantes = Math.max(0, o.jours_restants) / 7
  const reel = penteReelle(points, aujourdhui)
  const necessaire =
    actuel === null || o.jours_restants <= 0
      ? null
      : Math.max(0, (o.valeur_cible_kg - actuel) / semainesRestantes)
  const projection = actuel === null || reel === null ? null : actuel + reel * semainesRestantes
  return {
    semainesRestantes,
    necessaire,
    reel,
    projection,
    ecart: projection === null ? null : projection - o.valeur_cible_kg,
  }
}

/**
 * Le statut en un mot. Un objectif en cours dont la pente est inconnue n'en reçoit pas : on écrit
 * « pente : données insuffisantes » plutôt que d'en deviner un. Cible déjà atteinte : pas de statut non plus,
 * c'est à Antoine de le marquer atteint.
 */
export function statut(o: ObjectifLu, rythme: Rythme | null): Statut | null {
  if (o.statut === 'atteint') return 'verrouille'
  if (o.statut === 'abandonne') return 'detendu'
  if (o.progression?.cible_atteinte) return null
  if (o.jours_restants < 0) return 'retard'
  if (!rythme || rythme.ecart === null) return null
  return rythme.ecart >= 0 ? 'tension' : 'retard'
}

export const MOTS_STATUT: Readonly<Record<Statut, string>> = {
  tension: 'En tension',
  retard: 'En retard',
  verrouille: 'Verrouillé',
  detendu: 'Détendu',
}

/** La phrase de la pente : « il faut +0,52 kg/sem, tu fais +0,33 kg/sem », ou pourquoi on ne la sait pas. */
export function phrasePente(o: ObjectifLu, rythme: Rythme | null, chargement = false): string {
  if (o.statut !== 'en_cours') return ''
  if (o.progression?.cible_atteinte) return 'Cible atteinte : tu peux marquer l’objectif atteint.'
  if (o.jours_restants <= 0)
    return o.jours_restants === 0 ? 'L’échéance, c’est aujourd’hui.' : 'L’échéance est passée.'
  if (chargement) return 'pente : calcul en cours'
  if (!rythme || rythme.reel === null || rythme.necessaire === null) return 'pente : données insuffisantes'
  return `il faut ${signe(rythme.necessaire)} kg/sem, tu fais ${signe(rythme.reel)} kg/sem`
}

/** « −3,1 kg au 15 mars au rythme actuel » ; vide si la projection est inconnue. */
export function phraseEcart(o: ObjectifLu, rythme: Rythme | null): string {
  if (!rythme || rythme.ecart === null || o.statut !== 'en_cours') return ''
  const date = dateCourte(o.date_cible)
  return rythme.ecart >= 0
    ? `${signe(rythme.ecart, 1)} kg d’avance au ${date} au rythme actuel`
    : `${signe(rythme.ecart, 1)} kg au ${date} au rythme actuel`
}

/** Ce que lit un lecteur d'écran sur une drisse : tout y est en clair, la forme n'est jamais seule. */
export function texteDrisse(o: ObjectifLu, rythme: Rythme | null, chargement = false): string {
  const parties = [
    o.progression ? `${Math.round(avancement(o) * 100)} %` : 'pas encore estimé',
    o.progression
      ? `${signe(o.progression.e1rm_lest_kg, 1)} / ${nombre(o.valeur_cible_kg)} kg`
      : `cible ${nombre(o.valeur_cible_kg)} kg`,
  ]
  if (o.statut === 'en_cours') parties.push(echeance(o.jours_restants))
  const mot = statut(o, rythme)
  if (mot) parties.push(MOTS_STATUT[mot])
  const pente = phrasePente(o, rythme, chargement)
  if (pente) parties.push(pente)
  return parties.join(' · ')
}

/* ---------- Une drisse : la pince, le mât, le pincement ---------- */

/** Hauteur de la pince en pourcentage depuis le HAUT de la zone (0 = tête de mât, 100 = base). */
export function hautDePince(o: ObjectifLu): number {
  if (o.statut === 'abandonne' || !o.progression) return 100
  if (o.statut === 'atteint') return 0
  return 100 - avancement(o) * 100
}

/** Hauteur du repère de projection, même repère ; peut passer au-dessus de la tête (valeur négative, bornée). */
export function hautDeProjection(o: ObjectifLu, rythme: Rythme | null): number | null {
  if (!rythme || rythme.projection === null || o.valeur_cible_kg <= 0 || o.statut !== 'en_cours') return null
  return borner(100 - (rythme.projection / o.valeur_cible_kg) * 100, -10, 100)
}

/** Le déplacement latéral (en px) d'un point de la partie hissée : une onde stationnaire, extrémités fixes. */
export function deplacement(amplitude: number, u: number): number {
  return amplitude * Math.sin(Math.PI * borner(u))
}

/**
 * La partie hissée d'une drisse, de la base (y = 100) à la pince : un seul tracé pour le repos
 * (amplitude nulle, une droite) et le pincement. `x` est le milieu du fil.
 */
export function trajetHisse(haut: number, amplitude: number, x = 24, segments = 24): string {
  if (haut >= 100) return ''
  if (amplitude === 0) return `M${x} 100 L${x} ${haut}`
  const pas = (100 - haut) / segments
  const points = Array.from({ length: segments + 1 }, (_, i) => {
    const y = 100 - i * pas
    return `${(x + deplacement(amplitude, i / segments)).toFixed(2)} ${y.toFixed(2)}`
  })
  return `M${points.join(' L')}`
}

export const AMPLITUDE_PINCEMENT = 2
export const DUREE_PINCEMENT = 0.4

/**
 * L'amplitude (px) `t` secondes après le pincement. Une drisse en tension tinte sec (deux oscillations
 * rapides), une drisse en retard rend un son mat (une demi-oscillation très amortie) : jamais une houle.
 */
export function amplitudePincement(t: number, enRetard: boolean): number {
  if (t < 0 || t >= DUREE_PINCEMENT) return 0
  const decroissance = Math.exp(-t / (enRetard ? 0.07 : 0.13))
  return AMPLITUDE_PINCEMENT * decroissance * (enRetard ? 1 : Math.cos(2 * Math.PI * 5 * t))
}

/* ---------- La sculpture : un paraboloïde hyperbolique de 96 fils ---------- */

export interface Point3 {
  x: number
  y: number
  z: number
}

/** Torsion entre la barre du sol et celle du plafond : 90° × (1 − p). */
export const torsion = (p: number) => TORSION_MAX * (1 - borner(p))

/**
 * Les extrémités de chaque fil. Le fil `i` relie un point de la barre du sol (selon x, z = 0) au point de même rang sur la
 * barre du plafond (z = 1), tournée de `angle` autour de la verticale : les fils d'une telle paire de droites,
 * reliés rang pour rang, forment exactement un paraboloïde hyperbolique. `demi` est la demi-longueur de barre.
 */
export function extremites(n: number, angle: number, demi = 0.5): { bas: Point3; haut: Point3 }[] {
  return Array.from({ length: n }, (_, i) => {
    const s = n === 1 ? 0 : -1 + (2 * i) / (n - 1)
    return {
      bas: { x: s * demi, y: 0, z: 0 },
      haut: { x: s * demi * Math.cos(angle), y: s * demi * Math.sin(angle), z: 1 },
    }
  })
}

export interface Vue {
  /** Rotation de la caméra autour de la verticale : π/2 voit un ruban plan par la tranche. */
  lacet: number
  /** Légère plongée, pour que la selle se lise comme un volume. */
  tangage: number
}

export const LACET_DE_REPOS = 0.5
export const TANGAGE = 0.16

/** Projection orthographique : x à l'horizontale, y de 0 (sol) à ~1 (plafond), profondeur pour tamiser les fils éloignés. */
export function projeter(p: Point3, vue: Vue): { x: number; y: number; profondeur: number } {
  const c = Math.cos(vue.lacet)
  const s = Math.sin(vue.lacet)
  const profondeur = -p.x * s + p.y * c
  return {
    x: p.x * c + p.y * s,
    y: p.z * Math.cos(vue.tangage) + profondeur * Math.sin(vue.tangage) * 0.5,
    profondeur,
  }
}

/** Le point d'un fil à la hauteur `t` (0 au sol, 1 au plafond). */
export function surFil(f: { bas: Point3; haut: Point3 }, t: number): Point3 {
  return {
    x: melanger(f.bas.x, f.haut.x, t),
    y: melanger(f.bas.y, f.haut.y, t),
    z: melanger(f.bas.z, f.haut.z, t),
  }
}

/** Un fil est lumineux sous la pince (de plus en plus avec la progression) et presque éteint au-dessus. */
export function eclairage(t: number, pince: number, p: number): number {
  return t <= pince ? melanger(0.25, 1, borner(p)) : 0.22
}

/** Lacet de la caméra : au repos de biais, puis de plus en plus de tranche à mesure que l'objectif se verrouille. */
export const lacetVerrouille = (verrou: number) => melanger(LACET_DE_REPOS, Math.PI / 2, borner(verrou))

/** L'ouverture de la sculpture à l'entrée : les fils s'écartent d'une ligne vers leur largeur pleine. */
export const largeurOuverte = (ouverture: number) => melanger(0.12, 1, borner(ouverture))

/** Les bornes verticales de la projection (en toutes positions), pour caler la sculpture dans son cadre sans qu'elle saute. */
export function bornesVerticales(): { min: number; max: number } {
  const ys = [TORSION_MAX, 0].flatMap((angle) =>
    extremites(2, angle).flatMap((f) =>
      [f.bas, f.haut].map((p) => projeter(p, { lacet: LACET_DE_REPOS, tangage: TANGAGE }).y),
    ),
  )
  const reperes = [-0.5, 0.5].flatMap((s) =>
    [0, 1].map((z) => projeter({ x: 0, y: s, z }, { lacet: LACET_DE_REPOS, tangage: TANGAGE }).y),
  )
  const tous = [...ys, ...reperes]
  return { min: Math.min(...tous), max: Math.max(...tous) }
}

/* ---------- La fiche : la courbe de l'e1RM qui monte vers le mât ---------- */

export interface Courbe {
  historique: [number, number][]
  /** Du point actuel à la cible, tendue et droite. */
  necessaire: [[number, number], [number, number]] | null
  /** Du point actuel à la projection, en pointillé. */
  tendance: [[number, number], [number, number]] | null
  actuel: [number, number] | null
  cible: [number, number]
  base: number
}

/**
 * La courbe de l'e1RM en deux dimensions : le temps en x, le lest en y, et son bord droit est la drisse, posée au jour
 * de l'échéance. Axes réduits à deux graduations : 0 kg (la base) et la cible.
 */
export function geometrieCourbe(
  o: ObjectifLu,
  points: readonly PointEvolution[],
  rythme: Rythme | null,
  aujourdhui: string,
  largeur: number,
  hauteur: number,
  marge = 6,
): Courbe | null {
  const serie = e1rmParDate(points)
  if (serie.length === 0 || o.valeur_cible_kg <= 0) return null
  const debut = serie[0]!.jour
  const fin = o.date_cible > aujourdhui ? o.date_cible : aujourdhui
  const duree = Math.max(1, joursEntre(debut, fin))
  const maxKg = Math.max(o.valeur_cible_kg, ...serie.map((p) => p.e1rm), rythme?.projection ?? 0) * 1.04
  const x = (jour: string) => marge + (joursEntre(debut, jour) / duree) * (largeur - 2 * marge)
  const y = (kg: number) => hauteur - marge - (kg / maxKg) * (hauteur - 2 * marge)
  const historique = serie.map((p): [number, number] => [x(p.jour), y(p.e1rm)])
  const dernier = serie.at(-1)!
  const actuel: [number, number] = [x(dernier.jour), y(dernier.e1rm)]
  const cible: [number, number] = [x(fin), y(o.valeur_cible_kg)]
  const enCours = o.statut === 'en_cours'
  return {
    historique,
    actuel,
    cible,
    base: y(0),
    necessaire: enCours ? [actuel, cible] : null,
    tendance: enCours && rythme?.projection != null ? [actuel, [cible[0], y(rythme.projection)]] : null,
  }
}

/** L'infobulle de la pince : ce que dit le e1RM, et à quel rythme il monte. */
export function phraseBulle(o: ObjectifLu, rythme: Rythme | null): string {
  if (!o.progression) return 'e1RM pas encore estimé'
  const base = `e1RM ${signe(o.progression.e1rm_lest_kg, 1)} kg · dernière séance ${dateCourte(o.progression.le)}`
  return rythme?.reel != null ? `${base} · pente ${signe(rythme.reel)} kg/sem` : base
}
