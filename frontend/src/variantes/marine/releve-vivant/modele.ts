/*
 * Le modèle du Relevé Vivant : tout ce que la page calcule, sans React ni DOM.
 * La géométrie (profil de plage, isolignes d'eau, frange de houle, courbe lissée)
 * et les phrases (danger, distance, coordonnées) sont ici pour être testées seules.
 * Rien n'est écrit à la main : tout vient des conditions que l'API a données.
 */
import type { Conditions } from '../../../api/types'
import { nombre } from '../../../commun/format'
import { jourCourt } from '../../../espaces/marine/lecture'
import { heureCourte } from '../../../espaces/marine/titre'

export type Heure = Conditions['heures'][number]
export type Maree = Conditions['marees'][number]
export type Niveau = Heure['danger']

export const NOM_DANGER: Record<Niveau, string> = { vert: 'VERT', rouge: 'ROUGE', noir: 'NOIR' }
const UNE_HEURE = 3_600_000

/* ------------------------------------------------------------------ */
/* Échelles et courbe lissée                                           */
/* ------------------------------------------------------------------ */

export interface Point {
  x: number
  y: number
}

/** Une échelle linéaire de [d0, d1] vers [r0, r1], sans dépendance. Un domaine nul donne le milieu. */
export function echelle(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const etendue = d1 - d0
  return (v) => (etendue === 0 ? (r0 + r1) / 2 : r0 + ((v - d0) / etendue) * (r1 - r0))
}

const f = (v: number) => v.toFixed(1)

/**
 * Une courbe lisse qui ne dépasse jamais ses points (interpolation monotone de Fritsch et Carlson) :
 * une marée lissée ne doit pas inventer une pleine mer plus haute que la prévision.
 */
export function cheminMonotone(pts: readonly Point[]): string {
  const n = pts.length
  if (n === 0) return ''
  const premier = pts[0]!
  if (n === 1) return `M${f(premier.x)},${f(premier.y)}`

  const dx: number[] = []
  const pente: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    dx.push(b.x - a.x)
    pente.push((b.y - a.y) / (b.x - a.x || 1))
  }
  const t: number[] = new Array<number>(n).fill(0)
  t[0] = pente[0]!
  t[n - 1] = pente[n - 2]!
  for (let i = 1; i < n - 1; i++) {
    const g = pente[i - 1]!
    const d = pente[i]!
    t[i] = g * d <= 0 ? 0 : (g + d) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    const m = pente[i]!
    if (m === 0) {
      t[i] = 0
      t[i + 1] = 0
      continue
    }
    const a = t[i]! / m
    const b = t[i + 1]! / m
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      t[i] = k * a * m
      t[i + 1] = k * b * m
    }
  }

  const segments = [`M${f(premier.x)},${f(premier.y)}`]
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const h = dx[i]! / 3
    segments.push(
      `C${f(a.x + h)},${f(a.y + t[i]! * h)} ${f(b.x - h)},${f(b.y - t[i + 1]! * h)} ${f(b.x)},${f(b.y)}`,
    )
  }
  return segments.join(' ')
}

/* ------------------------------------------------------------------ */
/* Heures                                                              */
/* ------------------------------------------------------------------ */

const PARTIES_HEURE = new Intl.DateTimeFormat('fr-FR', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: 'Europe/Paris',
})
const JOUR_PARIS = new Intl.DateTimeFormat('fr-FR', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'Europe/Paris',
})
const DATE_LONGUE_PARIS = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Paris',
})

/** L'heure (0 à 23) à laquelle tombe un instant, à l'heure de la plage. */
export function heureDuJour(iso: string): number {
  const partie = PARTIES_HEURE.formatToParts(new Date(iso)).find((p) => p.type === 'hour')
  return partie ? Number(partie.value) : 0
}

const memeJour = (a: string, b: string) => JOUR_PARIS.format(new Date(a)) === JOUR_PARIS.format(new Date(b))

/** « lundi 23 novembre », à l'heure de la plage. */
export function dateLongueParis(iso: string): string {
  return DATE_LONGUE_PARIS.format(new Date(iso))
}

export interface Graduation {
  instant: string
  etiquette: string
  /** Minuit : la graduation porte aussi le nom du jour. */
  minuit: boolean
}

/** Les heures à graduer en haut de la courbe : une sur `pas`, alignée sur les heures rondes. */
export function graduationsHoraires(heures: readonly Heure[], pas: number): Graduation[] {
  return heures
    .filter((h) => heureDuJour(h.instant) % pas === 0)
    .map((h) => ({
      instant: h.instant,
      etiquette: `${heureDuJour(h.instant)}h`,
      minuit: heureDuJour(h.instant) === 0,
    }))
}

/** Le pas de graduation (en heures) qui garde au moins ~46 px entre deux étiquettes. */
export function pasDeGraduation(largeurUtile: number, nombreHeures: number): number {
  const parHeure = largeurUtile / Math.max(1, nombreHeures - 1)
  const minimal = 46 / Math.max(parHeure, 0.0001)
  return ([1, 2, 3, 6, 12, 24] as const).find((p) => p >= minimal) ?? 24
}

/** Le rang de l'heure la plus proche d'un instant (les prévisions sont horaires, mais rien n'oblige à le supposer). */
export function rangLePlusProche(instantsMs: readonly number[], cibleMs: number): number {
  let meilleur = 0
  let ecart = Infinity
  instantsMs.forEach((t, i) => {
    const e = Math.abs(t - cibleMs)
    if (e < ecart) {
      ecart = e
      meilleur = i
    }
  })
  return meilleur
}

/* ------------------------------------------------------------------ */
/* Danger                                                              */
/* ------------------------------------------------------------------ */

export interface PlageDanger {
  niveau: Niveau
  debutMs: number
  finMs: number
}

/** Les heures consécutives de même niveau, regroupées : c'est ce que dessine le ruban sous la courbe. */
export function plagesDeDanger(heures: readonly Heure[]): PlageDanger[] {
  const plages: PlageDanger[] = []
  heures.forEach((h, i) => {
    const debut = Date.parse(h.instant)
    const suivante = heures[i + 1]
    const fin = suivante ? Date.parse(suivante.instant) : debut + UNE_HEURE
    const derniere = plages.at(-1)
    if (derniere && derniere.niveau === h.danger) derniere.finMs = fin
    else plages.push({ niveau: h.danger, debutMs: debut, finMs: fin })
  })
  return plages
}

const iso = (ms: number) => new Date(ms).toISOString()

/** « 17h », ou « mar. 24 7h » quand le moment tombe un autre jour que `depart`. */
function momentCourt(instant: string, depart: string): string {
  return memeJour(instant, depart) ? heureCourte(instant) : `${jourCourt(instant)} ${heureCourte(instant)}`
}

/** La première heure, après `apresMs`, où le danger n'est plus `niveau` ; null si cela dure jusqu'au bout. */
export function finDuNiveau(heures: readonly Heure[], apresMs: number, niveau: Niveau): string | null {
  return heures.find((h) => Date.parse(h.instant) > apresMs && h.danger !== niveau)?.instant ?? null
}

/**
 * Combien de temps ça dure : « jusqu'à 17h », ou « sur les 47 h prévues » (« jusqu'à la fin des prévisions » s'il ne reste qu'une heure) quand le niveau tient
 * jusqu'au bout des prévisions (on dit alors ce que l'on sait, pas davantage). Vide à l'état noir.
 */
export function fenetreDeDanger(niveau: Niveau, heures: readonly Heure[], instant: string): string {
  if (niveau === 'noir') return 'NE PAS Y ALLER'
  const debut = Date.parse(instant)
  const fin = finDuNiveau(heures, debut, niveau)
  if (fin) return `jusqu’à ${momentCourt(fin, instant)}`
  const derniere = heures.at(-1)
  const restant = derniere ? Math.max(1, Math.round((Date.parse(derniere.instant) - debut) / UNE_HEURE)) : 0
  return restant > 1 ? `sur les ${restant} h prévues` : 'jusqu’à la fin des prévisions'
}

/** Le texte du tampon de danger : « VERT · jusqu'à 17h », « NOIR · NE PAS Y ALLER ». */
export function libelleDuTampon(niveau: Niveau, heures: readonly Heure[], instant: string): string {
  return `${NOM_DANGER[niveau]} · ${fenetreDeDanger(niveau, heures, instant)}`
}

/** Le ruban dit en phrase : « VERT jusqu'à 17h · ROUGE de 17h à 22h · VERT dès 22h ». */
export function phraseDeDanger(plages: readonly PlageDanger[]): string {
  const premiere = plages[0]
  if (!premiere) return ''
  const premierInstant = iso(premiere.debutMs)
  const heure = (ms: number) => momentCourt(iso(ms), premierInstant)
  if (plages.length === 1) return `${NOM_DANGER[premiere.niveau]} sur toute la période prévue`
  return plages
    .map((p, i) => {
      const nom = NOM_DANGER[p.niveau]
      if (i === 0) return `${nom} jusqu’à ${heure(p.finMs)}`
      if (i === plages.length - 1) return `${nom} dès ${heure(p.debutMs)}`
      return `${nom} de ${heure(p.debutMs)} à ${heure(p.finMs)}`
    })
    .join(' · ')
}

/* ------------------------------------------------------------------ */
/* Marées                                                              */
/* ------------------------------------------------------------------ */

/** La marée extrême la plus proche d'un instant : c'est elle qui donne le coefficient du moment. */
export function mareeProche(marees: readonly Maree[], instantMs: number): Maree | undefined {
  return marees.reduce<Maree | undefined>(
    (meilleure, m) =>
      !meilleure ||
      Math.abs(Date.parse(m.instant) - instantMs) < Math.abs(Date.parse(meilleure.instant) - instantMs)
        ? m
        : meilleure,
    undefined,
  )
}

/** La prochaine pleine mer et la prochaine basse mer à partir d'un instant (la dernière connue à défaut). */
export function prochainesMarees(marees: readonly Maree[], instantMs: number): { pm?: Maree; bm?: Maree } {
  const choisir = (type: Maree['type']) => {
    const duType = marees.filter((m) => m.type === type)
    return duType.find((m) => Date.parse(m.instant) >= instantMs) ?? duType.at(-1)
  }
  return { pm: choisir('PM'), bm: choisir('BM') }
}

/** Le plafond de la courbe : au moins 7 m, et toujours un mètre entier au-dessus de la plus haute eau. */
export function plafondDeHauteur(heures: readonly Heure[]): number {
  const hauteurs = heures.map((h) => h.hauteur_eau_m).filter((v): v is number => typeof v === 'number')
  return Math.max(7, Math.ceil(Math.max(0, ...hauteurs)))
}

/** Les paliers de teinte de l'eau, en mètres : 0–2, 2–5, au-delà. */
export const PALIERS_M = [2, 5] as const

/* ------------------------------------------------------------------ */
/* Profil de plage, tiré des prévisions                                */
/* ------------------------------------------------------------------ */

export interface PointDeProfil {
  /** Mètres de sable depuis le pied de la digue. */
  distance: number
  /** Altitude du sable en ce point, en mètres au-dessus du zéro des cartes. */
  hauteur: number
}

/**
 * La coupe de la plage, relevée dans les prévisions elles-mêmes : à chaque heure on sait où est
 * l'eau (hauteur d'eau) et combien de mètres de sable il faut parcourir pour l'atteindre. Chaque
 * heure est donc un point du profil du sable. Le profil descend toujours vers le large : un point
 * plus haut que celui qui le précède sur la plage est ramené à son niveau (une plateforme).
 * Sans au moins deux distances différentes, il n'y a pas de profil.
 */
export function profilDePlage(heures: readonly Heure[]): PointDeProfil[] {
  const brut = heures
    .filter(
      (h): h is Heure & { hauteur_eau_m: number; distance_eau_m: number } =>
        typeof h.hauteur_eau_m === 'number' && typeof h.distance_eau_m === 'number',
    )
    .map((h) => ({ distance: h.distance_eau_m, hauteur: h.hauteur_eau_m }))
    // À distance égale, on garde le point le plus haut (l'eau au pied de la digue : le plus haut des niveaux).
    .sort((a, b) => a.distance - b.distance || b.hauteur - a.hauteur)

  const profil: PointDeProfil[] = []
  for (const p of brut) {
    const dernier = profil.at(-1)
    if (dernier && dernier.distance === p.distance) continue
    profil.push({ distance: p.distance, hauteur: dernier ? Math.min(p.hauteur, dernier.hauteur) : p.hauteur })
  }
  return profil.length >= 2 ? profil : []
}

/** Où l'eau touche le sable (en mètres de sable depuis la digue) quand son niveau est `hauteur`. */
export function distanceAuNiveau(profil: readonly PointDeProfil[], hauteur: number): number {
  const premier = profil[0]
  const dernier = profil.at(-1)
  if (!premier || !dernier) return 0
  if (hauteur >= premier.hauteur) return premier.distance
  if (hauteur <= dernier.hauteur) return dernier.distance
  for (let i = 0; i < profil.length - 1; i++) {
    const a = profil[i]!
    const b = profil[i + 1]!
    if (hauteur <= a.hauteur && hauteur >= b.hauteur) {
      const ecart = a.hauteur - b.hauteur
      return ecart === 0
        ? a.distance
        : a.distance + ((a.hauteur - hauteur) / ecart) * (b.distance - a.distance)
    }
  }
  return dernier.distance
}

/** L'altitude du sable à une distance de la digue (aux extrémités du relevé, celle du dernier point). */
export function altitudeADistance(profil: readonly PointDeProfil[], distance: number): number {
  const premier = profil[0]
  const dernier = profil.at(-1)
  if (!premier || !dernier) return 0
  if (distance <= premier.distance) return premier.hauteur
  if (distance >= dernier.distance) return dernier.hauteur
  for (let i = 0; i < profil.length - 1; i++) {
    const a = profil[i]!
    const b = profil[i + 1]!
    if (distance >= a.distance && distance <= b.distance) {
      return a.hauteur + ((distance - a.distance) / (b.distance - a.distance)) * (b.hauteur - a.hauteur)
    }
  }
  return dernier.hauteur
}

export interface Isoligne {
  /** Hauteur d'eau au-dessus du sable, en mètres : 0,5 ; 1 ; 1,5… */
  profondeurM: number
  /** Où elle passe sur la plage, en mètres de sable depuis la digue. */
  distance: number
}

/**
 * Les isolignes de hauteur d'eau instantanée : la marée moins le relief, tous les demi-mètres.
 * Elles glissent sur la plage avec l'eau, contrairement aux altitudes du sable qui, elles, ne bougent pas.
 * On s'arrête où le relevé s'arrête : au-delà, ce serait deviner.
 */
export function isolignes(profil: readonly PointDeProfil[], hauteur: number, pas = 0.5): Isoligne[] {
  const dernier = profil.at(-1)
  if (!dernier) return []
  const bord = distanceAuNiveau(profil, hauteur)
  const lignes: Isoligne[] = []
  for (let k = 1; k <= 24; k++) {
    const profondeur = k * pas
    const altitude = hauteur - profondeur
    if (altitude < dernier.hauteur) break
    const distance = distanceAuNiveau(profil, altitude)
    if (distance > bord) lignes.push({ profondeurM: profondeur, distance })
  }
  return lignes
}

/** « 40 m » : une distance arrondie à 10 m, parce qu'un relevé de marée ne promet pas mieux. */
export function arrondirDistance(metres: number): number {
  return metres <= 0 ? 0 : Math.max(10, Math.round(metres / 10) * 10)
}

/** La distance à pied jusqu'à l'eau, en phrase. */
export function phraseDeDistance(metres: number | null | undefined): string | null {
  if (metres === null || metres === undefined) return null
  const d = arrondirDistance(metres)
  return d === 0 ? 'l’eau au pied de la digue' : `${nombre(d)} m de sable`
}

/* ------------------------------------------------------------------ */
/* Frange de houle                                                     */
/* ------------------------------------------------------------------ */

/** L'amplitude de la frange, en pixels : 0,8 m de vagues donnent environ 6 px, jamais moins de 1,5. */
export function amplitudeDeFrange(vaguesM: number | null | undefined): number {
  return Math.min(20, Math.max(1.5, (vaguesM ?? 0.3) * 7.5))
}

/**
 * Le rythme de la frange : une période de houle par tour, jamais plus vite que 0,2 Hz
 * (au plus un tour toutes les 5 s), loin de ce qui peut gêner.
 */
export function dureeDeFrange(periodeS: number | null | undefined): number {
  return Math.min(20, Math.max(5, periodeS ?? 7))
}

/** Le déplacement vertical de la frange à l'abscisse `x` : une somme d'harmoniques de la période, donc elle se raccorde. */
export function valeurDeFrange(x: number, amplitude: number, periode: number): number {
  const t = (2 * Math.PI * x) / periode
  return amplitude * (0.62 * Math.sin(t) + 0.28 * Math.sin(2 * t + 1.3) + 0.1 * Math.sin(3 * t + 2.1))
}

/** Le tracé de la frange sur `longueur` px, plus une période pour que le glissement ne montre jamais de bord. */
export function cheminDeFrange(longueur: number, amplitude: number, periode: number): string {
  const pas = periode / 20
  const morceaux: string[] = []
  for (let x = 0; x <= longueur + periode + pas; x += pas) {
    morceaux.push(`${f(x)},${f(valeurDeFrange(x, amplitude, periode))}`)
  }
  return `M${morceaux.join(' L')}`
}

/* ------------------------------------------------------------------ */
/* Phrases et valeurs de la page                                       */
/* ------------------------------------------------------------------ */

const DEGRES = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 })

/** « 49,276° N · 0,257° O » : la position du spot au millième de degré (une centaine de mètres). */
export function coordonnees(latitude: number, longitude: number): string {
  const degres = (v: number) => DEGRES.format(Math.abs(v))
  return `${degres(latitude)}° ${latitude >= 0 ? 'N' : 'S'} · ${degres(longitude)}° ${longitude >= 0 ? 'E' : 'O'}`
}

/** Où se place l'eau sur la règle de température, de 0 (0 °C) à 1 (25 °C). */
export function fractionDeRegle(eauC: number | null | undefined, maxC = 25): number {
  return eauC === null || eauC === undefined ? 0 : Math.min(1, Math.max(0, eauC / maxC))
}

/** La règle de température, en une phrase pour qui ne la voit pas. */
export function phraseDeRegle(eauC: number | null | undefined): string {
  if (eauC === null || eauC === undefined) return 'Température de l’eau inconnue.'
  const sens = eauC < 15 ? 'sous le' : 'au-dessus du'
  return `Eau à ${nombre(Number(eauC.toFixed(1)))} °C, ${sens} seuil de choc thermique de 15 °C.`
}

interface DureesFroides {
  conseille_min: number | null
  maximum_min: number | null
}

/** « 25 min conseillées · 40 max » : les durées en eau froide données par l'assistant. */
export function phraseDeDuree(durees: DureesFroides | null | undefined): string | null {
  if (!durees || durees.conseille_min === null) return null
  const conseillees = `${nombre(durees.conseille_min)} min conseillées`
  return durees.maximum_min === null ? conseillees : `${conseillees} · ${nombre(durees.maximum_min)} max`
}

/** La ligne sous le verdict : « VERT jusqu'à 17h · eau 12 °C · 25 min conseillées ». */
export function ligneDeVerdict(conditions: Conditions, durees: DureesFroides | null | undefined): string[] {
  const m = conditions.maintenant
  const niveau = conditions.danger.niveau
  const danger =
    niveau === 'noir'
      ? libelleDuTampon(niveau, conditions.heures, m.instant)
      : `${NOM_DANGER[niveau]} ${fenetreDeDanger(niveau, conditions.heures, m.instant)}`
  const eau =
    m.eau_c === null || m.eau_c === undefined ? null : `eau ${nombre(Number(m.eau_c.toFixed(1)))} °C`
  return [danger, eau, phraseDeDuree(durees)].filter((p): p is string => p !== null)
}
