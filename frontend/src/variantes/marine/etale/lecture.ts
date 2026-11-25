import type { Conditions } from '../../../api/types'
import { nombre } from '../../../commun/format'
import { heureCourte, titreMarine } from '../../../espaces/marine/titre'
import {
  type Heure,
  type Niveau,
  type ProfilEstran,
  basculeDanger,
  distanceA,
  etaleDansCreneau,
  minutesDeMarche,
  prochainCoucher,
  sensVent,
} from './modele'

/** Ce que disent les instruments à l'heure choisie : l'instant présent, ou une heure de la prévision. */
export interface Lecture {
  instant: string
  surMaintenant: boolean
  eauC: number | null
  airC: number | null
  ressentiC: number | null
  ventKmh: number | null
  rafalesKmh: number | null
  ventDeg: number | null
  vaguesM: number | null
  houleM: number | null
  periodeS: number | null
  courantKmh: number | null
  courantDeg: number | null
  codeMeteo: number | null
  nuagesPct: number | null
  danger: Niveau
  hauteurM: number | null
  /** La distance de sable jusqu'à l'eau donnée par l'API, quand elle en donne une. */
  distanceM: number | null
}

/**
 * Les valeurs à l'heure `rang`. Ce que les heures ne donnent pas (période de la houle, ressenti)
 * vient de l'instant présent, comme dans les autres vues de la mer.
 */
export function lectureA(conditions: Conditions, rang: number): Lecture {
  const m = conditions.maintenant
  const h = conditions.heures[rang]
  const surMaintenant = rang === 0 || !h
  const choisie = (maintenant: number | null | undefined, heure: number | null | undefined) =>
    (surMaintenant ? maintenant : heure) ?? null
  return {
    instant: surMaintenant ? m.instant : h.instant,
    surMaintenant,
    eauC: surMaintenant ? (m.eau_c ?? null) : (h.eau_c ?? m.eau_c ?? null),
    airC: choisie(m.air_c, h?.air_c),
    ressentiC: surMaintenant ? (m.ressenti_c ?? null) : null,
    ventKmh: choisie(m.vent_kmh, h?.vent_kmh),
    rafalesKmh: choisie(m.rafales_kmh, h?.rafales_kmh),
    ventDeg: choisie(m.vent_direction_deg, h?.vent_direction_deg),
    vaguesM: choisie(m.vagues_m, h?.vagues_m),
    houleM: m.houle_m ?? null,
    periodeS: m.periode_s ?? null,
    courantKmh: choisie(m.courant_kmh, h?.courant_kmh),
    courantDeg: choisie(m.courant_direction_deg, h?.courant_direction_deg),
    codeMeteo: choisie(m.code_meteo, h?.code_meteo),
    nuagesPct: choisie(m.nuages_pct, h?.nuages_pct),
    danger: surMaintenant ? conditions.danger.niveau : h.danger,
    hauteurM: surMaintenant ? (m.hauteur_eau_m ?? h?.hauteur_eau_m ?? null) : (h.hauteur_eau_m ?? null),
    distanceM: surMaintenant ? (m.distance_eau_m ?? null) : (h.distance_eau_m ?? null),
  }
}

/** La distance à marcher : celle de l'API, sinon celle que donne le profil à la hauteur d'eau. */
export function distanceChoisie(lecture: Lecture, profil: ProfilEstran | null): number | null {
  if (typeof lecture.distanceM === 'number') return lecture.distanceM
  return profil && lecture.hauteurM !== null ? distanceA(profil, lecture.hauteurM) : null
}

export const NOM_DANGER = { vert: 'VERT', rouge: 'ROUGE', noir: 'NOIR' } as const
export const PHRASE_DANGER = {
  vert: 'Conditions favorables',
  rouge: 'Prudence : sortie déconseillée sans expérience',
  noir: 'Ne pas y aller',
} as const

export const arrondi = (v: number | null | undefined, chiffres = 0): string =>
  v === null || v === undefined ? '—' : nombre(Number(v.toFixed(chiffres)))

const JOUR_LONG = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Paris',
})

/** « ven. 20 nov. » */
export function jourLong(iso: string): string {
  return JOUR_LONG.format(new Date(iso))
}

/** Le jour (AAAA-MM-JJ) à l'heure de la plage : sert à savoir si un créneau est aujourd'hui. */
export function jourDe(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(iso))
}

/** « 214 m à marcher », ou « L'eau au pied de la digue » quand il n'y a plus de sable à traverser. */
export function phraseDistance(d: number): string {
  return d < 1 ? 'L’eau au pied de la digue' : `${nombre(Math.round(d))} m à marcher`
}

/** « ≈ 3 min à pied », avec la vitesse retenue écrite à côté : c'est une estimation. */
export function phraseMarche(d: number): string {
  return d < 1 ? '' : `≈ ${minutesDeMarche(d)} min à pied`
}

const SENS_VENT = {
  terre: 'vent de terre · pousse au large',
  mer: 'vent de mer · pousse vers la plage',
  cote: 'vent le long de la côte',
} as const

/** Le vent nommé par rapport à la plage ; vide quand il est quasi nul. */
export function phraseVent(ventKmh: number | null, provenanceDeg: number | null): string {
  if (ventKmh === null || provenanceDeg === null) return ''
  return ventKmh < 3 ? 'presque pas de vent' : SENS_VENT[sensVent(provenanceDeg)]
}

/**
 * La ligne qui dit quand le danger change : « ROUGE dès 17h : vent 31 km/h, vagues 0,8 m, nuit dès 17h08 ».
 * Les valeurs sont celles de l'heure où ça bascule, jamais des seuils écrits à la main.
 */
export function phraseBascule(conditions: Conditions, rang: number): string | null {
  const bascule = basculeDanger(conditions.heures, rang)
  if (!bascule) return null
  const { heure } = bascule
  const parties: string[] = []
  if (typeof heure.vent_kmh === 'number') parties.push(`vent ${arrondi(heure.vent_kmh)} km/h`)
  if (typeof heure.rafales_kmh === 'number') parties.push(`rafales ${arrondi(heure.rafales_kmh)} km/h`)
  if (typeof heure.vagues_m === 'number') parties.push(`vagues ${arrondi(heure.vagues_m, 1)} m`)
  if (typeof heure.courant_kmh === 'number') parties.push(`courant ${arrondi(heure.courant_kmh, 1)} km/h`)
  const avant = new Date(conditions.heures[rang]!.instant).getTime()
  const apres = new Date(heure.instant).getTime()
  const coucher = prochainCoucher(conditions.soleil, avant)
  // La nuit est citée si le soleil se couche avant la fin de l'heure où le danger bascule (17h08 pour une bascule à 17h).
  if (coucher && new Date(coucher).getTime() < apres + 3_600_000)
    parties.push(`nuit dès ${heureCourte(coucher)}`)
  return `${NOM_DANGER[heure.danger]} dès ${heureCourte(heure.instant)}${parties.length > 0 ? ` : ${parties.join(', ')}` : ''}`
}

/** La phrase lue par aria-live à chaque déplacement du curseur : heure, hauteur d'eau, distance, danger. */
export function annonce(lecture: Lecture, distanceM: number | null): string {
  const parties = [
    heureCourte(lecture.instant),
    lecture.hauteurM !== null ? `eau à ${arrondi(lecture.hauteurM, 1)} m` : null,
    distanceM !== null ? phraseDistance(distanceM).replace(/^L’eau/, 'l’eau') : null,
    `danger ${lecture.danger}`,
  ]
  return parties.filter(Boolean).join(', ')
}

/** Une heure de la prévision, en une ligne pour son bouton : « ven. 20 17h, danger rouge ». */
export function libelleHeure(heure: Heure, jour: string): string {
  return `${jour} ${heureCourte(heure.instant)}, danger ${heure.danger}`
}

export interface Verdict {
  titre: string
  detail: string
  /** L'heure d'étale qui tombe dans le créneau conseillé, quand il y en a une : elle donne son titre au verdict. */
  etale: Heure | null
}

/**
 * La réponse en une phrase : celle de la page commune (calculée sur les données), sauf quand le créneau
 * conseillé contient un moment d'étale, courant presque nul : « Vas-y à l’étale. » C'est la signature de la page.
 */
export function verdict(conditions: Conditions, creneau: { debut: string; fin: string } | null): Verdict {
  const base = titreMarine(conditions, creneau)
  const etale = conditions.danger.niveau === 'vert' ? etaleDansCreneau(conditions.heures, creneau) : null
  return etale ? { titre: 'Vas-y à l’étale.', detail: base.detail, etale } : { ...base, etale: null }
}

/** « 25 min conseillées · max 40 · eau 12 °C » : les durées de l'assistant et l'eau à l'heure choisie. */
export function phraseDurees(
  durees: { conseille_min: number | null; maximum_min: number | null; texte: string } | null,
  eauC: number | null,
): string {
  const parties: string[] = []
  if (durees) {
    if (typeof durees.conseille_min === 'number')
      parties.push(`${arrondi(durees.conseille_min)} min conseillées`)
    if (typeof durees.maximum_min === 'number') parties.push(`max ${arrondi(durees.maximum_min)}`)
    if (parties.length === 0 && durees.texte) parties.push(durees.texte)
  }
  if (eauC !== null) parties.push(`eau ${arrondi(eauC, 1)} °C`)
  return parties.join(' · ')
}

/** Les jours que couvrent les prévisions, dans l'ordre, avec le rang de leur première heure. */
export function joursDesHeures(heures: readonly Heure[]): { jour: string; rang: number; instant: string }[] {
  const jours: { jour: string; rang: number; instant: string }[] = []
  heures.forEach((h, rang) => {
    const jour = jourDe(h.instant)
    if (jours.at(-1)?.jour !== jour) jours.push({ jour, rang, instant: h.instant })
  })
  return jours
}

/** Le rang à viser pour passer au jour `indexJour` en gardant la même heure : sinon la première heure de ce jour. */
export function rangPourJour(heures: readonly Heure[], indexJour: number, rangActuel: number): number {
  const jours = joursDesHeures(heures)
  const cible = jours[indexJour]
  const actuelle = heures[rangActuel]
  if (!cible || !actuelle) return rangActuel
  const fin = jours[indexJour + 1]?.rang ?? heures.length
  const memeHeure = heureCourte(actuelle.instant)
  for (let i = cible.rang; i < fin; i++) if (heureCourte(heures[i]!.instant) === memeHeure) return i
  return cible.rang
}

/** L'index du jour (0 : le jour de la première heure) où tombe l'heure `rang`. */
export function indexJour(heures: readonly Heure[], rang: number): number {
  let index = 0
  joursDesHeures(heures).forEach((j, i) => {
    if (j.rang <= rang) index = i
  })
  return index
}

/** « J », « J+1 »… : le nom court d'un jour de la prévision. */
export const nomDeJour = (index: number): string => (index === 0 ? 'J' : `J+${index}`)
