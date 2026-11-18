import { ESPACES, type Direction } from '../espaces/espaces'

export const OPPOSE: Record<Direction, Direction> = {
  haut: 'bas',
  bas: 'haut',
  gauche: 'droite',
  droite: 'gauche',
}

/** Position hors écran, du côté `direction`. */
export function horsEcran(direction: Direction): { x: string; y: string } {
  switch (direction) {
    case 'haut':
      return { x: '0%', y: '-100%' }
    case 'bas':
      return { x: '0%', y: '100%' }
    case 'gauche':
      return { x: '-100%', y: '0%' }
    case 'droite':
      return { x: '100%', y: '0%' }
  }
}

/**
 * Sens du déplacement entre deux pages, vu comme une caméra qui survole la
 * croix : de l'accueil vers Marine (à droite), on part à droite ; de Marine
 * vers l'accueil, on revient à gauche.
 */
export function sensDuTrajet(depuis: string, vers: string): Direction | null {
  const cible = ESPACES.find((e) => e.chemin === vers)
  if (cible && depuis === '/') return cible.direction
  const origine = ESPACES.find((e) => e.chemin === depuis)
  if (origine && vers === '/') return OPPOSE[origine.direction]
  if (origine && cible) return cible.direction
  return null
}
