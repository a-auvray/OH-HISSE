/*
 * Le modèle de « Ligne de charge » : tout ce qui se calcule, sans DOM.
 *
 * La page est une poutre posée sur deux appuis. La série du jour la fait ployer d'une
 * flèche qui dit la charge relative au record, chaque exercice pend à une profondeur
 * égale à son pourcentage d'e1RM. Ce fichier donne la déformée, les échelles et les
 * phrases ; le dessin n'a plus qu'à les afficher.
 */

/** Flèche mini et maxi de la ligne, en pixels : 12 pour une charge légère, 48 pour un record. */
export const FLECHE_MIN = 12
export const FLECHE_MAX = 48
/** En dessous de ce rapport au record, la flèche reste à son minimum. */
const RAPPORT_PLANCHER = 0.6
/** Au-dessus de ce rapport (un record battu), elle reste à son maximum. */
const RAPPORT_PLAFOND = 1.05

const borner = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x))

/** Charge totale soulevée : poids du corps + lest. Inconnue si l'un des deux manque. */
export function chargeTotale(
  poids: number | null | undefined,
  lest: number | null | undefined,
): number | null {
  if (poids === null || poids === undefined || lest === null || lest === undefined) return null
  return poids + lest
}

/** Le meilleur e1RM total (poids du corps compris) de l'historique : le record estimé. */
export function recordTotal(points: readonly { e1rm_total_kg: number | null }[]): number | null {
  const valeurs = points.map((p) => p.e1rm_total_kg).filter((v): v is number => v !== null && v > 0)
  return valeurs.length === 0 ? null : Math.max(...valeurs)
}

/** Rapport d'une charge à son record, ou null quand l'un des deux est inconnu. */
export function rapport(total: number | null, reference: number | null): number | null {
  if (total === null || reference === null || reference <= 0) return null
  return total / reference
}

/** 0,9827 → 98 (le pourcentage affiché). */
export function pourcentage(r: number): number {
  return Math.round(r * 100)
}

/**
 * Amplitude de la flèche en pixels : 12 + 36 × clamp((r − 0,6) / 0,45).
 * Une charge inconnue laisse la ligne à plat (0) : on ne dessine pas ce qu'on ne sait pas.
 */
export function amplitudeFleche(r: number | null): number {
  if (r === null) return 0
  const part = borner((r - RAPPORT_PLANCHER) / (RAPPORT_PLAFOND - RAPPORT_PLANCHER), 0, 1)
  return FLECHE_MIN + (FLECHE_MAX - FLECHE_MIN) * part
}

/** Masse d'une plaque : 1 + charge / 40, d'où son inertie quand elle glisse en place. */
export function masse(lest: number | null): number {
  return 1 + Math.max(0, lest ?? 0) / 40
}

/** Retard d'une plaque à l'entrée, en millisecondes : la plus lourde démarre un peu après, plafonné à 60 ms. */
export function retardInertie(m: number): number {
  return Math.min(60, Math.max(0, (m - 1) * 60))
}

/* ───────────── La déformée ───────────── */

/**
 * Déformée d'une poutre simplement appuyée, chargée en un point (Euler-Bernoulli), sur `n + 1`
 * échantillons de 0 à 1. `position` est le point de charge, en part de la longueur. La courbe est
 * normalisée par son maximum : l'amplitude en pixels est donnée à part.
 */
export function profilPoutre(n: number, position: number): number[] {
  const a = borner(position, 0.04, 0.96)
  // y(x) = b·x·(1 − b² − x²) / 6 pour x ≤ a ; l'autre moitié est le symétrique (on ramène à x ≤ a).
  const brute = (x: number) => {
    const [xp, ap] = x <= a ? [x, a] : [1 - x, 1 - a]
    const b = 1 - ap
    return (b * xp * (1 - b * b - xp * xp)) / 6
  }
  const valeurs = Array.from({ length: n + 1 }, (_, i) => brute(i / n))
  const max = Math.max(...valeurs) || 1
  return valeurs.map((v) => v / max)
}

/** Le tracé SVG de la ligne : à plat sur `yRepos`, fléchie de `amplitude` pixels vers le bas. */
export function cheminPoutre(
  largeur: number,
  yRepos: number,
  amplitude: number,
  position: number,
  segments = 128,
): string {
  if (largeur <= 0) return ''
  const profil = amplitude > 0 ? profilPoutre(segments, position) : null
  return Array.from({ length: segments + 1 }, (_, i) => {
    const x = (i / segments) * largeur
    const y = yRepos + (profil ? (profil[i] ?? 0) * amplitude : 0)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

/** Ordonnée du point le plus bas de la ligne (pour poser l'étiquette), au repos de la flèche. */
export function pointBas(yRepos: number, amplitude: number): number {
  return yRepos + amplitude
}

/* ───────────── L'échelle de chauffe ───────────── */

/** RPE 6 → 0, RPE 10 → 1 : la part de chauffe d'une intensité. */
export function chaleur(rpe: number): number {
  return borner((rpe - 6) / 4, 0, 1)
}

/**
 * La couleur d'une intensité : de la teinte d'accent (RPE 6) à la couleur du texte (RPE 10), la plus
 * contrastée du thème. Elle ne reprend jamais le vert-orange-rouge du ressenti. Uniquement des jetons :
 * elle suit donc le thème et le ton.
 */
export function teinteChaleur(rpe: number): string {
  return `color-mix(in srgb, var(--texte) ${Math.round(chaleur(rpe) * 100)}%, var(--accent))`
}

/**
 * La couleur du filet de la ligne : le texte du thème, à peine teinté d'accent quand l'effort visé est
 * léger. Sans intensité connue, le filet reste à la couleur du texte.
 */
export function teinteLigne(rpe: number | null): string {
  if (rpe === null) return 'var(--texte)'
  return `color-mix(in srgb, var(--texte) ${60 + Math.round(chaleur(rpe) * 40)}%, var(--accent))`
}

/** Les demi-points de RPE de 6 à 10, pour la bande de chauffe. */
export const PAS_RPE: readonly number[] = Array.from({ length: 9 }, (_, i) => 6 + i * 0.5)

/* ───────────── L'échelle de profondeur ───────────── */

export interface EchelleProfondeur {
  min: number
  max: number
  /** Une graduation tous les 10 %. */
  graduations: number[]
}

/** De 60 à 110 %, élargie par pas de 10 si une valeur sort de cet intervalle. */
export function echelleProfondeur(valeurs: readonly number[]): EchelleProfondeur {
  const connues = valeurs.filter((v) => Number.isFinite(v))
  const bas = connues.length ? Math.min(...connues) : 60
  const haut = connues.length ? Math.max(...connues) : 110
  // L'intervalle de base ne s'élargit que si une valeur en sort (une valeur pile sur 60 ou 110 y reste).
  const min = bas < 60 ? Math.floor(bas / 10) * 10 : 60
  const max = haut > 110 ? Math.ceil(haut / 10) * 10 : 110
  const graduations: number[] = []
  for (let g = min; g <= max; g += 10) graduations.push(g)
  return { min, max, graduations }
}

/** Profondeur en pixels d'un pourcentage : le haut de l'échelle est sous la ligne, le bas à `hauteur`. */
export function profondeur(pct: number, echelle: EchelleProfondeur, hauteur: number): number {
  return ((pct - echelle.min) / (echelle.max - echelle.min)) * hauteur
}

/* ───────────── Le ressort ───────────── */

export interface ReglageRessort {
  raideur: number
  amortissement: number
  masse: number
}

/** Le ressort « lourd » de la page : ferme, un seul léger dépassement. */
export const RESSORT_LOURD: ReglageRessort = { raideur: 260, amortissement: 32, masse: 1.4 }

export interface EtatRessort {
  x: number
  v: number
}

/** Un pas d'un ressort amorti (Euler semi-implicite). Le pas est subdivisé pour rester stable. */
export function avancerRessort(
  etat: EtatRessort,
  cible: number,
  reglage: ReglageRessort,
  dt: number,
): EtatRessort {
  const sous = Math.max(1, Math.ceil(dt / (1 / 120)))
  const h = dt / sous
  let { x, v } = etat
  for (let i = 0; i < sous; i += 1) {
    const a = (-reglage.raideur * (x - cible) - reglage.amortissement * v) / reglage.masse
    v += a * h
    x += v * h
  }
  return { x, v }
}

/** Le ressort est-il assez proche de sa cible pour s'y poser ? */
export function auRepos(etat: EtatRessort, cible: number, seuil = 0.02): boolean {
  return Math.abs(etat.x - cible) < seuil && Math.abs(etat.v) < seuil
}

/* ───────────── Les plaques du jour ───────────── */

export interface EntreeProposition {
  exercice_id: number
  exercice: string
  series: number
  reps: number
  rpe_cible: number
  lest_kg: number | null
  justifications: readonly string[]
}

export interface Plaque {
  cle: string
  idExercice: number
  nom: string
  series: number
  reps: number
  rpe: number
  /** null : à choisir. 0 : poids du corps. */
  lest: number | null
  /** Les raisons de l'auto-régulation pour cette charge, telles que l'API les donne. */
  raisons: readonly string[]
  /** Charge totale soulevée, si le poids du corps et le lest sont connus. */
  total: number | null
  /** Le record de référence (meilleur e1RM total), s'il existe. */
  record: number | null
  /** total / record. */
  rapport: number | null
  /** Pourcentage d'e1RM entier, pour l'affichage. */
  pct: number | null
  /** Amplitude de flèche quand cette plaque est la série en cours. */
  amplitude: number
  masse: number
}

/** Une plaque par proposition de la séance, avec ses grandeurs calculées. */
export function plaquesDuJour(
  propositions: readonly EntreeProposition[],
  poids: number | null,
  records: ReadonlyMap<number, number | null>,
): Plaque[] {
  return propositions.map((p, i) => {
    const total = chargeTotale(poids, p.lest_kg)
    const record = records.get(p.exercice_id) ?? null
    const r = rapport(total, record)
    return {
      cle: `${p.exercice_id}-${i}`,
      idExercice: p.exercice_id,
      nom: p.exercice,
      series: p.series,
      reps: p.reps,
      rpe: p.rpe_cible,
      lest: p.lest_kg,
      raisons: p.justifications,
      total,
      record,
      rapport: r,
      pct: r === null ? null : pourcentage(r),
      amplitude: amplitudeFleche(r),
      masse: masse(p.lest_kg),
    }
  })
}

/** La plaque qu'on met en avant à l'ouverture : la première dont la charge est connue, sinon la première. */
export function plaqueInitiale(plaques: readonly Plaque[]): string | null {
  return (plaques.find((p) => p.lest !== null) ?? plaques[0])?.cle ?? null
}

/** La cible d'un objectif tracée sur l'échelle de profondeur : sa charge totale, en % de l'e1RM de l'exercice. */
export function pourcentageCible(
  poids: number | null,
  cibleLest: number,
  record: number | null,
): number | null {
  const r = rapport(chargeTotale(poids, cibleLest), record)
  return r === null ? null : r * 100
}

/* ───────────── Les phrases (toujours calculées) ───────────── */

const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const fmt = (v: number) => NOMBRE.format(v)

/** « 106,7 kg · 98 % du record » : l'étiquette du point bas de la ligne. */
export function etiquetteFleche(total: number, pct: number): string {
  return `${fmt(total)} kg · ${pct} % du record`
}

/** L'équivalent texte de la flèche, pour les lecteurs d'écran et la lecture sans dessin. */
export function phraseFleche(nom: string, total: number | null, pct: number | null): string {
  if (total === null) return `${nom} : charge totale inconnue, la ligne reste à plat.`
  if (pct === null) return `${nom} : charge totale ${fmt(total)} kg, sans record pour la comparer.`
  return `${nom} : charge totale ${fmt(total)} kg, ${pct} % de ton record estimé.`
}

/** « 92 % de l'e1RM » ou la raison pour laquelle on ne peut pas le dire. */
export function phraseProfondeur(plaque: Plaque): string {
  if (plaque.lest === null) return 'charge à choisir'
  if (plaque.pct === null) return plaque.total === null ? 'poids du corps inconnu' : 'pas encore d’e1RM'
  return `${plaque.pct} % de l’e1RM`
}

/** « 64 % du chemin · J−112 » : où en est la cible. */
export function phraseCible(cheminPct: number | null, echeanceTexte: string): string {
  return cheminPct === null ? echeanceTexte : `${Math.round(cheminPct)} % du chemin · ${echeanceTexte}`
}

/* ───────────── La courbe d'analyse ───────────── */

export interface PointCourbe {
  date: string
  valeur: number
  seances: number
}

/** Un intervalle arrondi à des graduations lisibles autour de [min, max]. */
export function graduationsNettes(
  min: number,
  max: number,
  cible = 5,
): { min: number; max: number; pas: number; graduations: number[] } {
  const ecart = max - min || Math.max(1, Math.abs(max) * 0.1)
  const brut = ecart / Math.max(1, cible - 1)
  const puissance = 10 ** Math.floor(Math.log10(brut))
  const fraction = brut / puissance
  const pas =
    (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * puissance
  let bas = Math.floor(min / pas) * pas
  let haut = Math.ceil(max / pas) * pas
  // Une courbe plate (une seule valeur) garde une graduation de chaque côté : le point se tient au milieu.
  if (haut <= bas) {
    bas -= pas
    haut += pas
  }
  const graduations: number[] = []
  for (let g = bas; g <= haut + pas / 2; g += pas) graduations.push(Math.round(g * 1e6) / 1e6)
  return { min: bas, max: haut, pas, graduations }
}

/** Les marges du tracé, pour les axes ; la poutre s'y aligne pour tomber au-dessus du point lu. */
export const MARGES_COURBE = { haut: 16, droite: 24, bas: 36, gauche: 56 }

export interface GeometrieCourbe {
  /** Abscisse en pixels de chaque point (de 0 à `largeur`). */
  xs: number[]
  /** Ordonnée en pixels de chaque point (0 en haut). */
  ys: number[]
  graduations: { valeur: number; y: number }[]
  /** Ordonnée de la ligne de base de l'aire. */
  base: number
}

/**
 * Place les points d'une courbe dans un rectangle `largeur × hauteur`. L'axe du temps est
 * proportionnel aux dates (deux séances rapprochées se touchent), l'axe des valeurs est arrondi.
 */
export function geometrieCourbe(
  points: readonly PointCourbe[],
  largeur: number,
  hauteur: number,
): GeometrieCourbe {
  if (points.length === 0) return { xs: [], ys: [], graduations: [], base: hauteur }
  const temps = points.map((p) => new Date(`${p.date}T12:00:00`).getTime())
  const valeurs = points.map((p) => p.valeur)
  const t0 = Math.min(...temps)
  const t1 = Math.max(...temps)
  const echelle = graduationsNettes(Math.min(...valeurs), Math.max(...valeurs))
  const etendue = echelle.max - echelle.min || 1
  const y = (v: number) => hauteur - ((v - echelle.min) / etendue) * hauteur
  return {
    // Un seul point : il se tient au milieu.
    xs: temps.map((t) => (t1 === t0 ? largeur / 2 : ((t - t0) / (t1 - t0)) * largeur)),
    ys: valeurs.map(y),
    graduations: echelle.graduations.map((valeur) => ({ valeur, y: y(valeur) })),
    base: hauteur,
  }
}

/** L'indice du point le plus proche d'une abscisse. */
export function pointLePlusProche(xs: readonly number[], x: number): number {
  let meilleur = 0
  xs.forEach((px, i) => {
    if (Math.abs(px - x) < Math.abs((xs[meilleur] ?? 0) - x)) meilleur = i
  })
  return meilleur
}

/** Quelques indices répartis pour les repères de date de l'axe. */
export function reperesDates(n: number, max = 5): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i)
  return Array.from({ length: max }, (_, i) => Math.round((i / (max - 1)) * (n - 1)))
}

/**
 * L'étiquette au point bas de la ligne dans l'analyse : le point lu, comparé au meilleur de la courbe.
 * Pour le 1RM c'est le record ; pour les autres grandeurs, le maximum de la période affichée.
 */
export function etiquetteCourbe(valeur: number, unite: string, pct: number, estRecord: boolean): string {
  return `${fmt(valeur)} ${unite} · ${pct} % du ${estRecord ? 'record' : 'maximum'}`
}

/** Part de l'amplitude : le point est comparé au meilleur de la courbe affichée. */
export function rapportAuMeilleur(valeur: number, points: readonly PointCourbe[]): number | null {
  const meilleur = Math.max(...points.map((p) => p.valeur))
  return meilleur > 0 ? valeur / meilleur : null
}
