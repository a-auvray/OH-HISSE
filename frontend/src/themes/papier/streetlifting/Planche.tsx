import { type MouseEvent, useId, useState } from 'react'

import { dateCourte, depuisIso, nombre } from '../../../commun/format'
import type { Point } from '../../../espaces/streetlifting/chronologie'
import { cheminLisse, echelle, graduations } from '../courbe'
import styles from './Planche.module.css'

interface Props {
  points: readonly Point[]
  largeur: number
  hauteur: number
  unite: string
}

const MARGES = { haut: 18, droite: 20, bas: 38, gauche: 58 }

/**
 * Une planche : un seul graphique, grand, tracé comme sur du papier millimétré.
 * Le tracé se dessine à l'apparition, le survol donne la valeur exacte.
 */
export function Planche({ points, largeur, hauteur, unite }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [survol, setSurvol] = useState<number | null>(null)
  const l = Math.max(0, largeur - MARGES.gauche - MARGES.droite)
  const h = Math.max(0, hauteur - MARGES.haut - MARGES.bas)

  const temps = points.map((p) => depuisIso(p.date).getTime())
  const valeurs = points.map((p) => p.valeur)
  const [t0, t1] = [Math.min(...temps), Math.max(...temps)]
  const [v0, v1] = [Math.min(...valeurs), Math.max(...valeurs)]
  const marge = (v1 - v0) * 0.15 || Math.max(1, v1 * 0.1)
  const bas = v0 - marge
  const haut = v1 + marge

  const xs = temps.map((t) => echelle(t, t0, t1, 0, l))
  const ys = valeurs.map((v) => echelle(v, bas, haut, h, 0))
  const ligne = cheminLisse(xs.map((x, i) => ({ x, y: ys[i] ?? 0 })))
  const aire = `${ligne} L${xs.at(-1)?.toFixed(1)},${h} L${xs[0]?.toFixed(1)},${h} Z`
  const graduees = graduations(bas, haut, 4)

  const survoler = (e: MouseEvent<SVGRectElement>) => {
    const boite = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - boite.left
    let proche = 0
    xs.forEach((px, i) => {
      if (Math.abs(px - x) < Math.abs((xs[proche] ?? 0) - x)) proche = i
    })
    setSurvol(proche)
  }

  const actif = survol === null ? null : points[survol]
  const axActif = survol === null ? 0 : (xs[survol] ?? 0)
  const ayActif = survol === null ? 0 : (ys[survol] ?? 0)

  return (
    <svg
      className={styles.planche}
      width={largeur}
      height={hauteur}
      role="img"
      aria-label={`Graphique en ${unite}, de ${nombre(v0)} à ${nombre(v1)}, ${points.length} points`}
    >
      <defs>
        <pattern
          id={`hachure${id}`}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" className={styles.hachure} />
        </pattern>
      </defs>
      <g transform={`translate(${MARGES.gauche} ${MARGES.haut})`}>
        {graduees.map((v) => {
          const y = echelle(v, bas, haut, h, 0)
          return (
            <g key={v} transform={`translate(0 ${y})`}>
              <line x1={0} x2={l} className={styles.grille} />
              <text x={-10} y={4} textAnchor="end" className={styles.graduation}>
                {nombre(v)}
              </text>
            </g>
          )
        })}

        <path d={aire} fill={`url(#hachure${id})`} className={styles.aire} />
        <path d={ligne} className={styles.trait} fill="none" pathLength={1} />
        {xs.map((x, i) => (
          <circle
            key={temps[i]}
            cx={x}
            cy={ys[i]}
            r={i === xs.length - 1 ? 5.5 : 3.5}
            className={i === xs.length - 1 ? styles.dernier : styles.point}
          />
        ))}

        {actif && (
          <g className={styles.reperage}>
            <line x1={axActif} x2={axActif} y1={0} y2={h} />
            <circle cx={axActif} cy={ayActif} r={7} />
            <g
              transform={`translate(${Math.min(Math.max(axActif, 60), l - 60)} ${Math.max(ayActif - 16, 10)})`}
            >
              <text textAnchor="middle" className={styles.valeur}>
                {nombre(actif.valeur)} {unite.startsWith('kg') ? 'kg' : ''}
              </text>
              <text textAnchor="middle" y={-16} className={styles.date}>
                {dateCourte(actif.date)}
                {actif.seances > 1 ? ` · ${actif.seances} séances` : ''}
              </text>
            </g>
          </g>
        )}

        <text x={0} y={h + 26} className={styles.graduation}>
          {dateCourte(points[0]?.date ?? '')}
        </text>
        <text x={l} y={h + 26} textAnchor="end" className={styles.graduation}>
          {dateCourte(points.at(-1)?.date ?? '')}
        </text>

        <rect
          x={0}
          y={0}
          width={l}
          height={h}
          fill="transparent"
          onMouseMove={survoler}
          onMouseLeave={() => setSurvol(null)}
        />
      </g>
    </svg>
  )
}
