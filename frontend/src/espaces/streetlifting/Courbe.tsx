import { AxisBottom, AxisLeft } from '@visx/axis'
import { curveMonotoneX } from '@visx/curve'
import { LinearGradient } from '@visx/gradient'
import { GridRows } from '@visx/grid'
import { Group } from '@visx/group'
import { scaleLinear, scaleTime } from '@visx/scale'
import { AreaClosed, LinePath } from '@visx/shape'
import { motion } from 'motion/react'
import { type MouseEvent, useId, useState } from 'react'

import { dateCourte, depuisIso, nombre } from '../../commun/format'
import type { Point } from './chronologie'
import styles from './Courbe.module.css'

interface Props {
  points: Point[]
  largeur: number
  hauteur: number
  unite: string
}

const MARGES = { haut: 24, droite: 24, bas: 40, gauche: 56 }
const x = (p: Point) => depuisIso(p.date)
const y = (p: Point) => p.valeur

/** Courbe d'évolution : aire dégradée, tracé animé, détail au survol. */
export function Courbe({ points, largeur, hauteur, unite }: Props) {
  const degrade = `degrade${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [survol, setSurvol] = useState<Point | null>(null)
  const l = Math.max(0, largeur - MARGES.gauche - MARGES.droite)
  const h = Math.max(0, hauteur - MARGES.haut - MARGES.bas)

  const dates = points.map(x)
  const valeurs = points.map(y)
  const min = Math.min(...valeurs)
  const max = Math.max(...valeurs)
  const marge = (max - min) * 0.15 || Math.max(1, max * 0.1)

  const echelleX = scaleTime({
    range: [0, l],
    domain:
      points.length > 1
        ? [dates[0]!, dates.at(-1)!]
        : [new Date(+dates[0]! - 864e5), new Date(+dates[0]! + 864e5)],
  })
  const echelleY = scaleLinear({ range: [h, 0], domain: [Math.max(0, min - marge), max + marge], nice: true })

  function suivre(evenement: MouseEvent<SVGRectElement>) {
    const cadre = evenement.currentTarget.getBoundingClientRect()
    const date = echelleX.invert(evenement.clientX - cadre.left)
    const proche = points.reduce((a, b) => (Math.abs(+x(b) - +date) < Math.abs(+x(a) - +date) ? b : a))
    setSurvol(proche)
  }

  return (
    <div className={styles.courbe}>
      <svg width={largeur} height={hauteur} role="img" aria-label={`Évolution en ${unite}`}>
        <LinearGradient
          id={degrade}
          from="var(--streetlifting)"
          to="var(--streetlifting)"
          fromOpacity={0.45}
          toOpacity={0}
        />
        <Group left={MARGES.gauche} top={MARGES.haut}>
          <GridRows scale={echelleY} width={l} numTicks={5} stroke="#2c2420" strokeDasharray="3 5" />
          <AreaClosed
            data={points}
            x={(p) => echelleX(x(p))}
            y={(p) => echelleY(y(p))}
            yScale={echelleY}
            curve={curveMonotoneX}
            fill={`url(#${degrade})`}
          />
          <LinePath data={points} x={(p) => echelleX(x(p))} y={(p) => echelleY(y(p))} curve={curveMonotoneX}>
            {({ path }) => (
              <motion.path
                d={path(points) ?? ''}
                fill="none"
                stroke="var(--streetlifting-clair)"
                strokeWidth={3}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </LinePath>
          {points.map((p, i) => (
            <motion.circle
              key={p.date}
              cx={echelleX(x(p))}
              cy={echelleY(y(p))}
              r={survol === p ? 7 : 4}
              fill={survol === p ? 'var(--streetlifting-clair)' : '#110c09'}
              stroke="var(--streetlifting)"
              strokeWidth={2}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + (i / points.length) * 0.8 }}
            />
          ))}
          {survol && (
            <line
              x1={echelleX(x(survol))}
              x2={echelleX(x(survol))}
              y1={0}
              y2={h}
              stroke="var(--streetlifting)"
              strokeOpacity={0.5}
              strokeDasharray="4 4"
            />
          )}
          <AxisLeft
            scale={echelleY}
            numTicks={5}
            stroke="transparent"
            tickStroke="transparent"
            tickFormat={(v) => nombre(Number(v))}
            tickLabelProps={{
              fill: 'var(--texte-faible)',
              fontSize: 11,
              fontFamily: 'var(--police-chiffres)',
            }}
          />
          <AxisBottom
            top={h}
            scale={echelleX}
            numTicks={Math.min(6, points.length)}
            stroke="#3a2f28"
            tickStroke="#3a2f28"
            tickFormat={(v) => dateCourte((v as Date).toISOString().slice(0, 10))}
            tickLabelProps={{ fill: 'var(--texte-faible)', fontSize: 11, fontFamily: 'var(--police-texte)' }}
          />
          <rect
            width={l}
            height={h}
            fill="transparent"
            onMouseMove={suivre}
            onMouseLeave={() => setSurvol(null)}
          />
        </Group>
      </svg>

      {survol && (
        <div
          className={styles.bulle}
          style={{
            left: MARGES.gauche + echelleX(x(survol)),
            top: MARGES.haut + echelleY(y(survol)),
          }}
        >
          <strong>
            {nombre(survol.valeur)} <span>{unite}</span>
          </strong>
          <span>
            {dateCourte(survol.date)}
            {survol.seances > 1 ? ` · ${survol.seances} séances` : ''}
          </span>
        </div>
      )}
    </div>
  )
}
