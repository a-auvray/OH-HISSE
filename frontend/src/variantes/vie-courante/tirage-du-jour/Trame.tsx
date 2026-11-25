import { type CSSProperties, useId } from 'react'

import { celluleDeLEcran, rayonDeTrame } from './modele'

/**
 * Le rose du soir et le graphite posé dessus sont deux encres fixes, définies dans la feuille de style de
 * la vue (`--rose-du-soir`, `--graphite`) : le rose fait partie de la donnée (il dit « écart mérité »), le
 * graphite sur rose tient 4,8:1 dans tous les thèmes. Le rose n'est jamais seul porteur du verdict,
 * toujours écrit en toutes lettres.
 */
export const ROSE_DU_SOIR = 'var(--rose-du-soir)'

interface Props {
  /** Couleur des points (une valeur CSS : jeton ou encre fixe). */
  couleur: string
  /** Part de la surface couverte par l'encre, de 0 à 1. */
  densite: number
  /** Multiplie le rayon : l'autre calque de la respiration est un peu plus gros. */
  grossissement?: number
  /** Hachures à 45° au lieu de points (les barres de nuit). */
  hachures?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Un calque de trame : un motif SVG de points (ou de hachures) qui remplit son conteneur. Les cellules
 * sont arrondies aux pixels physiques, ce qui évite le moiré sur les écrans à 125 % ou 150 %.
 * Le motif est décoratif : l'information est toujours aussi dite en texte.
 */
export function Trame({ couleur, densite, grossissement = 1, hachures = false, className, style }: Props) {
  const id = useId()
  const cellule = celluleDeLEcran()
  const rayon = rayonDeTrame(cellule, densite) * grossissement
  return (
    <svg className={className} style={style} width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        {hachures ? (
          <pattern
            id={id}
            width={cellule}
            height={cellule}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect
              width={Math.max(1, cellule * Math.min(0.8, densite * grossissement))}
              height={cellule}
              fill={couleur}
            />
          </pattern>
        ) : (
          <pattern id={id} width={cellule} height={cellule} patternUnits="userSpaceOnUse">
            <circle cx={cellule / 2} cy={cellule / 2} r={rayon} fill={couleur} />
          </pattern>
        )}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
