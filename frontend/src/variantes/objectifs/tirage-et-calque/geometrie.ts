import {
  type Analyse,
  type BlocPlanche,
  dateBreve,
  isoDe,
  LIBELLE_TYPE,
  type PointE1rm,
  records,
  tremble,
  type TypeBloc,
} from './modele'

/*
 * La géométrie de l'élévation : où tombe chaque assise, chaque point et chaque bloc dans le
 * dessin. Tout est en unités de la boîte de dessin (viewBox), jamais en pixels d'écran : la
 * feuille se met à l'échelle seule, et le calque se déplace dans les mêmes unités.
 */

export const BOITE = { largeur: 900, hauteur: 540 } as const

/** La zone où l'on trace : les marges portent les cotes (niveaux à gauche, cible à droite). */
export const ZONE = { gauche: 84, droite: 836, haut: 52, bas: 478 } as const

export interface Echelles {
  /** Jour → abscisse. */
  x: (jour: number) => number
  /** Charge (kg) → ordonnée. */
  y: (kg: number) => number
  /** Unités de dessin par kg : la distance verticale que représente 1 kg. */
  parKg: number
  jourDebut: number
  jourFin: number
}

/** Le temps court du premier relevé à l'échéance (ou à aujourd'hui, si l'échéance est passée). */
export function echelles(a: Analyse): Echelles {
  const premier = a.points[0]?.jour ?? a.jourAujourdhui
  const jourDebut = Math.min(premier, a.jourAujourdhui, a.jourEcheance)
  const jourFin = Math.max(a.jourEcheance, a.jourAujourdhui, jourDebut + 7)
  const largeur = ZONE.droite - ZONE.gauche
  const hauteur = ZONE.bas - ZONE.haut
  return {
    x: (jour) => ZONE.gauche + ((jour - jourDebut) / (jourFin - jourDebut)) * largeur,
    y: (kg) => ZONE.bas - (kg / a.sommet) * hauteur,
    parKg: hauteur / a.sommet,
    jourDebut,
    jourFin,
  }
}

/** Un trait d'assise : sa limite haute, et l'étiquette « NIV. » quand il y a la place de l'écrire. */
export interface LimiteAssise {
  kg: number
  y: number
  /** Le niveau à écrire, ou null. */
  etiquette: number | null
}

/** Une étiquette tous les `n` traits pour qu'elles restent à 26 unités l'une de l'autre au moins. */
export function limites(a: Analyse, e: Echelles): LimiteAssise[] {
  const epaisseur = a.pas * e.parKg
  const cadence = Math.max(1, Math.ceil(26 / epaisseur))
  const kgs = [0, ...a.assises.map((s) => s.haut)]
  return kgs.map((kg, i) => ({ kg, y: e.y(kg), etiquette: i % cadence === 0 ? kg : null }))
}

export interface BandeFranchie {
  /** Rang de l'assise, en partant du sol. */
  rang: number
  bas: number
  haut: number
  /** La hauteur effectivement posée (toute l'assise, sauf la dernière, au prorata). */
  hauteurKg: number
  x: number
  y: number
  largeur: number
  hauteur: number
  jourFranchi: number
  bloc: BlocPlanche | null
  type: TypeBloc | null
  entiere: boolean
}

/**
 * Le sédiment : chaque assise franchie est posée à partir du jour où elle l'a été et court
 * jusqu'à aujourd'hui ; la dernière, entamée, l'est au prorata. Elles forment ensemble l'aire sous
 * la courbe, découpée en strates de 2,5 kg : la hauteur totale posée est l'e1RM.
 */
export function bandesFranchies(a: Analyse, e: Echelles): BandeFranchie[] {
  const droite = Math.min(ZONE.droite, Math.max(e.x(a.jourAujourdhui), e.x(a.jourLe ?? a.jourAujourdhui)))
  const bandes: BandeFranchie[] = []
  a.assises.forEach((s, rang) => {
    if (s.part <= 0 || s.jourFranchi === null) return
    const x = e.x(s.jourFranchi)
    const hauteurKg = (s.haut - s.bas) * s.part
    bandes.push({
      rang,
      bas: s.bas,
      haut: s.haut,
      hauteurKg,
      x,
      y: e.y(s.bas + hauteurKg),
      largeur: Math.max(2, droite - x),
      hauteur: hauteurKg * e.parKg,
      jourFranchi: s.jourFranchi,
      bloc: s.bloc,
      type: s.bloc?.type ?? null,
      entiere: s.part >= 1,
    })
  })
  return bandes
}

/** La courbe réelle, avec un tremblé fixe de 0,4 unité par sommet : la bavure de l'encre, calculée une fois. */
export function pointsCourbe(
  points: readonly PointE1rm[],
  e: Echelles,
  graine: number,
): { x: number; y: number }[] {
  const dx = tremble(points.length, graine, 0.4)
  const dy = tremble(points.length, graine + 1, 0.4)
  return points.map((p, i) => ({ x: e.x(p.jour) + (dx[i] ?? 0), y: e.y(p.e1rm) + (dy[i] ?? 0) }))
}

export function cheminDe(pts: readonly { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

/** Les repères altimétriques : un par record, sauf le tout premier relevé (il n'a rien battu). */
export function reperesDeRecord(points: readonly PointE1rm[], e: Echelles): { x: number; y: number }[] {
  return records(points)
    .slice(1)
    .map((p) => ({ x: e.x(p.jour), y: e.y(p.e1rm) }))
}

export interface PlanDessine {
  /** Le tracé du plan, à sa place au calage. */
  x0: number
  y0: number
  x1: number
  y1: number
  /** Où le plan passe au jour du dernier relevé, au calage : c'est là que la mire du tirage est posée. */
  mire: { x: number; y: number } | null
  /** Le déplacement du calque recalé sur aujourd'hui : vers le bas en retard, vers le haut en avance. */
  repos: number
}

export function planDessine(a: Analyse, e: Echelles): PlanDessine | null {
  const plan = a.plan
  if (!plan) return null
  const mire =
    a.jourLe !== null
      ? { x: e.x(a.jourLe), y: e.y(plan.valeur0 + plan.pente * (a.jourLe - plan.jour0)) }
      : null
  return {
    x0: e.x(plan.jour0),
    y0: e.y(plan.valeur0),
    x1: e.x(plan.jourFin),
    y1: e.y(plan.valeurFin),
    mire,
    repos: a.ecart ? -a.ecart.kg * e.parKg : 0,
  }
}

export interface BlocDessine {
  bloc: BlocPlanche
  x: number
  largeur: number
  etiquette: string
}

/**
 * Les blocs à venir, portés par le calque : une bande de points par bloc, de son début à sa fin
 * (ou à l'échéance), rognée à la zone.
 */
export function blocsAVenir(a: Analyse, e: Echelles): BlocDessine[] {
  return a.blocs
    .filter((b) => (b.fin ?? a.jourEcheance) > a.jourAujourdhui)
    .map((b) => {
      // Un bloc déjà commencé n'a de « à venir » que sa suite : la trame part d'aujourd'hui.
      const gauche = Math.max(ZONE.gauche, e.x(Math.max(b.debut, a.jourAujourdhui)))
      const droite = Math.min(ZONE.droite, e.x(b.fin ?? a.jourEcheance))
      const largeur = Math.max(0, droite - gauche)
      const dates = `${dateBreve(isoDe(b.debut))}→${b.fin === null ? '…' : dateBreve(isoDe(b.fin))}`
      // Le libellé complet quand la bande a la place de l'écrire, le seul repère sinon.
      const etiquette = largeur >= 190 ? `${b.repere} · ${LIBELLE_TYPE[b.type]} · ${dates}` : b.repere
      return { bloc: b, x: gauche, largeur, etiquette }
    })
    .filter((b) => b.largeur > 0)
}

/** Les perforations de la planche : deux taquets sur le bord haut, à un quart et aux trois quarts. */
export function taquets(): { x: number; y: number }[] {
  const largeur = ZONE.droite - ZONE.gauche
  return [ZONE.gauche + largeur * 0.25, ZONE.gauche + largeur * 0.75].map((x) => ({ x, y: ZONE.haut - 30 }))
}

/* ---------- La colonne stratigraphique (vue d'ensemble) ---------- */

export const COLONNE = { largeur: 120, hauteur: 232 } as const

export interface BandeColonne {
  rang: number
  y: number
  hauteur: number
  /** Part franchie, de 0 à 1. */
  part: number
}

/** Les assises d'un objectif sur une colonne de hauteur normalisée : la ligne de sol et le faîtage sont les mêmes pour tous. */
export function bandesDeColonne(a: Analyse): BandeColonne[] {
  return a.assises.map((s, rang) => ({
    rang,
    y: COLONNE.hauteur - (s.haut / a.sommet) * COLONNE.hauteur,
    hauteur: ((s.haut - s.bas) / a.sommet) * COLONNE.hauteur,
    part: s.part,
  }))
}

/** L'écart des deux mires d'une paire, en unités : aligné dans les temps, sinon de 3 à 12 selon l'écart. */
export function decalageDeMires(a: Analyse): number {
  if (!a.ecart || a.statut === 'dans-les-temps') return 0
  const brut = Math.min(12, 3 + Math.abs(a.ecart.jours) / 4)
  return a.ecart.kg < 0 ? brut : -brut
}
