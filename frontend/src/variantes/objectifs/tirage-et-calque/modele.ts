import type { BlocLu, ObjectifLu, PointEvolution } from '../../../api/types'

/*
 * Le modèle de « Tirage et Calque » : des fonctions pures, sans DOM, qui transforment un
 * objectif et son historique d'e1RM en ce que la planche montre. Rien n'est écrit à la main :
 * tout vient de l'objectif (cible, échéance, progression), des points d'évolution et des blocs
 * rattachés, tels que l'API les donne.
 *
 * Deux choix, faute d'un « départ » stocké dans l'objectif :
 *  - le sol de l'élévation est le lest nul (0 kg), comme le pourcentage de l'API
 *    (e1RM / cible) : la hauteur franchie sur la hauteur totale est donc exactement ce pourcentage ;
 *  - le plan est la droite qui va du premier e1RM relevé à la cible, à l'échéance. S'il y a moins
 *    de deux relevés, il n'y a pas de plan, et la planche le dit au lieu de l'inventer.
 */

/** Un écart de ce nombre de jours ou moins sur le plan reste « dans les temps ». */
export const SEUIL_JOURS = 7

const MS_PAR_JOUR = 86_400_000

/** Date ISO (AAAA-MM-JJ) → numéro de jour, sans heure : les écarts en jours sont exacts, hors fuseau. */
export function jourDe(iso: string): number {
  return Math.round(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / MS_PAR_JOUR)
}

export function isoDe(jour: number): string {
  return new Date(jour * MS_PAR_JOUR).toISOString().slice(0, 10)
}

const DECIMAL = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const ENTIER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/** 41.5 → « 41,5 » */
export function decimal(valeur: number): string {
  return DECIMAL.format(valeur)
}

/** Avec son signe typographique : « +1,0 », « −1,3 ». */
export function signe(valeur: number, format: (v: number) => string = decimal): string {
  return `${valeur < 0 ? '−' : '+'}${format(Math.abs(valeur))}`
}

export function signeEntier(valeur: number): string {
  return signe(valeur, (v) => ENTIER.format(v))
}

/** « 15.03.2027 » : le format des cotes de la planche. */
export function dateCompacte(iso: string): string {
  const [annee, mois, jour] = iso.slice(0, 10).split('-')
  return `${jour}.${mois}.${annee}`
}

/** « 04.01 » */
export function dateBreve(iso: string): string {
  return dateCompacte(iso).slice(0, 5)
}

const DATE_PARLEE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** « 15 mars 2027 », pour les lecteurs d'écran. */
export function dateParlee(iso: string): string {
  return DATE_PARLEE.format(new Date(`${iso.slice(0, 10)}T12:00:00`))
}

/** « NIV. +40,0 » : la charge d'une limite d'assise. */
export function niveau(kg: number): string {
  return `NIV. +${decimal(kg)}`
}

/* ---------- Historique ---------- */

export interface PointE1rm {
  jour: number
  date: string
  e1rm: number
}

/** Les e1RM lestés de l'historique, du plus ancien au plus récent, un seul par jour (le meilleur). */
export function pointsE1rm(evolution: readonly PointEvolution[]): PointE1rm[] {
  const parJour = new Map<number, PointE1rm>()
  for (const p of evolution) {
    if (p.e1rm_lest_kg === null || !Number.isFinite(p.e1rm_lest_kg)) continue
    const jour = jourDe(p.date)
    const deja = parJour.get(jour)
    if (!deja || p.e1rm_lest_kg > deja.e1rm) parJour.set(jour, { jour, date: p.date, e1rm: p.e1rm_lest_kg })
  }
  return [...parJour.values()].sort((a, b) => a.jour - b.jour)
}

/** Le plus haut e1RM atteint à chaque relevé : la hauteur de sédiment déjà posée. */
export function records(points: readonly PointE1rm[]): PointE1rm[] {
  const resultat: PointE1rm[] = []
  let max = -Infinity
  for (const p of points) {
    if (p.e1rm > max) {
      max = p.e1rm
      resultat.push(p)
    }
  }
  return resultat
}

/* ---------- Blocs ---------- */

export type TypeBloc = BlocLu['type']

export const LIBELLE_TYPE: Readonly<Record<TypeBloc, string>> = {
  force: 'Force',
  volume: 'Volume',
  deload: 'Décharge',
  specifique: 'Spécifique',
}

export interface BlocPlanche {
  id: number
  nom: string
  type: TypeBloc
  /** B1, B2… dans l'ordre des débuts. */
  repere: string
  debut: number
  fin: number | null
  dateDebut: string
  dateFin: string | null
}

/** Les blocs rattachés à un objectif, dans l'ordre où ils commencent. */
export function blocsPlanche(blocs: readonly BlocLu[], objectifId: number): BlocPlanche[] {
  return blocs
    .filter((b) => b.objectif_id === objectifId)
    .sort((a, b) => a.debut.localeCompare(b.debut))
    .map((b, i) => ({
      id: b.id,
      nom: b.nom,
      type: b.type,
      repere: `B${i + 1}`,
      debut: jourDe(b.debut),
      fin: b.fin ? jourDe(b.fin) : null,
      dateDebut: b.debut,
      dateFin: b.fin,
    }))
}

/** Le bloc en cours un jour donné, s'il y en a un. */
export function blocLe(blocs: readonly BlocPlanche[], jour: number): BlocPlanche | null {
  return blocs.find((b) => b.debut <= jour && (b.fin === null || jour <= b.fin)) ?? null
}

/* ---------- Assises ---------- */

/**
 * L'épaisseur d'une assise : 2,5 kg, comme les disques, tant que la cible en donne une quarantaine
 * au plus. Au-delà, on double pour que les assises restent lisibles.
 */
export function pasAssise(sommet: number): number {
  if (sommet / 2.5 <= 40) return 2.5
  if (sommet / 5 <= 40) return 5
  return 10
}

export interface Assise {
  /** Charges de la limite basse et de la limite haute, en kg : des multiples absolus du pas. */
  bas: number
  haut: number
  /** Part de l'assise déjà franchie, de 0 à 1 : seule l'assise en cours est partielle. */
  part: number
}

/**
 * Les assises de 0 au sommet, calées sur les multiples absolus du pas (pour que « NIV. +40,0 »
 * soit une vraie charge) ; la dernière est partielle si le sommet n'est pas un multiple.
 */
export function assises(sommet: number, e1rm: number, pas: number): Assise[] {
  const liste: Assise[] = []
  for (let k = 0; k * pas < sommet - 1e-9; k += 1) {
    const bas = k * pas
    const haut = Math.min(sommet, bas + pas)
    liste.push({ bas, haut, part: Math.max(0, Math.min(1, (e1rm - bas) / (haut - bas))) })
  }
  return liste
}

/** Le prochain multiple du pas au-dessus de l'e1RM (ou la cible, si elle vient avant), et ce qu'il reste. */
export function prochainPalier(
  e1rm: number,
  cible: number,
  pas: number,
): { niveau: number; reste: number } | null {
  if (e1rm >= cible) return null
  const multiple = (Math.floor(e1rm / pas + 1e-9) + 1) * pas
  const palier = Math.min(multiple, cible)
  return { niveau: palier, reste: palier - e1rm }
}

/** Le premier jour où l'e1RM a atteint un seuil, ou null s'il ne l'a jamais atteint. */
export function jourDeFranchissement(points: readonly PointE1rm[], seuil: number): number | null {
  return points.find((p) => p.e1rm >= seuil - 1e-9)?.jour ?? null
}

/* ---------- Plan, écart et rythme ---------- */

export interface PlanLineaire {
  jour0: number
  valeur0: number
  jourFin: number
  valeurFin: number
  /** kg par jour. */
  pente: number
}

/**
 * Le plan de référence : la droite du premier e1RM relevé à la cible, à l'échéance. Il faut au
 * moins deux relevés, une échéance à venir par rapport au premier, et une cible au-dessus du départ.
 */
export function planLineaire(
  points: readonly PointE1rm[],
  cible: number,
  jourEcheance: number,
): PlanLineaire | null {
  const premier = points[0]
  if (!premier || points.length < 2) return null
  if (jourEcheance <= premier.jour || cible <= premier.e1rm) return null
  return {
    jour0: premier.jour,
    valeur0: premier.e1rm,
    jourFin: jourEcheance,
    valeurFin: cible,
    pente: (cible - premier.e1rm) / (jourEcheance - premier.jour),
  }
}

export function valeurDuPlan(plan: PlanLineaire, jour: number): number {
  return plan.valeur0 + plan.pente * (Math.max(jour, plan.jour0) - plan.jour0)
}

export interface Ecart {
  /** Positif : en avance sur le plan ; négatif : en retard. */
  kg: number
  /** Positif : en retard (le plan avait déjà atteint ce niveau il y a tant de jours) ; négatif : en avance. */
  jours: number
}

/** L'écart du jour au plan : la distance du point réel à la droite, en kg et en jours. */
export function ecartAuPlan(plan: PlanLineaire, jour: number, e1rm: number): Ecart {
  const kg = e1rm - valeurDuPlan(plan, jour)
  return { kg, jours: Math.round(-kg / plan.pente) }
}

/** L'écart en jours que représente un écart en kg, sur la pente du plan. */
export function joursDeEcart(plan: PlanLineaire, kg: number): number {
  return kg / plan.pente
}

/**
 * Le rythme réel, en kg par jour : la pente d'une droite ajustée (moindres carrés) sur les relevés
 * des six dernières semaines. Il faut deux relevés au moins, éloignés d'une semaine.
 */
export function rythme(points: readonly PointE1rm[], jourRef: number): number | null {
  const recents = points.filter((p) => p.jour > jourRef - 42 && p.jour <= jourRef)
  if (recents.length < 2) return null
  const premier = recents[0]!.jour
  if (recents.at(-1)!.jour - premier < 7) return null
  const n = recents.length
  const mx = recents.reduce((s, p) => s + (p.jour - premier), 0) / n
  const my = recents.reduce((s, p) => s + p.e1rm, 0) / n
  const sxx = recents.reduce((s, p) => s + (p.jour - premier - mx) ** 2, 0)
  if (sxx === 0) return null
  return recents.reduce((s, p) => s + (p.jour - premier - mx) * (p.e1rm - my), 0) / sxx
}

/** Le rythme qu'il faudrait tenir pour arriver à la cible à l'échéance, en kg par jour. */
export function rythmeRequis(e1rm: number, cible: number, joursRestants: number): number | null {
  if (joursRestants <= 0 || e1rm >= cible) return null
  return (cible - e1rm) / joursRestants
}

/** Au-delà, une date estimée n'a plus de sens : on préfère dire qu'on ne peut pas l'estimer. */
const HORIZON_JOURS = 3650

/** Le jour où la cible serait atteinte en gardant le rythme réel depuis le dernier relevé, ou null. */
export function jourEstime(
  e1rm: number | null,
  jourLe: number | null,
  cible: number,
  rythmeKgParJour: number | null,
): number | null {
  if (e1rm === null || jourLe === null || rythmeKgParJour === null) return null
  if (e1rm >= cible || rythmeKgParJour <= 0) return null
  const jours = Math.ceil((cible - e1rm) / rythmeKgParJour)
  return jours > HORIZON_JOURS ? null : jourLe + jours
}

/* ---------- Statut ---------- */

export type Statut =
  | 'dans-les-temps'
  | 'en-avance'
  | 'en-retard'
  | 'cible-atteinte'
  | 'atteint'
  | 'abandonne'
  | 'sans-estimation'

export const LIBELLE_STATUT: Readonly<Record<Statut, string>> = {
  'dans-les-temps': 'Dans les temps',
  'en-avance': 'En avance',
  'en-retard': 'En retard',
  'cible-atteinte': 'Cible atteinte',
  atteint: 'Atteint',
  abandonne: 'Abandonné',
  'sans-estimation': 'Pas encore estimé',
}

export function statutDe(
  objectif: Pick<ObjectifLu, 'statut' | 'jours_restants'> & { progression: ObjectifLu['progression'] },
  ecart: Ecart | null,
): Statut {
  if (objectif.statut === 'atteint') return 'atteint'
  if (objectif.statut === 'abandonne') return 'abandonne'
  if (objectif.progression?.cible_atteinte) return 'cible-atteinte'
  if (ecart) {
    if (ecart.jours > SEUIL_JOURS) return 'en-retard'
    if (ecart.jours < -SEUIL_JOURS) return 'en-avance'
    return 'dans-les-temps'
  }
  // Sans plan, une échéance dépassée reste un retard qu'on peut dire.
  return objectif.jours_restants < 0 ? 'en-retard' : 'sans-estimation'
}

/* ---------- La planche analysée ---------- */

export interface AssiseAnalysee extends Assise {
  /** Jour où l'assise a été franchie (entièrement), ou entamée pour l'assise en cours ; null si pas encore. */
  jourFranchi: number | null
  bloc: BlocPlanche | null
}

export interface Analyse {
  statut: Statut
  e1rm: number | null
  jourLe: number | null
  /** Le pourcentage de l'API (e1RM / cible, de 0 à 100). */
  pourcentage: number
  reste: number | null
  cible: number
  /** La hauteur de l'élévation : la cible, ou l'e1RM s'il l'a dépassée. */
  sommet: number
  pas: number
  assises: AssiseAnalysee[]
  points: PointE1rm[]
  blocs: BlocPlanche[]
  plan: PlanLineaire | null
  ecart: Ecart | null
  /** kg par jour. */
  rythme: number | null
  requis: number | null
  /** Le jour où la cible serait atteinte au rythme actuel ; null s'il n'y a pas assez de relevés. */
  estime: number | null
  palier: { niveau: number; reste: number } | null
  jourEcheance: number
  jourAujourdhui: number
}

/** Tout ce que la planche d'un objectif affiche, calculé une fois. */
export function analyser(
  objectif: ObjectifLu,
  evolution: readonly PointEvolution[] | null,
  blocs: readonly BlocLu[] | null,
  aujourdhui: string,
): Analyse {
  const jourAujourdhui = jourDe(aujourdhui)
  const jourEcheance = jourDe(objectif.date_cible)
  const progression = objectif.progression
  const e1rm = progression?.e1rm_lest_kg ?? null
  const jourLe = progression ? jourDe(progression.le) : null

  // Sans historique (l'appel a échoué), le seul relevé sûr est celui de la progression.
  let points = evolution ? pointsE1rm(evolution) : []
  if (points.length === 0 && progression && jourLe !== null) {
    points = [{ jour: jourLe, date: progression.le, e1rm: progression.e1rm_lest_kg }]
  }

  const cible = objectif.valeur_cible_kg
  const sommet = Math.max(cible, e1rm ?? 0)
  const pas = pasAssise(sommet)
  const lesBlocs = blocs ? blocsPlanche(blocs, objectif.id) : []

  const plan = planLineaire(points, cible, jourEcheance)
  const ecart =
    plan && e1rm !== null && jourLe !== null && jourLe > plan.jour0 ? ecartAuPlan(plan, jourLe, e1rm) : null

  const lesAssises: AssiseAnalysee[] = assises(sommet, e1rm ?? 0, pas).map((a) => {
    const jourFranchi =
      a.part >= 1
        ? jourDeFranchissement(points, a.haut)
        : a.part > 0
          ? jourDeFranchissement(points, a.bas)
          : null
    return { ...a, jourFranchi, bloc: jourFranchi === null ? null : blocLe(lesBlocs, jourFranchi) }
  })

  const allure = jourLe === null ? null : rythme(points, jourLe)

  return {
    statut: statutDe(objectif, ecart),
    e1rm,
    jourLe,
    pourcentage: Math.max(0, Math.min(100, progression?.pourcentage ?? 0)),
    reste: e1rm === null ? null : Math.max(0, cible - e1rm),
    cible,
    sommet,
    pas,
    assises: lesAssises,
    points,
    blocs: lesBlocs,
    plan,
    ecart,
    rythme: allure,
    estime: jourEstime(e1rm, jourLe, cible, allure),
    requis: e1rm === null ? null : rythmeRequis(e1rm, cible, objectif.jours_restants),
    palier: e1rm === null ? null : prochainPalier(e1rm, cible, pas),
    jourEcheance,
    jourAujourdhui,
  }
}

/* ---------- Le fil tendu ---------- */

/**
 * La tension du fil : une fonction bornée et monotone de l'écart en jours. Elle part de 0,75 px en
 * tirets de 6/6 et finit à 2,5 px, continu, à quatre semaines d'écart ou plus.
 */
export function tensionFil(joursEcart: number): { epaisseur: number; tirets: string } {
  const t = Math.max(0, Math.min(1, Math.abs(joursEcart) / 28))
  const vide = 6 * (1 - t)
  return { epaisseur: 0.75 + 1.75 * t, tirets: vide < 0.3 ? 'none' : `6 ${vide.toFixed(2)}` }
}

/* ---------- Le glisser du calque ---------- */

/**
 * La position du calque pendant qu'on le tire : fidèle au doigt entre le calage (0) et sa position
 * recalée, puis de plus en plus dure au-delà, comme une feuille tenue par ses taquets. Le calage
 * aimante à moins de `aimant` unités.
 */
export function positionElastique(brut: number, repos: number, aimant = 2.5): number {
  const bas = Math.min(0, repos)
  const haut = Math.max(0, repos)
  if (brut < bas) return bas - freiner(bas - brut)
  if (brut > haut) return haut + freiner(brut - haut)
  return Math.abs(brut) < aimant ? 0 : brut
}

/** Un quart de la traction au début, de moins en moins ensuite, jamais plus de 28 unités. */
function freiner(exces: number): number {
  return (0.25 * exces * 28) / (28 + 0.25 * exces)
}

/* ---------- Un tremblé déterministe : la bavure de l'encre ---------- */

function melange(graine: number): () => number {
  let etat = graine >>> 0
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0
    let t = etat
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Un décalage fixe par sommet, de -amplitude à +amplitude : le même objectif a toujours le même tracé. */
export function tremble(nombre: number, graine: number, amplitude: number): number[] {
  const hasard = melange(graine * 7919 + 13)
  return Array.from({ length: nombre }, () => (hasard() * 2 - 1) * amplitude)
}

/* ---------- Les phrases, calculées ---------- */

export const NOM_STATUT_COURT: Readonly<Record<Statut, string>> = {
  'dans-les-temps': 'DANS LES TEMPS',
  'en-avance': 'EN AVANCE',
  'en-retard': 'EN RETARD',
  'cible-atteinte': 'CIBLE ATTEINTE',
  atteint: 'ATTEINT',
  abandonne: 'ABANDONNÉ',
  'sans-estimation': 'PAS ENCORE ESTIMÉ',
}

/** L'écart sur le plan, en une expression : « +17 j sur le plan », « −21 j sur le plan » ; null sans plan. */
export function phraseEcart(a: Analyse, objectif: Pick<ObjectifLu, 'jours_restants'>): string | null {
  if (a.statut === 'atteint' || a.statut === 'abandonne' || a.statut === 'cible-atteinte') return null
  if (a.ecart) return `${signeEntier(a.ecart.jours)} j sur le plan`
  if (objectif.jours_restants < 0) return `${signeEntier(-objectif.jours_restants)} j après l’échéance`
  return null
}

/** Le rythme réel et le rythme requis, en kg par deux semaines. */
export function phraseRythme(a: Analyse): string | null {
  if (a.rythme === null) return null
  const requis = a.requis === null ? '' : ` (requis ${signe(a.requis * 14)})`
  return `rythme ${signe(a.rythme * 14)} kg / 2 sem${requis}`
}

/**
 * La date où la cible serait atteinte au rythme actuel : « estimé 01.04.2027 », et avec `detail`,
 * son avance ou son retard sur l'échéance (« 17 j après l’échéance »). Null si on ne peut pas estimer.
 */
export function phraseEstimation(a: Analyse, detail = false): string | null {
  if (a.estime === null || a.statut === 'atteint' || a.statut === 'abandonne') return null
  const base = `estimé ${dateCompacte(isoDe(a.estime))}`
  if (!detail) return base
  const delta = a.estime - a.jourEcheance
  if (delta === 0) return `${base} (à l’échéance)`
  return `${base} (${Math.abs(delta)} j ${delta > 0 ? 'après' : 'avant'} l’échéance)`
}

/** Pourquoi le calque est absent, en une phrase : on ne trace pas un plan qu'on ne peut pas fonder. */
export function raisonSansPlan(a: Analyse, historique: boolean): string {
  if (!historique)
    return 'L’historique d’e1RM n’a pas pu être lu : la planche n’a ni courbe ni calque pour l’instant.'
  if (a.points.length < 2) {
    return 'Pas encore de calque : il faut au moins deux relevés d’e1RM pour tracer le plan jusqu’à l’échéance.'
  }
  return 'Pas de calque : l’échéance est déjà passée par rapport au premier relevé, ou la cible est sous lui.'
}

export function phrasePalier(a: Analyse): string | null {
  if (!a.palier) return null
  return `prochain palier ${niveau(a.palier.niveau)} kg, à +${decimal(a.palier.reste)} kg`
}

/** Ce que dit le bandeau d'état d'une planche, du statut au nombre de jours restants. */
export function segmentsBandeau(
  a: Analyse,
  objectif: Pick<ObjectifLu, 'date_cible' | 'jours_restants'>,
  echeanceTexte: string,
): string[] {
  const segments: string[] = []
  const estimation = phraseEstimation(a, true)
  if (estimation) segments.push(estimation)
  segments.push(`échéance ${dateCompacte(objectif.date_cible)}`)
  const ecart = phraseEcart(a, objectif)
  if (ecart) segments.push(ecart)
  if (a.ecart && a.statut !== 'dans-les-temps') segments.push(`${signe(a.ecart.kg)} kg au calage`)
  const rythmeTexte = phraseRythme(a)
  if (rythmeTexte) segments.push(rythmeTexte)
  const palier = phrasePalier(a)
  if (palier) segments.push(palier)
  segments.push(echeanceTexte)
  return segments
}

/**
 * Ce que lit un lecteur d'écran sur une colonne : « Traction, 64 %, 41,5 kilos sur 50, en retard de
 * 17 jours, échéance le 15 mars 2027 ».
 */
export function texteMesure(a: Analyse, objectif: Pick<ObjectifLu, 'titre' | 'date_cible'>): string {
  const parties = [objectif.titre, `${Math.round(a.pourcentage)} %`]
  if (a.e1rm !== null) parties.push(`${decimal(a.e1rm)} kilos sur ${decimal(a.cible)}`)
  else parties.push('pas encore estimé')
  if (a.ecart) {
    const jours = Math.abs(a.ecart.jours)
    const pluriel = jours > 1 ? 's' : ''
    if (a.statut === 'en-retard') parties.push(`en retard de ${jours} jour${pluriel}`)
    else if (a.statut === 'en-avance') parties.push(`en avance de ${jours} jour${pluriel}`)
    else parties.push('dans les temps')
  } else if (a.statut === 'atteint' || a.statut === 'abandonne' || a.statut === 'cible-atteinte') {
    parties.push(LIBELLE_STATUT[a.statut].toLowerCase())
  }
  parties.push(`échéance le ${dateParlee(objectif.date_cible)}`)
  return parties.join(', ')
}

/** « 1 en retard · 1 dans les temps · 1 en avance » : le portefeuille en une ligne. */
export function resumePortefeuille(statuts: readonly Statut[]): string {
  const ordre: [Statut, string][] = [
    ['en-retard', 'en retard'],
    ['dans-les-temps', 'dans les temps'],
    ['en-avance', 'en avance'],
    ['cible-atteinte', 'cible atteinte'],
    ['sans-estimation', 'pas encore estimé'],
  ]
  const parties = ordre
    .map(([statut, libelle]) => [statuts.filter((s) => s === statut).length, libelle] as const)
    .filter(([n]) => n > 0)
    .map(([n, libelle]) => `${n} ${libelle}`)
  return parties.length ? parties.join(' · ') : 'aucune planche en cours'
}

/** Une empreinte courte de ce qui change la planche : un nouvel e1RM, une cible ou une échéance modifiée. */
export function empreinte(objectifs: readonly ObjectifLu[]): string {
  const brut = objectifs
    .map(
      (o) => `${o.id}:${o.statut}:${o.valeur_cible_kg}:${o.date_cible}:${o.progression?.e1rm_lest_kg ?? '-'}`,
    )
    .join('|')
  let h = 5381
  for (let i = 0; i < brut.length; i += 1) h = ((h * 33) ^ brut.charCodeAt(i)) >>> 0
  return h.toString(36)
}

/** L'annotation d'une assise au survol : un complément, jamais la seule source d'une information. */
export function annotationAssise(a: Analyse, rang: number): string {
  const assise = a.assises[rang]
  if (!assise) return ''
  const base = niveau(assise.haut)
  const reste = decimal(assise.haut - (a.e1rm ?? 0))
  if (assise.jourFranchi === null) return `${base} · à franchir : +${reste} kg`
  const date = dateCompacte(isoDe(assise.jourFranchi))
  const bloc = assise.bloc ? ` · ${assise.bloc.repere} ${LIBELLE_TYPE[assise.bloc.type]}` : ''
  if (assise.part >= 1) return `${base} · franchi le ${date}${bloc}`
  return `${base} · entamé le ${date}${bloc} · encore +${reste} kg`
}

/** « PL. 01 » : le numéro d'une planche dans la liasse, du principal aux archives. */
export function numeroPlanche(rang: number): string {
  return `PL. ${String(rang + 1).padStart(2, '0')}`
}

/** « 1 planche atteinte · 2 planches abandonnées » : le contenu du tiroir d'archives. */
export function resumeArchives(statuts: readonly Statut[]): string {
  const atteintes = statuts.filter((s) => s === 'atteint' || s === 'cible-atteinte').length
  const abandonnees = statuts.filter((s) => s === 'abandonne').length
  const parties: string[] = []
  if (atteintes > 0) {
    parties.push(`${atteintes} planche${atteintes > 1 ? 's' : ''} atteinte${atteintes > 1 ? 's' : ''}`)
  }
  if (abandonnees > 0) {
    parties.push(
      `${abandonnees} planche${abandonnees > 1 ? 's' : ''} abandonnée${abandonnees > 1 ? 's' : ''}`,
    )
  }
  return parties.length ? parties.join(' · ') : 'le tiroir est vide'
}

/** Le fil tendu en toutes lettres : l'écart à l'échéance si le plan se poursuit depuis le dernier relevé. */
export function legendeFil(a: Analyse): string | null {
  if (!a.ecart || a.statut === 'atteint' || a.statut === 'abandonne' || a.statut === 'cible-atteinte') {
    return null
  }
  if (Math.abs(a.ecart.kg) < 0.05) return 'Le calque est calé : le plan et le réalisé coïncident.'
  const sens = a.ecart.kg < 0 ? 'sous' : 'au-dessus de'
  return `Le calque est recalé sur ton e1RM actuel : le plan finit ${decimal(Math.abs(a.ecart.kg))} kg ${sens} la cible à l’échéance (${signe(a.ecart.kg)} kg).`
}
