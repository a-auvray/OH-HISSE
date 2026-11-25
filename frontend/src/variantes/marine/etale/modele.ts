import type { Conditions } from '../../../api/types'

/*
 * Le modèle de « L'Étale » : tout ce qui se calcule sans DOM. La page montre la plage en coupe ;
 * ces fonctions disent où est le sable, où est l'eau, vers où file le courant et d'où vient le vent.
 * Rien n'est écrit à la main : tout sort des conditions que renvoie l'API (heure par heure).
 */

export type Heure = Conditions['heures'][number]
export type Maree = Conditions['marees'][number]
export type Soleil = Conditions['soleil'][number]
export type Niveau = Heure['danger']

const HEURE_MS = 3_600_000

/*
 * Les règles de la côte, recopiées de `backend/app/moteurs/regles/marine.toml` : l'API ne les expose pas,
 * et la page doit nommer le vent et le courant comme le fait le moteur de danger.
 */
/** Cap vers le large : les plages regardent la mer vers le nord. */
export const CAP_LARGE_DEG = 0
/** Un vent venant du sud, à ± 67,5°, souffle vers le large. */
export const DEMI_SECTEUR_TERRE_DEG = 67.5
/** L'axe de la côte pointe vers l'est : c'est le long de lui que file le courant de marée. */
export const AXE_EST_DEG = 90
/** Sous cette vitesse, le courant est « faible » : c'est l'étale. */
export const SEUIL_ETALE_KMH = 0.3
/** Seuils de température de l'eau : choc thermique, danger rouge, danger noir. */
export const SEUILS_EAU = { choc: 15, rouge: 8, noir: 5 } as const
/** La règle graduée de l'eau va de 0 à 25 °C. */
export const ECHELLE_EAU_MAX = 25
/** Vitesse de marche sur le sable, pour dire « ≈ 3 min à pied ». */
export const MARCHE_KMH = 4

const rad = (degres: number) => (degres * Math.PI) / 180
const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const ms = (iso: string) => new Date(iso).getTime()
const fini = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v)

// ───────────────────────────── Le profil de la plage ─────────────────────────────

/** Un point de la coupe : à `d` mètres du pied de la digue, le sable est à `h` mètres (hauteur de marée). */
export interface PointProfil {
  d: number
  h: number
}

/**
 * Le profil de l'estran. Il n'est pas inventé : chaque heure de prévision donne une hauteur d'eau et la
 * distance de sable jusqu'à l'eau, donc un point où le bord de l'eau touche le sable.
 * `points[0]` est le pied de la digue (d = 0) ; les points suivants s'éloignent vers le large et descendent.
 */
export interface ProfilEstran {
  points: readonly PointProfil[]
}

/**
 * Reconstitue le profil à partir des heures. Rend null quand aucune heure ne donne une distance
 * (le sable est alors inconnu : la page dessine l'eau seule et le dit).
 */
export function profilEstran(heures: readonly Heure[]): ProfilEstran | null {
  const mesures = heures.flatMap((h) =>
    fini(h.hauteur_eau_m) && fini(h.distance_eau_m) ? [{ d: h.distance_eau_m, h: h.hauteur_eau_m }] : [],
  )
  const auPied = mesures.filter((m) => m.d <= 0).map((m) => m.h)
  const loin = mesures.filter((m) => m.d > 0).sort((a, b) => a.d - b.d)
  if (loin.length === 0) return null

  // Deux relevés à la même distance donnent un seul point (leur moyenne).
  const fusion: PointProfil[] = []
  for (const p of loin) {
    const dernier = fusion.at(-1)
    if (dernier && Math.abs(dernier.d - p.d) < 0.5)
      fusion[fusion.length - 1] = { d: dernier.d, h: (dernier.h + p.h) / 2 }
    else fusion.push(p)
  }
  // Le sable ne remonte jamais en s'éloignant de la digue : un relevé bruité est aplati.
  let plafond = Infinity
  const descendant = fusion.map((p) => {
    plafond = Math.min(plafond, p.h)
    return { d: p.d, h: plafond }
  })
  const premier = descendant[0]!
  // Quand l'eau a touché la digue, la plus basse de ces hauteurs borne le pied ; sinon on l'estime juste au-dessus du premier relevé.
  const pied = Math.max(auPied.length > 0 ? Math.min(...auPied) : premier.h + 0.3, premier.h)
  return { points: [{ d: 0, h: pied }, ...descendant] }
}

/** Pente (en mètres de hauteur par mètre de distance) du dernier tronçon mesuré. */
function penteDuLarge(profil: ProfilEstran): number {
  const [a, b] = profil.points.slice(-2) as [PointProfil, PointProfil]
  return b.d > a.d ? Math.max(0, (a.h - b.h) / (b.d - a.d)) : 0
}

/** Hauteur du sable à `d` mètres de la digue ; au-delà du dernier relevé, la dernière pente se prolonge. */
export function hauteurA(profil: ProfilEstran, d: number): number {
  const pts = profil.points
  if (d <= 0) return pts[0]!.h
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    if (d <= b.d) return a.h + ((b.h - a.h) * (d - a.d)) / (b.d - a.d)
  }
  const dernier = pts.at(-1)!
  return dernier.h - penteDuLarge(profil) * (d - dernier.d)
}

/** Distance de sable jusqu'à l'eau quand elle est à la hauteur `h` : 0 si elle touche la digue. */
export function distanceA(profil: ProfilEstran, h: number): number {
  const pts = profil.points
  if (h >= pts[0]!.h) return 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    if (h >= b.h) return a.d + ((a.h - h) / (a.h - b.h)) * (b.d - a.d)
  }
  const dernier = pts.at(-1)!
  const pente = penteDuLarge(profil)
  return pente > 1e-6 ? dernier.d + (dernier.h - h) / pente : dernier.d
}

/** Minutes de marche pour `d` mètres, au moins 1 dès qu'il y a de la distance. */
export function minutesDeMarche(d: number): number {
  return d <= 0 ? 0 : Math.max(1, Math.round(d / ((MARCHE_KMH * 1000) / 60)))
}

/** Le bord de l'eau l'heure d'avant et maintenant : la part du sable que la mer vient de laisser, mouillée. */
export function sableMouille(heures: readonly Heure[], rang: number): { de: number; a: number } | null {
  const avant = heures[rang - 1]?.distance_eau_m
  const ici = heures[rang]?.distance_eau_m
  if (!fini(avant) || !fini(ici) || ici - avant < 1) return null
  return { de: avant, a: ici }
}

// ───────────────────────────── La géométrie de la coupe ─────────────────────────────

export interface Pt {
  x: number
  y: number
}

export interface Geometrie {
  largeur: number
  hauteur: number
  /** Bord gauche du plan (la dune est à gauche, le pied de digue à `x(0)`). */
  gauche: number
  droite: number
  haut: number
  bas: number
  /** Distance affichée au bord droit, en mètres. */
  dMax: number
  zMin: number
  zMax: number
  /** Rapport entre l'échelle verticale et l'échelle horizontale, à écrire dans un coin. */
  exageration: number
  x: (d: number) => number
  y: (z: number) => number
}

const PAS = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000] as const

/** Le pas de graduation le plus fin qui laisse au plus 7 repères sur `dMax` mètres. */
export function pasGraduation(dMax: number): number {
  return PAS.find((p) => dMax / p <= 7) ?? PAS.at(-1)!
}

/** Les distances graduées : 0, pas, 2·pas… jusqu'à `dMax`. */
export function reperesDistance(dMax: number): number[] {
  const pas = pasGraduation(dMax)
  return Array.from({ length: Math.floor(dMax / pas) + 1 }, (_, i) => i * pas)
}

export interface EntreeGeometrie {
  largeur: number
  hauteur: number
  profil: ProfilEstran | null
  /** Toutes les hauteurs d'eau à montrer (la marée des 48 heures). */
  niveaux: readonly number[]
}

/** Place la plage dans le cadre : l'eau la plus haute et le sable le plus bas doivent y entrer, avec de l'air au-dessus. */
export function geometrie({ largeur, hauteur, profil, niveaux }: EntreeGeometrie): Geometrie {
  const gauche = borner(largeur * 0.09, 28, 72)
  const droite = Math.max(gauche + 40, largeur - 12)
  const haut = 12
  const bas = Math.max(haut + 60, hauteur - 30)

  const valides = niveaux.filter(fini)
  const pied = profil?.points[0]?.h ?? -Infinity
  const plusHaut = Math.max(pied, ...valides, valides.length === 0 && !profil ? 8 : -Infinity)
  const plusBas = Math.min(
    profil?.points.at(-1)?.h ?? Infinity,
    ...valides,
    valides.length === 0 && !profil ? 0 : Infinity,
  )
  const zMax = plusHaut + 1
  const zMin = plusBas - 1.4

  const brut = Math.max(60, (profil?.points.at(-1)?.d ?? 0) * 1.1)
  const pas = pasGraduation(brut)
  const dMax = Math.ceil(brut / pas) * pas

  const pxH = (droite - gauche) / dMax
  const pxV = (bas - haut) / (zMax - zMin)
  return {
    largeur,
    hauteur,
    gauche,
    droite,
    haut,
    bas,
    dMax,
    zMin,
    zMax,
    exageration: Math.max(1, Math.round(pxV / pxH)),
    x: (d) => gauche + d * pxH,
    y: (z) => haut + (zMax - z) * pxV,
  }
}

/** Le tracé du profil en pixels : la partie mesurée, puis son prolongement jusqu'au bord droit. */
export function trace(geo: Geometrie, profil: ProfilEstran): { mesure: Pt[]; prolonge: Pt[] } {
  const mesure = profil.points.map((p) => ({ x: geo.x(p.d), y: geo.y(p.h) }))
  const dernier = profil.points.at(-1)!
  const plancher = geo.zMin + 0.25
  const zFin = Math.max(plancher, hauteurA(profil, geo.dMax))
  const dFin =
    zFin > plancher ? geo.dMax : Math.min(geo.dMax, Math.max(dernier.d, distanceA(profil, plancher)))
  const prolonge: Pt[] = [mesure.at(-1)!, { x: geo.x(dFin), y: geo.y(zFin) }]
  if (dFin < geo.dMax) prolonge.push({ x: geo.x(geo.dMax), y: geo.y(zFin) })
  return { mesure, prolonge }
}

/** Le sable et la dune en un polygone fermé, du coin bas gauche au coin bas droit. */
export function polygoneSable(geo: Geometrie, profil: ProfilEstran | null): Pt[] {
  const pied = profil?.points[0]?.h ?? geo.zMax - 1
  const base: Pt[] = [
    { x: 0, y: geo.bas },
    { x: 0, y: geo.haut + 6 },
    // La dune monte à gauche en deux paliers adoucis : un décor, qui ne dit rien de la donnée.
    { x: geo.gauche * 0.45, y: geo.haut + (geo.y(pied) - geo.haut) * 0.35 },
    { x: geo.gauche * 0.8, y: geo.y(pied) - 4 },
    { x: geo.x(0), y: geo.y(pied) },
  ]
  if (!profil) return [...base, { x: geo.x(0), y: geo.bas }]
  const { mesure, prolonge } = trace(geo, profil)
  return [...base, ...mesure.slice(1), ...prolonge.slice(1), { x: geo.droite, y: geo.bas }]
}

/** Courbe lisse (Catmull-Rom convertie en Bézier) passant par tous les points : la courbe de marée. */
export function cheminLisse(points: readonly Pt[]): string {
  if (points.length === 0) return ''
  const f = (v: number) => v.toFixed(1)
  let chemin = `M${f(points[0]!.x)},${f(points[0]!.y)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    chemin += ` C${f(p1.x + (p2.x - p0.x) / 6)},${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)},${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)},${f(p2.y)}`
  }
  return chemin
}

// ───────────────────────────── Le vent, le courant, la houle ─────────────────────────────

export type SensVent = 'terre' | 'mer' | 'cote'

/** D'où vient le vent par rapport à la plage : de la terre (il pousse au large), de la mer, ou le long de la côte. */
export function sensVent(provenanceDeg: number): SensVent {
  const ecart = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180)
  if (ecart(provenanceDeg, CAP_LARGE_DEG + 180) <= DEMI_SECTEUR_TERRE_DEG) return 'terre'
  if (ecart(provenanceDeg, CAP_LARGE_DEG) <= DEMI_SECTEUR_TERRE_DEG) return 'mer'
  return 'cote'
}

/** Vitesse du vent vers le large (positive : il pousse l'eau hors de la plage, négative : vers la plage). */
export function ventVersLarge(kmh: number, provenanceDeg: number): number {
  return kmh * Math.cos(rad(provenanceDeg + 180 - CAP_LARGE_DEG))
}

/** Vitesse du courant le long de la côte, vers l'est (négative : vers l'ouest). `directionDeg` est la direction vers où il va. */
export function courantVersEst(kmh: number, directionDeg: number): number {
  return kmh * Math.cos(rad(directionDeg - AXE_EST_DEG))
}

export function estEtale(courantKmh: number | null | undefined): boolean {
  return fini(courantKmh) && courantKmh <= SEUIL_ETALE_KMH
}

/** Flot (la mer monte) ou jusant (elle descend) à l'heure `rang`, d'après la hauteur d'eau de l'heure suivante. */
export function tendanceA(
  heures: readonly Heure[],
  rang: number,
): 'montante' | 'descendante' | 'etale' | null {
  const ici = heures[rang]?.hauteur_eau_m
  const apres = heures[rang + 1]?.hauteur_eau_m
  const avant = heures[rang - 1]?.hauteur_eau_m
  const [a, b] =
    fini(ici) && fini(apres) ? [ici, apres] : fini(ici) && fini(avant) ? [avant, ici] : [null, null]
  if (a === null || b === null) return null
  if (Math.abs(b - a) < 0.05) return 'etale'
  return b > a ? 'montante' : 'descendante'
}

/** La houle telle qu'on la dessine : amplitude plafonnée (mal de mer) et fréquence d'au plus 0,2 Hz. */
export function houleVisuelle(
  vaguesM: number | null | undefined,
  periodeS: number | null | undefined,
): { amplitudePx: number; frequenceHz: number } {
  return {
    amplitudePx: fini(vaguesM) ? borner(vaguesM * 5, 0.6, 6) : 0.6,
    frequenceHz: fini(periodeS) && periodeS > 0 ? Math.min(0.2, 1 / periodeS) : 0.12,
  }
}

/**
 * L'émoussé des titres (axe SOFT de Fraunces) : la mer plate garde des empattements nets, une houle
 * de 0,8 m les adoucit (40), une houle de 2 m ou plus les roule tout à fait (100).
 */
export function souplesse(vaguesM: number | null | undefined): number {
  return fini(vaguesM) ? Math.round(borner(vaguesM * 50, 0, 100)) : 0
}

/** On ne réécrit la police que si l'écart dépasse 2 unités : sinon le titre reste tel quel. */
export function souplesseRetenue(precedente: number, cible: number): number {
  return Math.abs(cible - precedente) > 2 ? cible : precedente
}

// ───────────────────────────── Les particules du courant ─────────────────────────────

/** Une particule : sa place (0 à 1) sur la largeur, sa profondeur sous la surface, et sa position dans la profondeur de la coupe. */
export interface Particule {
  x: number
  y: number
  z: number
}

/** Générateur pseudo-aléatoire à graine : la même scène se dessine de la même façon à chaque fois. */
export function aleatoire(graine: number): () => number {
  let etat = graine >>> 0
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0
    let t = etat
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function creerParticules(nombre: number, graine = 7): Particule[] {
  const hasard = aleatoire(graine)
  return Array.from({ length: nombre }, () => ({ x: hasard(), y: hasard(), z: hasard() }))
}

/** Vitesse dans la profondeur (unités de z par seconde) : le courant vers l'est éloigne, vers l'ouest rapproche. */
export function vitesseProfondeur(courantEstKmh: number): number {
  return borner(courantEstKmh, -6, 6) * 0.03
}

/** Fait avancer une particule dans la profondeur ; à la sortie elle revient de l'autre côté, à une nouvelle place. */
export function avancer(p: Particule, vz: number, dt: number, hasard: () => number): Particule {
  const z = p.z + vz * dt
  if (z >= 0 && z <= 1) return { ...p, z }
  return { x: hasard(), y: hasard(), z: z > 1 ? 0 : 1 }
}

/** Opacité d'une particule : pâle au loin, et fondue aux deux bouts pour ne jamais apparaître d'un coup. */
export function opaciteParticule(z: number): number {
  return (1 - 0.8 * z) * Math.min(1, z / 0.12, (1 - z) / 0.12)
}

/** Rayon d'une particule, en pixels : plus petite quand elle s'éloigne. */
export function rayonParticule(z: number): number {
  return 2.4 - 1.7 * z
}

// ───────────────────────────── Le temps : nuit, bascule, créneau ─────────────────────────────

/** Les nuits connues entre `t0` et `t1` (en millisecondes), d'après les levers et couchers du soleil. */
export function intervallesNuit(
  soleil: readonly Soleil[],
  t0: number,
  t1: number,
): { debut: number; fin: number }[] {
  const jours = soleil
    .map((s) => ({ lever: ms(s.lever), coucher: ms(s.coucher) }))
    .sort((a, b) => a.lever - b.lever)
  if (jours.length === 0) return []
  const nuits = [{ debut: jours[0]!.lever - 16 * HEURE_MS, fin: jours[0]!.lever }]
  for (let i = 0; i < jours.length - 1; i++)
    nuits.push({ debut: jours[i]!.coucher, fin: jours[i + 1]!.lever })
  const dernier = jours.at(-1)!
  // Après le dernier coucher connu, la nuit ne dure pas plus de 16 h : au-delà, on ignore le lever suivant.
  nuits.push({ debut: dernier.coucher, fin: dernier.coucher + 16 * HEURE_MS })
  return nuits
    .map((n) => ({ debut: Math.max(n.debut, t0), fin: Math.min(n.fin, t1) }))
    .filter((n) => n.fin > n.debut)
}

export function estDeNuit(soleil: readonly Soleil[], instant: number): boolean {
  return intervallesNuit(soleil, instant, instant + 1).length > 0
}

/** Le prochain coucher du soleil après `instant`, ou null. */
export function prochainCoucher(soleil: readonly Soleil[], instant: number): string | null {
  const suivants = soleil.filter((s) => ms(s.coucher) > instant).sort((a, b) => ms(a.coucher) - ms(b.coucher))
  return suivants[0]?.coucher ?? null
}

/** La première heure, après l'heure `rang`, où le niveau de danger n'est plus le même. */
export function basculeDanger(heures: readonly Heure[], rang: number): { rang: number; heure: Heure } | null {
  const courant = heures[rang]?.danger
  if (!courant) return null
  for (let i = rang + 1; i < heures.length; i++) {
    const h = heures[i]!
    if (h.danger !== courant) return { rang: i, heure: h }
  }
  return null
}

/** Y a-t-il une heure d'étale dans la fenêtre du créneau ? On rend la plus calme. */
export function etaleDansCreneau(
  heures: readonly Heure[],
  creneau: { debut: string; fin: string } | null,
): Heure | null {
  if (!creneau) return null
  const [d, f] = [ms(creneau.debut), ms(creneau.fin)]
  const calmes = heures.filter(
    (h) => ms(h.instant) >= d - 30 * 60_000 && ms(h.instant) <= f && estEtale(h.courant_kmh),
  )
  return calmes.sort((a, b) => (a.courant_kmh ?? 0) - (b.courant_kmh ?? 0))[0] ?? null
}

/** Le rang de l'heure la plus proche de `instant` (en millisecondes). */
export function rangProche(heures: readonly Heure[], instant: number): number {
  let meilleur = 0
  heures.forEach((h, i) => {
    if (Math.abs(ms(h.instant) - instant) < Math.abs(ms(heures[meilleur]!.instant) - instant)) meilleur = i
  })
  return meilleur
}

/** Les marées extrêmes les plus proches de `instant`, avec la prochaine pleine mer après lui. */
export function pleineMerSuivante(marees: readonly Maree[], instant: number): Maree | null {
  return (
    marees
      .filter((m) => m.type === 'PM' && ms(m.instant) > instant)
      .sort((a, b) => ms(a.instant) - ms(b.instant))[0] ?? null
  )
}

/** La marée extrême (PM ou BM) la plus proche de l'instant, pour lire son coefficient. */
export function mareeProche(marees: readonly Maree[], instant: number): Maree | null {
  return marees.reduce<Maree | null>(
    (m, x) => (!m || Math.abs(ms(x.instant) - instant) < Math.abs(ms(m.instant) - instant) ? x : m),
    null,
  )
}

// ───────────────────────────── La couleur : contraste et ton ─────────────────────────────

/** « #rgb », « #rrggbb » ou « rgb(…) » → [r, g, b] de 0 à 255, ou null. */
export function lireCouleur(texte: string): [number, number, number] | null {
  const t = texte.trim().toLowerCase()
  const court = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(t)
  if (court) return [1, 2, 3].map((i) => parseInt(court[i]!.repeat(2), 16)) as [number, number, number]
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/.exec(t)
  if (long) return [1, 2, 3].map((i) => parseInt(long[i]!, 16)) as [number, number, number]
  const rgb = /^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/.exec(t)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  return null
}

/** Luminance relative WCAG, de 0 (noir) à 1 (blanc). */
export function luminance([r, v, b]: readonly [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(v) + 0.0722 * lin(b)
}

/** Rapport de contraste WCAG entre deux couleurs (de 1 à 21). */
export function contraste(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (clair + 0.05) / (sombre + 0.05)
}

/** Un fond est-il clair ? Sert à choisir l'encre du sable, qui doit se voir sur le papier comme sur l'ardoise. */
export function estClair(fond: string): boolean | null {
  const rgb = lireCouleur(fond)
  return rgb ? luminance(rgb) > 0.4 : null
}

/*
 * Les encres qui font partie de la donnée : elles ne changent pas avec le thème.
 * Le badge de danger est posé sur un disque sombre (le « scrim ») : ses couleurs gardent
 * ainsi le même contraste sur fond clair et sur fond sombre (vérifié dans modele.test.ts).
 */
export const ENCRES = {
  danger: { vert: '#2fd67b', rouge: '#ff4a3d', noir: '#050505' },
  scrim: '#0d1a21',
  lisere: '#efe9dd',
  /** Le sable : plus profond sur un fond clair pour garder 3:1, plus pâle sur un fond sombre. */
  sable: { clair: '#7d6a45', sombre: '#b8a27c' },
  /** La turbidité du danger rouge (limon) et la teinte de la nuit. */
  limon: '#5a5236',
  nuit: '#0b1530',
} as const
