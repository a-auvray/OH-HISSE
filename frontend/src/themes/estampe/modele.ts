import type { DonneesBriefing } from '../../accueil/useBriefing'

/**
 * Ce que l'estampe imprime. Chaque faisceau de fils ne dit qu'une donnée, et la
 * dit par son comportement : l'encre monte avec la récupération, les strates
 * avancent avec le bloc, le courant se trouble avec le danger, les câbles se
 * tendent avec la progression. Tout est calculé ici, sans dessin, pour être testé.
 */
export interface ParametresFils {
  /** Vie courante : part des fibres encrées, de 0 à 1. */
  recuperation: number
  /** Streetlifting : bandes encrées sur le total, et leur serrage (RPE cible). */
  bandes: { total: number; faites: number; rpe: number }
  /** Marine : le courant. `niveau` null tant que la mer est inconnue. */
  mer: { niveau: 'vert' | 'rouge' | 'noir' | null; ventKmh: number; rafalesKmh: number; directionDeg: number }
  /** Objectifs : part de la cible atteinte, de 0 à 1 ; à 1 les câbles sont tendus. */
  objectif: number
}

const borne = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x))

export function parametresFils(donnees: DonneesBriefing | null): ParametresFils {
  const vie = donnees?.vie
  const seance = donnees?.seance
  const mer = donnees?.mer
  const principal =
    donnees?.objectifs.find((o) => o.principal && o.statut === 'en_cours') ??
    donnees?.objectifs.find((o) => o.statut === 'en_cours')

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
      rafalesKmh: mer?.maintenant.rafales_kmh ?? mer?.maintenant.vent_kmh ?? 0,
      directionDeg: mer?.maintenant.vent_direction_deg ?? 225,
    },
    objectif: principal?.progression ? borne(principal.progression.pourcentage / 100) : 0,
  }
}

/** L'agitation du courant : l'écart entre le vent et ses rafales, et le trouble du danger. Entre 0 et 1. */
export function agitation(mer: ParametresFils['mer']): number {
  if (mer.niveau === 'noir') return 0
  const ecart = borne((mer.rafalesKmh - mer.ventKmh) / 30)
  const trouble = mer.niveau === 'rouge' ? 0.55 : 0
  return borne(0.12 + ecart * 0.5 + trouble)
}

/** Le serrage des strates : plus le RPE cible est haut, plus les lignes se resserrent (en pixels). */
export function pasDesStrates(rpe: number): number {
  return Math.round(borne(12 - (rpe - 5) * 1.6, 4, 12))
}

/** Le mou des câbles, de 1 (détendus) à 0 (tendus, verrouillés à 100 %). */
export function mouDesCables(objectif: number): number {
  return 1 - borne(objectif)
}
