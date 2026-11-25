import { jourDe } from './modele'

/*
 * La dernière visite : elle décide si la planche se développe en entier (au premier passage du jour,
 * ou quand une donnée a changé depuis) ou seulement en un fondu, et d'où partent les chiffres qui
 * comptent. Elle vit dans le navigateur ; sans stockage, chaque visite est la première.
 */

export const CLE_VISITE = 'oh-hisse.tirage-et-calque.visite'

export interface Visite {
  /** Le jour de la visite, AAAA-MM-JJ. */
  jour: string
  /** L'empreinte des objectifs vus alors (voir `empreinte`). */
  empreinte: string
  /** Le pourcentage de chaque objectif, par identifiant. */
  pourcentages: Record<string, number>
}

function estVisite(valeur: unknown): valeur is Visite {
  if (typeof valeur !== 'object' || valeur === null) return false
  const v = valeur as Record<string, unknown>
  return (
    typeof v.jour === 'string' &&
    typeof v.empreinte === 'string' &&
    typeof v.pourcentages === 'object' &&
    v.pourcentages !== null
  )
}

export function lireVisite(): Visite | null {
  try {
    const brut: unknown = JSON.parse(localStorage.getItem(CLE_VISITE) ?? 'null')
    return estVisite(brut) ? brut : null
  } catch {
    return null
  }
}

export function ecrireVisite(visite: Visite): void {
  try {
    localStorage.setItem(CLE_VISITE, JSON.stringify(visite))
  } catch {
    // Stockage indisponible (navigation privée…) : la prochaine visite sera une première.
  }
}

/** Le développement complet : première visite, nouveau jour, ou une donnée a changé depuis. */
export function developpementComplet(visite: Visite | null, aujourdhui: string, empreinte: string): boolean {
  return !visite || visite.jour !== aujourdhui || visite.empreinte !== empreinte
}

/** Le nombre de jours depuis la dernière visite, ou null s'il n'y en a pas. */
export function joursDepuis(visite: Visite | null, aujourdhui: string): number | null {
  return visite ? jourDe(aujourdhui) - jourDe(visite.jour) : null
}
