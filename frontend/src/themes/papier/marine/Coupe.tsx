import { useId } from 'react'

import { nombre } from '../../../commun/format'
import { heureCourte } from '../../../espaces/marine/titre'
import {
  cheminDeHoule,
  cheminDeLEau,
  cheminDuSable,
  HAUTEUR,
  LARGEUR,
  positionDeLEau,
  traitDuSable,
  yDeHauteur,
} from './geometrieCoupe'
import styles from './Coupe.module.css'

interface Maree {
  type: 'PM' | 'BM'
  instant: string
  hauteur_m: number
}

interface Props {
  /** Niveau de l'eau, en mètres au-dessus du zéro des cartes. */
  hauteur: number
  houleM: number | null
  periodeS: number | null
  marees: readonly Maree[]
  /** Distance à pied jusqu'à l'eau, quand on la connaît pour l'instant affiché. */
  distanceM: number | null
  description: string
}

const GRADUATIONS = [0, 2, 4, 6, 8]

/**
 * La plage en coupe : le sable en pointillé, l'eau en hachures qui monte et
 * recule avec la marée, la houle qui dérive en surface. Dessin au trait, comme
 * une planche de relevé.
 */
export function Coupe({ hauteur, houleM, periodeS, marees, distanceM, description }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const surface = yDeHauteur(hauteur)
  const depart = positionDeLEau(hauteur) * LARGEUR
  const amplitude = Math.min(14, Math.max(3, (houleM ?? 0.4) * 14))
  const periodePx = 120
  const duree = Math.min(14, Math.max(4, (periodeS ?? 6) * 0.9))
  const eau = cheminDeLEau(hauteur)

  return (
    <svg className={styles.coupe} viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="img" aria-label={description}>
      <defs>
        <pattern id={`sable${id}`} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.9" className={styles.grain} />
          <circle cx="6.5" cy="6" r="0.7" className={styles.grain} />
        </pattern>
        <pattern id={`eau${id}`} width="10" height="7" patternUnits="userSpaceOnUse">
          <line x1="0" y1="3" x2="10" y2="3" className={styles.hachure} />
        </pattern>
        {eau && (
          <clipPath id={`clip${id}`}>
            <path d={eau} />
          </clipPath>
        )}
      </defs>

      {GRADUATIONS.map((m) => (
        <g key={m} transform={`translate(0 ${yDeHauteur(m)})`}>
          <line x1={LARGEUR - 14} x2={LARGEUR} className={styles.graduation} />
          <text x={LARGEUR - 20} y={4} textAnchor="end" className={styles.legende}>
            {m} m
          </text>
        </g>
      ))}

      {marees.map((m, i) => (
        <g key={m.instant} transform={`translate(0 ${yDeHauteur(m.hauteur_m)})`}>
          <line x1={0} x2={LARGEUR - 70} className={styles.repere} />
          <text x={6 + (i % 3) * 300} y={-6} className={styles.legende}>
            {m.type === 'PM' ? 'pleine mer' : 'basse mer'} {heureCourte(m.instant)} · {nombre(m.hauteur_m)} m
          </text>
        </g>
      ))}

      <path d={cheminDuSable()} fill={`url(#sable${id})`} />
      <path d={traitDuSable()} className={styles.traitSable} fill="none" />

      {eau && (
        <>
          <path d={eau} className={styles.aplat} />
          <path d={eau} fill={`url(#eau${id})`} />
          <g clipPath={`url(#clip${id})`}>
            <g className={styles.houle} style={{ animationDuration: `${duree}s` }}>
              <path
                d={cheminDeHoule(surface, amplitude, periodePx, -periodePx, LARGEUR + periodePx * 2)}
                className={styles.surface}
                fill="none"
              />
              <path
                d={cheminDeHoule(
                  surface + 7,
                  amplitude * 0.6,
                  periodePx * 0.75,
                  -periodePx,
                  LARGEUR + periodePx * 2,
                )}
                className={styles.surfaceSecondaire}
                fill="none"
              />
            </g>
          </g>
          <g transform={`translate(${depart} ${surface})`}>
            <line y1={-6} y2={22} className={styles.rivage} />
            {distanceM !== null && (
              <text x={8} y={-10} className={styles.legende}>
                {distanceM === 0
                  ? 'l’eau au pied de la digue'
                  : `≈ ${nombre(distanceM)} m de sable jusqu’à l’eau`}
              </text>
            )}
          </g>
        </>
      )}
    </svg>
  )
}
