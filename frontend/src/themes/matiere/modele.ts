import type { DonneesBriefing } from '../../accueil/useBriefing'

/**
 * Ce que les quatre plaques de matière subissent. L'acier se polit avec le
 * bloc et prend les couleurs de revenu de la friction, le sable est couvert par
 * la vraie marée, l'albâtre laisse passer le jour de la récupération, et le
 * polymère compte ses franges de contrainte jusqu'à la cible. Calculé ici, sans dessin.
 */
export interface ParametresMatiere {
  recuperation: number
  bandes: { total: number; faites: number; rpe: number }
  mer: {
    niveau: 'vert' | 'rouge' | 'noir' | null
    ventKmh: number
    directionDeg: number
    /** Hauteur d'eau : 0 à marée basse, 1 à pleine mer. Null si la marée est inconnue. */
    maree: number | null
  }
  /** Les objectifs en cours, jusqu'à trois : la part de cible atteinte de chacun, de 0 à 1. */
  objectifs: number[]
}

const borne = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x))

interface Maree {
  type: string
  instant: string
}

/** La hauteur relative de l'eau à `maintenant`, entre la dernière et la prochaine marée extrême. */
export function niveauDeMaree(marees: readonly Maree[], maintenant: Date): number | null {
  const triees = marees
    .map((m) => ({ pleine: m.type === 'PM', instant: new Date(m.instant).getTime() }))
    .filter((m) => Number.isFinite(m.instant))
    .sort((a, b) => a.instant - b.instant)
  const t = maintenant.getTime()
  const apres = triees.findIndex((m) => m.instant > t)
  if (apres < 1) return null
  const avant = triees[apres - 1]
  const prochaine = triees[apres]
  if (!avant || !prochaine) return null
  const f = (t - avant.instant) / (prochaine.instant - avant.instant)
  // Une marée suit à peu près une cosinusoïde : douce aux étales, rapide au milieu.
  const montee = 0.5 - 0.5 * Math.cos(Math.PI * f)
  return prochaine.pleine ? montee : 1 - montee
}

export function parametresMatiere(donnees: DonneesBriefing | null, maintenant: Date): ParametresMatiere {
  const vie = donnees?.vie
  const seance = donnees?.seance
  const mer = donnees?.mer
  return {
    recuperation: vie ? borne(vie.recuperation.progression) : 0,
    bandes: {
      total: seance?.bloc ? seance.bloc.total : 0,
      faites: seance?.bloc ? seance.bloc.numero : 0,
      rpe: seance?.propositions[0]?.rpe_cible ?? 8,
    },
    mer: {
      niveau: mer?.danger.niveau ?? null,
      ventKmh: mer?.maintenant.vent_kmh ?? 0,
      directionDeg: mer?.maintenant.vent_direction_deg ?? 225,
      maree: mer ? niveauDeMaree(mer.marees, maintenant) : null,
    },
    objectifs: (donnees?.objectifs ?? [])
      .filter((o) => o.statut === 'en_cours')
      .sort((a, b) => Number(b.principal) - Number(a.principal))
      .slice(0, 3)
      .map((o) => borne((o.progression?.pourcentage ?? 0) / 100)),
  }
}

/** Les couleurs de revenu de l'acier chauffé par frottement : paille, bronze, pourpre, bleu. De 0 (froid) à 1. */
const REVENU: readonly (readonly [number, number, number])[] = [
  [214, 186, 120],
  [190, 130, 62],
  [140, 92, 160],
  [74, 111, 165],
]

export function couleurDeRevenu(chaleur: number): string {
  const x = borne(chaleur) * (REVENU.length - 1)
  const i = Math.min(REVENU.length - 2, Math.floor(x))
  const f = x - i
  const a = REVENU[i] as readonly number[]
  const b = REVENU[i + 1] as readonly number[]
  const c = (k: number) => Math.round((a[k] as number) + ((b[k] as number) - (a[k] as number)) * f)
  return `rgb(${c(0)} ${c(1)} ${c(2)})`
}

/** La chaleur de la friction d'une bande : plus l'effort (RPE cible) est haut, plus l'acier chauffe. */
export function chaleurDeLaBande(rpe: number, rang: number, total: number): number {
  const effort = borne((rpe - 5) / 5)
  const avancement = total > 1 ? rang / (total - 1) : 1
  return borne(effort * 0.55 + avancement * 0.45)
}

/** Le nombre de franges de contrainte d'un polymère : une de départ, jusqu'à neuf. */
export function nombreDeFranges(progression: number): number {
  return 1 + Math.round(borne(progression) * 8)
}
