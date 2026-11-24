/*
 * La position du soleil à Ouistreham, calculée sur place (formules astronomiques usuelles,
 * précision de quelques minutes) : une dépendance pour 2 ko de trigonométrie ne se justifie pas.
 * La feuille s'éclaire avec cette lumière : le moment de la journée n'est jamais écrit à la main.
 */

/** Ouistreham, Calvados. */
export const OUISTREHAM = { latitude: 49.2776, longitude: -0.2541 } as const

const RAD = Math.PI / 180
const JOUR_MS = 86_400_000
const JOUR_JULIEN_1970 = 2_440_588
const JOUR_JULIEN_2000 = 2_451_545
const OBLIQUITE = RAD * 23.4397

/** Le soleil se lève ou se couche quand son centre est à -0,833° : le disque et la réfraction. */
const HORIZON = -0.833

export interface PositionSoleil {
  /** Hauteur au-dessus de l'horizon, en degrés (négative la nuit). */
  elevation: number
  /** Direction depuis le nord, dans le sens des aiguilles d'une montre : 90 = est, 180 = sud, 270 = ouest. */
  azimut: number
}

export function positionDuSoleil(
  date: Date,
  { latitude, longitude }: { latitude: number; longitude: number } = OUISTREHAM,
): PositionSoleil {
  const jours = date.valueOf() / JOUR_MS - 0.5 + JOUR_JULIEN_1970 - JOUR_JULIEN_2000
  const anomalie = RAD * (357.5291 + 0.98560028 * jours)
  const equation =
    RAD * (1.9148 * Math.sin(anomalie) + 0.02 * Math.sin(2 * anomalie) + 0.0003 * Math.sin(3 * anomalie))
  const longitudeEcliptique = anomalie + equation + RAD * 102.9372 + Math.PI

  const declinaison = Math.asin(Math.sin(longitudeEcliptique) * Math.sin(OBLIQUITE))
  const ascensionDroite = Math.atan2(
    Math.sin(longitudeEcliptique) * Math.cos(OBLIQUITE),
    Math.cos(longitudeEcliptique),
  )
  const angleHoraire = RAD * (280.16 + 360.9856235 * jours) - RAD * -longitude - ascensionDroite
  const phi = RAD * latitude

  const elevation = Math.asin(
    Math.sin(phi) * Math.sin(declinaison) + Math.cos(phi) * Math.cos(declinaison) * Math.cos(angleHoraire),
  )
  // Mesuré depuis le sud dans la formule d'origine ; on le ramène au nord, plus parlant.
  const depuisLeSud = Math.atan2(
    Math.sin(angleHoraire),
    Math.cos(angleHoraire) * Math.sin(phi) - Math.tan(declinaison) * Math.cos(phi),
  )
  return {
    elevation: elevation / RAD,
    azimut: (((depuisLeSud / RAD + 180) % 360) + 360) % 360,
  }
}

export interface JourDuSoleil {
  lever: Date | null
  coucher: Date | null
}

/**
 * Lever et coucher du jour de `date`. On balaie la journée minute par minute autour de midi
 * solaire : à Ouistreham (longitude proche de 0), le jour UTC et le jour solaire coïncident
 * à quelques minutes près, donc le lever et le coucher y sont toujours dans la même fenêtre.
 */
export function jourDuSoleil(date: Date): JourDuSoleil {
  const debut = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  let lever: Date | null = null
  let coucher: Date | null = null
  let avant = positionDuSoleil(new Date(debut)).elevation
  for (let minute = 1; minute <= 1440; minute++) {
    const instant = new Date(debut + minute * 60_000)
    const apres = positionDuSoleil(instant).elevation
    if (avant < HORIZON && apres >= HORIZON && !lever) lever = instant
    if (avant >= HORIZON && apres < HORIZON && !coucher) coucher = instant
    avant = apres
  }
  return { lever, coucher }
}

export type Palier = 'aube' | 'matin' | 'midi' | 'soir' | 'nuit'

/**
 * Les cinq paliers de la lumière : nuit sous -6° (fin du crépuscule civil), aube et soir
 * tant que le soleil est sous 6°, midi au-dessus de 20°, matin ou soir entre les deux selon
 * qu'il monte (à l'est) ou qu'il descend (à l'ouest).
 */
export function palier({ elevation, azimut }: PositionSoleil): Palier {
  const matinee = azimut < 180
  if (elevation < -6) return 'nuit'
  if (elevation < 6) return matinee ? 'aube' : 'soir'
  if (elevation > 20) return 'midi'
  return matinee ? 'matin' : 'soir'
}

export const EDITIONS: Readonly<Record<Palier, string>> = {
  aube: 'édition de l’aube',
  matin: 'édition du matin',
  midi: 'édition de midi',
  soir: 'édition du soir',
  nuit: 'édition de nuit',
}

export interface Lumiere {
  /** D'où vient la lumière rasante : à gauche de la feuille le matin, à droite le soir. */
  cote: 'gauche' | 'droite'
  /** 0 = lumière plate (midi, nuit), 1 = lumière rasante, aube et crépuscule. */
  rasance: number
}

export function lumiere({ elevation, azimut }: PositionSoleil): Lumiere {
  const rasance = elevation < -6 ? 0.2 : Math.min(1, Math.max(0.15, 1 - Math.max(elevation, 0) / 30))
  return { cote: azimut < 180 ? 'gauche' : 'droite', rasance }
}

const HEURE = new Intl.DateTimeFormat('fr-FR', {
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Europe/Paris',
})

/** « 8 h 16 », à l'heure de Paris, comme on le lit sur une affiche. */
export function heureCourte(date: Date): string {
  const parties = HEURE.formatToParts(date)
  const valeur = (type: string) => parties.find((p) => p.type === type)?.value ?? '0'
  return `${valeur('hour')} h ${valeur('minute')}`
}
