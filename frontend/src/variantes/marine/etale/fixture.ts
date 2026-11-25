import type { Assistant, Conditions } from '../../../api/types'

/*
 * Des conditions de mer simulées pour les tests : la journée du 20 novembre 2026 à Ouistreham, pleine mer à 14h52.
 * Elles sont physiquement cohérentes (la marée suit un cosinus, le courant s'annule aux étales, la distance de sable
 * vient de la hauteur d'eau par une pente fixe), pour que la coupe, la frise et les phrases soient testées sur des
 * valeurs qui ont du sens. Ce fichier n'est importé que par les tests.
 */

const DEBUT = Date.parse('2026-11-20T10:00:00+01:00')
const HEURE = 3_600_000
const PM = Date.parse('2026-11-20T14:52:00+01:00')
const PERIODE_MAREE = 12.42 * HEURE
/** Hauteur de la digue : l'eau y touche quand elle dépasse ce niveau. */
const PIED_M = 6.2
const PENTE = 0.011

export const hauteurDeMaree = (t: number): number =>
  4.05 + 2.85 * Math.cos((2 * Math.PI * (t - PM)) / PERIODE_MAREE)
export const distanceDeSable = (hauteur: number): number => Math.max(0, (PIED_M - hauteur) / PENTE)

export type HeureFictive = Conditions['heures'][number]

export function heureFictive(i: number, surcharge: Partial<HeureFictive> = {}): HeureFictive {
  const t = DEBUT + i * HEURE
  const hauteur = hauteurDeMaree(t)
  const jour = new Date(t).getUTCHours() + 1
  // Rouge de 17 h à 6 h : le vent de terre passe le seuil.
  const rouge = jour >= 17 || jour < 6
  return {
    instant: new Date(t).toISOString(),
    air_c: 14 - (rouge ? 3 : 0),
    vent_kmh: rouge ? 31 : 26,
    rafales_kmh: rouge ? 42 : 36,
    vent_direction_deg: 225,
    nuages_pct: 90,
    code_meteo: 3,
    pluie_pct: 10,
    eau_c: 12,
    vagues_m: 0.8,
    courant_kmh: Math.round(2.4 * Math.abs(Math.sin((2 * Math.PI * (t - PM)) / PERIODE_MAREE)) * 10) / 10,
    courant_direction_deg: 90,
    hauteur_eau_m: Math.round(hauteur * 100) / 100,
    distance_eau_m: Math.round(distanceDeSable(hauteur)),
    danger: rouge ? 'rouge' : 'vert',
    ...surcharge,
  }
}

export function conditionsFictives(surcharge: Partial<Conditions> = {}): Conditions {
  const heures = Array.from({ length: 30 }, (_, i) => heureFictive(i))
  const maintenant = Date.parse('2026-11-20T10:40:00+01:00')
  return {
    spot: { id: 1, nom: 'Ouistreham', latitude: 49.28, longitude: -0.25 },
    maintenant: {
      instant: new Date(maintenant).toISOString(),
      air_c: 15,
      ressenti_c: 13,
      vent_kmh: 26,
      rafales_kmh: 36,
      vent_direction_deg: 225,
      nuages_pct: 90,
      code_meteo: 3,
      eau_c: 12,
      vagues_m: 0.8,
      houle_m: 0.8,
      periode_s: 7,
      vagues_direction_deg: 290,
      courant_kmh: 1.9,
      courant_direction_deg: 90,
      hauteur_eau_m: Math.round(hauteurDeMaree(maintenant) * 100) / 100,
      tendance: 'montante',
      distance_eau_m: Math.round(distanceDeSable(hauteurDeMaree(maintenant))),
    },
    heures,
    marees: [
      { type: 'PM', instant: '2026-11-20T14:52:00+01:00', hauteur_m: 6.9, coefficient: 87 },
      { type: 'BM', instant: '2026-11-20T21:08:00+01:00', hauteur_m: 1.2, coefficient: 87 },
    ],
    soleil: [
      { jour: '2026-11-20', lever: '2026-11-20T08:20:00+01:00', coucher: '2026-11-20T17:08:00+01:00' },
      { jour: '2026-11-21', lever: '2026-11-21T08:22:00+01:00', coucher: '2026-11-21T17:07:00+01:00' },
    ],
    danger: {
      niveau: 'vert',
      raisons: [{ niveau: 'vert', texte: 'Vent de terre 18 km/h, sous le seuil de 20.' }],
    },
    perimees: false,
    source: 'Open-Meteo',
    ...surcharge,
  }
}

/** La réponse de l'assistant : un créneau de 13h30 à 15h30 qui contient l'étale de pleine mer. */
export function assistantFictif(): Assistant {
  return {
    spot: { id: 1, nom: 'Ouistreham', latitude: 49.28, longitude: -0.25 },
    mode: 'nage',
    duree_min: 40,
    combinaison: false,
    eau_c: 12,
    creneaux: [
      {
        debut: '2026-11-20T13:30:00+01:00',
        fin: '2026-11-20T15:30:00+01:00',
        danger: { niveau: 'vert', raisons: [] },
        atouts: [],
        reserves: [],
      },
    ],
    recommandations: {
      durees: { conseille_min: 25, maximum_min: 40, texte: '25 minutes conseillées.' },
      tenue: [],
      reprise: false,
      gestes: [],
    },
    jours_depuis_derniere_sortie: null,
  } as unknown as Assistant
}
