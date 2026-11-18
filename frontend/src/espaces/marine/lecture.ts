/** Lecture des données de la mer, sans React. */

const POINTS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSO',
  'SO',
  'OSO',
  'O',
  'ONO',
  'NO',
  'NNO',
]

/** 225 → « SO » (rose à 16 directions, en français : O pour ouest). */
export function pointCardinal(degres: number): string {
  const index = Math.round((((degres % 360) + 360) % 360) / 22.5) % 16
  return POINTS[index] ?? 'N'
}

export type Ciel =
  'clair' | 'voile' | 'nuageux' | 'brouillard' | 'bruine' | 'pluie' | 'neige' | 'averses' | 'orage'

/** Code météo WMO (Open-Meteo) → famille de ciel et libellé. */
export function lireCodeMeteo(code: number | null | undefined): { ciel: Ciel; libelle: string } {
  if (code === null || code === undefined) return { ciel: 'nuageux', libelle: 'Ciel inconnu' }
  if (code === 0) return { ciel: 'clair', libelle: 'Ciel clair' }
  if (code <= 2) return { ciel: 'voile', libelle: 'Éclaircies' }
  if (code === 3) return { ciel: 'nuageux', libelle: 'Couvert' }
  if (code <= 48) return { ciel: 'brouillard', libelle: 'Brouillard' }
  if (code <= 57) return { ciel: 'bruine', libelle: 'Bruine' }
  if (code <= 67) return { ciel: 'pluie', libelle: 'Pluie' }
  if (code <= 77) return { ciel: 'neige', libelle: 'Neige' }
  if (code <= 86) return { ciel: 'averses', libelle: 'Averses' }
  return { ciel: 'orage', libelle: 'Orage' }
}

/** Échelle de Beaufort à partir du vent moyen en km/h. */
export function beaufort(kmh: number): number {
  const seuils = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118]
  const force = seuils.findIndex((s) => kmh < s)
  return force === -1 ? 12 : force
}

const HEURE = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})
const JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'Europe/Paris' })

/** « 14:05 », toujours à l'heure de la plage. */
export function heure(iso: string): string {
  return HEURE.format(new Date(iso))
}

export function jourCourt(iso: string): string {
  return JOUR.format(new Date(iso))
}

/** Durée entre deux instants : « 9 h 02 ». */
export function duree(debut: string, fin: string): string {
  const minutes = Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 60000)
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}
