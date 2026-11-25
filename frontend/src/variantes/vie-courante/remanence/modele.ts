import type { Nuit } from '../../../api/types'
import { depuisIso, isoLocal, nombre } from '../../../commun/format'

/*
 * Le modèle de « Rémanence » : tout ce qui se calcule, sans DOM ni canvas.
 * Le mur et les phrases se dessinent à partir de ces fonctions, qui sont testées seules.
 */

// ───────────────────────── Durées, en chiffres et en mots ─────────────────────────

const MOTS = [
  'zéro',
  'une',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
  'vingt',
  'vingt et une',
  'vingt-deux',
  'vingt-trois',
  'vingt-quatre',
] as const

const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1)

/**
 * La durée dite en mots, arrondie au quart d'heure : « Sept heures et quart. ».
 * Le chiffre exact reste affiché à côté (voir `formaterDuree`) : les mots donnent la sensation,
 * le chiffre la précision. Arrondir au quart évite que la phrase change à chaque minute glissée.
 */
export function dureeEnMots(heures: number): string {
  const quarts = Math.round(Math.max(0, heures) * 4)
  if (quarts === 0) return 'Nuit blanche.'
  const pleines = Math.floor(quarts / 4)
  const reste = quarts % 4
  if (pleines === 0) {
    return majuscule(['', 'un quart d’heure', 'une demi-heure', 'trois quarts d’heure'][reste] ?? '') + '.'
  }
  const mot = MOTS[pleines] ?? String(pleines)
  const unite = pleines === 1 ? 'heure' : 'heures'
  const suite = ['', ' et quart', ' et demie', ' trois quarts'][reste] ?? ''
  return `${majuscule(mot)} ${unite}${suite}.`
}

/** 7,2 → « 7 h 12 » ; 8 → « 8 h » : la durée exacte, à la minute. */
export function formaterDuree(heures: number): string {
  const minutes = Math.round(Math.max(0, heures) * 60)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

/** Écart entre la dernière nuit et la moyenne, en minutes (positif : on a plus dormi que d'habitude). */
export function ecartEnMinutes(nuit: number, moyenne: number): number {
  return Math.round((nuit - moyenne) * 60)
}

/** « +18 min vs moy. 7 j (6 h 54) » : la nuit se lit toujours par rapport à la moyenne de la semaine. */
export function phraseEcart(nuit: number, moyenne: number): string {
  const minutes = ecartEnMinutes(nuit, moyenne)
  const reference = `moy. 7 j (${formaterDuree(moyenne)})`
  if (minutes === 0) return `= ${reference}`
  return `${minutes > 0 ? '+' : '−'}${Math.abs(minutes)} min vs ${reference}`
}

/** « 7,2 » → 7.2 ; null si la saisie n'est pas une durée plausible (de 0 à 24 h, 0 exclu). */
export function lireHeures(saisie: string): number | null {
  const texte = saisie.trim().replace(',', '.')
  if (texte === '') return null
  const valeur = Number(texte)
  return Number.isFinite(valeur) && valeur > 0 && valeur <= 24 ? valeur : null
}

/** 7.0833 → « 7,08 » : ce qu'on écrit dans le champ quand la poignée glisse. */
export function heuresEnSaisie(heures: number): string {
  return String(Math.round(heures * 100) / 100).replace('.', ',')
}

/** Déplace une durée d'un pas de 5 minutes (30 avec Maj), sans sortir de 5 minutes à 12 heures. */
export function pousserDuree(heures: number, sens: 1 | -1, gros: boolean): number {
  const minutes = Math.round(heures * 60) + sens * (gros ? 30 : 5)
  return Math.min(12 * 60, Math.max(5, Math.round(minutes / 5) * 5)) / 60
}

// ───────────────────────── Ressenti ─────────────────────────

export type Ressenti = 'bon' | 'moyen' | 'difficile'

/** La qualité de 1 à 5 saisie dans l'application, ramenée aux trois niveaux de la pastille. */
export function ressentiDeQualite(qualite: number | null | undefined): Ressenti | null {
  if (qualite === null || qualite === undefined) return null
  if (qualite >= 4) return 'bon'
  return qualite === 3 ? 'moyen' : 'difficile'
}

/** La dureté du bord d'une empreinte, en pixels de flou : un mauvais ressenti laisse un bord net. */
export function flouDuBord(ressenti: Ressenti | null): number {
  if (ressenti === 'difficile') return 0
  if (ressenti === 'bon') return 9
  return 4
}

// ───────────────────────── Les sept empreintes ─────────────────────────

export interface Empreinte {
  date: string
  /** Durée de la nuit, ou null si elle n'a pas été notée. */
  heures: number | null
  qualite: number | null
  /** 0 pour la nuit du jour, 6 pour la plus ancienne : sert à l'opacité (la rémanence). */
  age: number
  ressenti: Ressenti | null
}

/** Sept jours finissant à `jour` (inclus), du plus ancien au plus récent ; les nuits manquantes restent vides. */
export function empreintesDeLaSemaine(nuits: readonly Nuit[], jour: string, nombreDeJours = 7): Empreinte[] {
  const parDate = new Map(nuits.map((n) => [n.date, n]))
  return Array.from({ length: nombreDeJours }, (_, i) => {
    const d = depuisIso(jour)
    d.setDate(d.getDate() - (nombreDeJours - 1 - i))
    const date = isoLocal(d)
    const nuit = parDate.get(date)
    return {
      date,
      heures: nuit ? nuit.heures : null,
      qualite: nuit?.qualite ?? null,
      age: nombreDeJours - 1 - i,
      ressenti: ressentiDeQualite(nuit?.qualite),
    }
  })
}

/** Une empreinte telle que le mur la montre : celle du jour peut être une saisie pas encore imprimée. */
export interface EmpreinteAffichee extends Empreinte {
  provisoire: boolean
}

export interface SaisieDuJour {
  /** La durée tapée ou glissée, si elle est valide. */
  heures: number | null
  /** Le ressenti choisi (ou celui de la nuit déjà notée). */
  qualite: number | null
  /** Hauteur du contour en tirets quand rien n'est encore saisi. */
  parDefaut: number
}

/**
 * Les sept empreintes telles que le mur les montre : la nuit du jour suit la saisie en direct (durée
 * glissée, ressenti choisi) et reste un contour en tirets tant qu'elle n'est pas imprimée, c'est-à-dire
 * notée ou différente de la nuit déjà notée.
 */
export function empreintesAffichees(base: readonly Empreinte[], saisie: SaisieDuJour): EmpreinteAffichee[] {
  return base.map((e, i) => {
    if (i !== base.length - 1) return { ...e, provisoire: false }
    const heures = saisie.heures ?? e.heures ?? saisie.parDefaut
    const provisoire =
      e.heures === null || (saisie.heures !== null && Math.abs(saisie.heures - e.heures) > 1e-6)
    return { ...e, heures, qualite: saisie.qualite, ressenti: ressentiDeQualite(saisie.qualite), provisoire }
  })
}

/** Moyenne des nuits notées de la semaine, ou null s'il n'y en a aucune. */
export function moyenneDesEmpreintes(empreintes: readonly Empreinte[]): number | null {
  const notees = empreintes.flatMap((e) => (e.heures === null ? [] : [e.heures]))
  return notees.length ? notees.reduce((s, h) => s + h, 0) / notees.length : null
}

const JOUR_LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const JOUR_COURT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })

export const jourCourt = (date: string) => JOUR_COURT.format(depuisIso(date))

/**
 * Le nom lu par un lecteur d'écran : « jeudi 19 novembre : 6 h 48, ressenti bon ». La nuit du jour pas encore
 * imprimée n'est qu'une proposition (le contour en tirets) : on le dit, pour ne pas la prendre pour une mesure.
 */
export function nomAccessible(e: Empreinte & { provisoire?: boolean }): string {
  const jour = JOUR_LONG.format(depuisIso(e.date))
  if (e.provisoire) {
    return e.heures === null
      ? `${jour} : nuit à imprimer`
      : `${jour} : nuit à imprimer, ${formaterDuree(e.heures)} proposées`
  }
  if (e.heures === null) return `${jour} : nuit non notée`
  const ressenti = e.ressenti ? `, ressenti ${e.ressenti}` : ', ressenti non noté'
  return `${jour} : ${formaterDuree(e.heures)}${ressenti}`
}

/** La légende courte affichée au survol d'une empreinte : « jeu. 19 · 6 h 48 · ressenti bon ». */
export function legende(e: Empreinte & { provisoire?: boolean }): string {
  const jour = `${jourCourt(e.date)} ${depuisIso(e.date).getDate()}`
  if (e.provisoire) {
    return e.heures === null
      ? `${jour} · nuit à imprimer`
      : `${jour} · ${formaterDuree(e.heures)} proposées · nuit à imprimer`
  }
  if (e.heures === null) return `${jour} · nuit non notée`
  return `${jour} · ${formaterDuree(e.heures)} · ressenti ${e.ressenti ?? 'non noté'}`
}

/** Sous ce seuil, une empreinte de lumière claire sur le mur le plus pâle (Matière, jour) passerait sous 3:1. */
export const OPACITE_MINIMALE = 0.5

/** L'opacité d'une empreinte selon son âge : la nuit d'hier brille, la plus ancienne s'efface sans disparaître. */
export function opaciteDeLAge(age: number): number {
  return Math.max(OPACITE_MINIMALE, Math.pow(0.85, age))
}

// ───────────────────────── Géométrie du champ ─────────────────────────

/** Hauteur de la bande sous la ligne de sol (dates, durées) : la même pour le champ et pour la colonne. */
export const BANDE_BASSE = 72
/** Marge au-dessus de la plus haute durée représentable. */
export const MARGE_HAUTE = 28
/** La règle verticale va de 0 à 10 heures ; une nuit plus longue est écrêtée. */
export const HEURES_MAX = 10
const MARGE_LATERALE = 14
const LARGEUR_MAX_EMPREINTE = 64

export interface GeometrieChamp {
  /** Ordonnée de la ligne de sol, en pixels. */
  sol: number
  pxParHeure: number
  /** Largeur d'un créneau (un jour). */
  creneau: number
  largeurEmpreinte: number
  marge: number
}

export function geometrieChamp(largeur: number, hauteur: number, creneaux = 7): GeometrieChamp {
  const sol = Math.max(MARGE_HAUTE + 40, hauteur - BANDE_BASSE)
  const creneau = Math.max(1, (largeur - 2 * MARGE_LATERALE) / creneaux)
  return {
    sol,
    pxParHeure: (sol - MARGE_HAUTE) / HEURES_MAX,
    creneau,
    largeurEmpreinte: Math.min(LARGEUR_MAX_EMPREINTE, creneau * 0.62),
    marge: MARGE_LATERALE,
  }
}

export interface Rectangle {
  x: number
  y: number
  largeur: number
  hauteur: number
}

/** Le rectangle lumineux d'une nuit, posé sur la ligne de sol dans son créneau. */
export function rectangleDeNuit(g: GeometrieChamp, rang: number, heures: number): Rectangle {
  const hauteur = Math.min(HEURES_MAX, Math.max(0, heures)) * g.pxParHeure
  return {
    x: g.marge + g.creneau * rang + (g.creneau - g.largeurEmpreinte) / 2,
    y: g.sol - hauteur,
    largeur: g.largeurEmpreinte,
    hauteur,
  }
}

/** L'ordonnée d'une durée sur la règle (pour la ligne des 8 h et celle de la moyenne). */
export function ordonneeDeDuree(g: GeometrieChamp, heures: number): number {
  return g.sol - Math.min(HEURES_MAX, Math.max(0, heures)) * g.pxParHeure
}

/** Le contraire : la durée qui correspond à une ordonnée (glisser le bord haut de l'empreinte du jour). */
export function dureeDeOrdonnee(g: GeometrieChamp, y: number): number {
  const heures = (g.sol - y) / g.pxParHeure
  return Math.min(HEURES_MAX, Math.max(0, heures))
}

// ───────────────────────── Récupération : le souffle ─────────────────────────

export type NomPalier = 'frais' | 'entamé' | 'à plat'

export interface PalierSouffle {
  nom: NomPalier
  /** Durée d'un cycle de respiration, en secondes. */
  periodeS: number
  /** Amplitude de la respiration, en part de la hauteur de la colonne. */
  amplitude: number
}

/** Seuils du cahier des charges : jusqu'à 24 h restantes, de 24 à 48 h, au-delà. Le palier est toujours écrit. */
export function palierSouffle(restantH: number): PalierSouffle {
  if (restantH <= 24) return { nom: 'frais', periodeS: 12, amplitude: 0.03 }
  if (restantH <= 48) return { nom: 'entamé', periodeS: 8, amplitude: 0.04 }
  return { nom: 'à plat', periodeS: 6, amplitude: 0.06 }
}

/** Le décalage de respiration à l'instant `temps` (secondes), de −amplitude à +amplitude. */
export function souffle(palier: PalierSouffle, temps: number): number {
  return palier.amplitude * Math.sin((2 * Math.PI * temps) / palier.periodeS)
}

// ───────────────────────── Braise du cheat meal ─────────────────────────

export type NiveauBraise = 'eteinte' | 'rougeoyante' | 'vive'

/** Les trois paliers de la braise suivent les trois verdicts. */
export function niveauBraise(verdict: 'oui' | 'petit' | 'non'): NiveauBraise {
  if (verdict === 'oui') return 'vive'
  return verdict === 'petit' ? 'rougeoyante' : 'eteinte'
}

// ───────────────────────── Allumage (entrée) ─────────────────────────

const DECALAGE_ALLUMAGE_S = 0.06
const DUREE_ALLUMAGE_S = 0.28
const DEBUT_FANTOME_S = 0.7
const DUREE_FANTOME_S = 0.3
const DEBUT_COLONNE_S = 0.8
const DUREE_COLONNE_S = 0.7

const borner = (x: number) => Math.min(1, Math.max(0, x))
/** Sortie en douceur, sans dépassement (le ressort « Souffle » du brief, sans l'imiter exactement). */
const adoucir = (x: number) => 1 - Math.pow(1 - borner(x), 3)

export type PhaseAnimation = 'cinema' | 'sobre' | 'immobile'

/**
 * Intensité d'allumage (de 0 à 1) de l'empreinte de rang `rang` après `ecoule` secondes :
 * en cinéma elles s'allument une à une, de la plus ancienne à la plus récente, comme une pose
 * longue ; en sobre toutes ensemble en 250 ms ; en immobile elles sont déjà là.
 */
export function allumage(ecoule: number, rang: number, niveau: PhaseAnimation): number {
  if (niveau === 'immobile') return 1
  if (niveau === 'sobre') return adoucir(ecoule / 0.25)
  return adoucir((ecoule - rang * DECALAGE_ALLUMAGE_S) / DUREE_ALLUMAGE_S)
}

/** Avancement du tracé de la moyenne fantôme (de 0 à 1), une fois les empreintes allumées. */
export function avancementFantome(ecoule: number, niveau: PhaseAnimation): number {
  if (niveau !== 'cinema') return allumage(ecoule, 0, niveau)
  return adoucir((ecoule - DEBUT_FANTOME_S) / DUREE_FANTOME_S)
}

/** Remplissage de la colonne de récupération, de 0 à la progression réelle. */
export function avancementColonne(ecoule: number, niveau: PhaseAnimation): number {
  if (niveau !== 'cinema') return allumage(ecoule, 0, niveau)
  return adoucir((ecoule - DEBUT_COLONNE_S) / DUREE_COLONNE_S)
}

// ───────────────────────── Balance (pesées) ─────────────────────────

export interface Pesee {
  date: string
  poids_kg: number
}

export interface PointBalance {
  date: string
  kg: number
  /** Moyenne des pesées des trois semaines qui précèdent (celle que le 1RM utilise). */
  moyenne: number
}

const JOURS_MOYENNE = 21

/** Les pesées des `semaines` dernières semaines, chacune avec sa moyenne mobile sur trois semaines. */
export function pointsDeBalance(pesees: readonly Pesee[], jour: string, semaines = 12): PointBalance[] {
  const fin = depuisIso(jour).getTime()
  const jourMs = 86_400_000
  const triees = [...pesees].sort((a, b) => a.date.localeCompare(b.date))
  return triees
    .filter((p) => {
      const ecart = (fin - depuisIso(p.date).getTime()) / jourMs
      return ecart >= 0 && ecart < semaines * 7
    })
    .map((p) => {
      const t = depuisIso(p.date).getTime()
      const voisines = triees.filter((q) => {
        const ecart = (t - depuisIso(q.date).getTime()) / jourMs
        return ecart >= 0 && ecart < JOURS_MOYENNE
      })
      return {
        date: p.date,
        kg: p.poids_kg,
        moyenne: voisines.reduce((s, q) => s + q.poids_kg, 0) / voisines.length,
      }
    })
}

/** Variation entre la dernière pesée et la précédente : « −0,4 » ; null s'il n'y en a qu'une. */
export function variationDePesee(points: readonly PointBalance[]): string | null {
  const derniere = points.at(-1)
  const precedente = points.at(-2)
  if (!derniere || !precedente) return null
  const ecart = Math.round((derniere.kg - precedente.kg) * 10) / 10
  if (ecart === 0) return '0'
  return `${ecart > 0 ? '+' : '−'}${nombre(Math.abs(ecart))}`
}

export interface TraceBalance {
  /** Points de la ligne de moyenne mobile, dans un cadre de `largeur` × `hauteur`. */
  ligne: readonly { x: number; y: number }[]
  /** Chaque pesée, en points. */
  points: readonly { x: number; y: number }[]
}

/** Met les pesées à l'échelle d'une petite ligne : le temps en abscisse, le poids en ordonnée. */
export function tracerBalance(
  points: readonly PointBalance[],
  jour: string,
  largeur: number,
  hauteur: number,
  semaines = 12,
): TraceBalance {
  if (points.length === 0) return { ligne: [], points: [] }
  const fin = depuisIso(jour).getTime()
  const duree = semaines * 7 * 86_400_000
  const valeurs = points.flatMap((p) => [p.kg, p.moyenne])
  const bas = Math.min(...valeurs)
  const haut = Math.max(...valeurs)
  const etendue = Math.max(0.5, haut - bas)
  const marge = 3
  const x = (date: string) => marge + (1 - (fin - depuisIso(date).getTime()) / duree) * (largeur - 2 * marge)
  const y = (kg: number) => marge + (1 - (kg - bas) / etendue) * (hauteur - 2 * marge)
  return {
    ligne: points.map((p) => ({ x: x(p.date), y: y(p.moyenne) })),
    points: points.map((p) => ({ x: x(p.date), y: y(p.kg) })),
  }
}

// ───────────────────────── Couleurs : le mur dans n'importe quel thème ─────────────────────────

export interface Rvb {
  r: number
  g: number
  b: number
  a: number
}

/**
 * Lit une couleur CSS résolue par le navigateur : `rgb(…)`, `rgba(…)`, `color(srgb …)` ou `#rrggbb`.
 * Les jetons des thèmes passent par `color-mix`, que le navigateur rend dans l'une de ces formes.
 */
export function analyserCouleur(texte: string): Rvb | null {
  const t = texte.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t)
  if (hex?.[1]) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    }
  }
  const fonction = /^(rgba?|color)\(\s*(?:srgb\s+)?([^)]*)\)$/.exec(t)
  if (!fonction?.[1] || fonction[2] === undefined) return null
  const [canaux = '', alpha] = fonction[2].split('/')
  // `color(srgb 0.1 0.2 0.3)` donne des canaux de 0 à 1 ; `rgb()` de 0 à 255.
  const echelle = fonction[1] === 'color' ? 255 : 1
  const valeurs = canaux
    .replace(/,/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((v) => (v.endsWith('%') ? (parseFloat(v) / 100) * (echelle === 255 ? 1 : 255) : parseFloat(v)))
  const [r, g, b, aInline] = valeurs
  if (r === undefined || g === undefined || b === undefined || [r, g, b].some(Number.isNaN)) return null
  const a = alpha !== undefined ? parseAlpha(alpha) : aInline !== undefined ? aInline : 1
  return { r: r * echelle, g: g * echelle, b: b * echelle, a: Number.isNaN(a) ? 1 : a }
}

function parseAlpha(texte: string): number {
  const t = texte.trim()
  return t.endsWith('%') ? parseFloat(t) / 100 : parseFloat(t)
}

/** Luminance relative WCAG d'une couleur opaque. */
export function luminance({ r, g, b }: Rvb): number {
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Rapport de contraste WCAG entre deux couleurs opaques (de 1 à 21). */
export function contraste(a: Rvb, b: Rvb): number {
  const [haut, bas] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (haut + 0.05) / (bas + 0.05)
}

const melanger = (a: Rvb, b: Rvb, part: number): Rvb => ({
  r: a.r + (b.r - a.r) * part,
  g: a.g + (b.g - a.g) * part,
  b: a.b + (b.b - a.b) * part,
  a: 1,
})

export const enRvb = ({ r, g, b }: Rvb) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`
export const avecAlpha = ({ r, g, b }: Rvb, alpha: number) =>
  `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)} / ${Math.round(alpha * 1000) / 1000})`

export interface EncresMur {
  /** Le mur : le plus sombre des deux jetons de page, à peine relevé. */
  mur: Rvb
  /** La lumière des empreintes et des textes : le plus clair des deux. */
  lumiere: Rvb
}

/**
 * Le mur est toujours un mur de nuit (un outrenoir) : on prend le plus sombre des jetons `--fond` et
 * `--texte` du thème pour le mur, et le plus clair pour la lumière. Dans un thème de jour, le fond est
 * clair et l'encre sombre ; dans un thème sombre, c'est l'inverse : dans les deux cas le mur est sombre
 * et la lumière claire, avec le contraste que le thème donne à son propre texte.
 */
export function choisirEncres(fond: Rvb, texte: Rvb): EncresMur {
  const [sombre, clair] = luminance(fond) <= luminance(texte) ? [fond, texte] : [texte, fond]
  return { mur: melanger(sombre, clair, 0.05), lumiere: { ...clair, a: 1 } }
}

/** Valeurs de repli (jsdom, ou un jeton illisible) : celles du thème Classique. */
export const ENCRES_PAR_DEFAUT: EncresMur = {
  mur: { r: 17, g: 20, b: 23, a: 1 },
  lumiere: { r: 233, g: 236, b: 239, a: 1 },
}
