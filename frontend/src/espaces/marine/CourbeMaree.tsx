import { curveMonotoneX } from '@visx/curve'
import { LinearGradient } from '@visx/gradient'
import { scaleLinear, scaleTime } from '@visx/scale'
import { AreaClosed, LinePath } from '@visx/shape'
import { motion } from 'motion/react'
import { useId } from 'react'

import { nombre } from '../../commun/format'
import { heure } from './lecture'
import styles from './CourbeMaree.module.css'

interface Point {
  instant: string
  hauteur: number
}

interface Repere {
  type: 'PM' | 'BM'
  instant: string
  hauteur_m: number
  coefficient?: number | null
}

interface Props {
  points: Point[]
  reperes: Repere[]
  maintenant: string
  largeur: number
  hauteur?: number
}

const MARGE = { haut: 34, bas: 26, cote: 8 }

/** La marée des prochaines 24 h : une vague d'eau, le « maintenant », les PM et BM. */
export function CourbeMaree({ points, reperes, maintenant, largeur, hauteur = 220 }: Props) {
  const degrade = `maree${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  if (points.length < 2 || largeur <= 0) return null

  const l = largeur - MARGE.cote * 2
  const h = hauteur - MARGE.haut - MARGE.bas
  const temps = points.map((p) => new Date(p.instant))
  const debut = temps[0]!
  const fin = temps.at(-1)!
  const x = scaleTime({ domain: [debut, fin], range: [0, l] })
  const y = scaleLinear({ domain: [0, 8], range: [h, 0] }) // 0 à 8 m au-dessus du zéro des cartes
  const xMaintenant = x(new Date(maintenant))
  const visibles = reperes.filter((r) => {
    const t = new Date(r.instant)
    return t >= debut && t <= fin
  })

  return (
    <svg
      width={largeur}
      height={hauteur}
      className={styles.courbe}
      role="img"
      aria-label="Hauteur d’eau sur 24 h"
    >
      <LinearGradient
        id={degrade}
        from="var(--marine-clair)"
        to="var(--marine)"
        fromOpacity={0.55}
        toOpacity={0.05}
      />
      <g transform={`translate(${MARGE.cote}, ${MARGE.haut})`}>
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
        >
          <AreaClosed
            data={points}
            x={(p) => x(new Date(p.instant))}
            y={(p) => y(p.hauteur)}
            yScale={y}
            curve={curveMonotoneX}
            fill={`url(#${degrade})`}
          />
          <LinePath
            data={points}
            x={(p) => x(new Date(p.instant))}
            y={(p) => y(p.hauteur)}
            curve={curveMonotoneX}
            stroke="var(--marine-clair)"
            strokeWidth={2}
          />
        </motion.g>

        {visibles.map((r) => {
          const cx = x(new Date(r.instant))
          const cy = y(r.hauteur_m)
          const haut = r.type === 'PM'
          return (
            <g key={r.instant} className={styles.repere}>
              <circle cx={cx} cy={cy} r={4} />
              <text x={cx} y={haut ? cy - 12 : cy + 20} textAnchor="middle">
                {r.type} {heure(r.instant)} · {nombre(r.hauteur_m)} m
                {r.coefficient ? ` · ${r.coefficient}` : ''}
              </text>
            </g>
          )
        })}

        <line x1={xMaintenant} x2={xMaintenant} y1={-10} y2={h} className={styles.maintenant} />
        <text x={xMaintenant} y={-16} textAnchor="middle" className={styles.libelleMaintenant}>
          maintenant
        </text>
      </g>
    </svg>
  )
}
