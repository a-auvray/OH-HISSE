import type { IdEspace } from '../../espaces/espaces'

export interface Charniere {
  /** Point autour duquel la page se déplie : le bord tourné vers l'accueil. */
  origine: string
  axe: 'rotateX' | 'rotateY'
  /** Angle de la page quand elle est repliée (de chant, donc invisible). */
  replie: number
}

/**
 * La page d'un espace se déplie autour du bord par lequel on y est arrivé :
 * Marine, à droite de l'accueil, est articulée sur son bord gauche ; Vie
 * courante, au-dessus, sur son bord bas.
 */
export function charniere(espace: IdEspace): Charniere {
  switch (espace) {
    case 'marine':
      return { origine: '0% 50%', axe: 'rotateY', replie: 90 }
    case 'streetlifting':
      return { origine: '100% 50%', axe: 'rotateY', replie: -90 }
    case 'vie-courante':
      return { origine: '50% 100%', axe: 'rotateX', replie: 90 }
    case 'objectifs':
      return { origine: '50% 0%', axe: 'rotateX', replie: -90 }
  }
}
