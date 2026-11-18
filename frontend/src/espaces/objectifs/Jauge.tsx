import { motion } from 'motion/react'
import { useId } from 'react'

import styles from './Jauge.module.css'

interface Props {
  /** De 0 à 100. */
  pourcentage: number
  valeur: string
  cible: string
  atteinte: boolean
  taille?: number
}

const OUVERTURE = 270 // degrés d'arc
const DEBUT = 135 // départ en bas à gauche

function point(cx: number, cy: number, r: number, angle: number): [number, number] {
  const radians = (angle * Math.PI) / 180
  return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)]
}

function arc(cx: number, cy: number, r: number, de: number, a: number): string {
  const [x1, y1] = point(cx, cy, r, de)
  const [x2, y2] = point(cx, cy, r, a)
  return `M ${x1} ${y1} A ${r} ${r} 0 ${a - de > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

/** Jauge en arc : la tension vers la cible se lit d'un coup d'œil (note 11). */
export function Jauge({ pourcentage, valeur, cible, atteinte, taille = 340 }: Props) {
  const degrade = `jauge${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const c = 100
  const r = 84
  const piste = arc(c, c, r, DEBUT, DEBUT + OUVERTURE)
  const graduations = Array.from({ length: 28 }, (_, i) => DEBUT + (OUVERTURE * i) / 27)

  return (
    <div
      className={styles.jauge}
      data-atteinte={atteinte || undefined}
      style={{ width: taille, height: taille }}
    >
      <svg viewBox="0 0 200 200" role="img" aria-label={`${Math.round(pourcentage)} % de la cible`}>
        <defs>
          <linearGradient id={degrade} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--objectifs)" />
            <stop offset="100%" stopColor="var(--objectifs-clair)" />
          </linearGradient>
        </defs>
        {graduations.map((angle, i) => {
          const [x1, y1] = point(c, c, 96, angle)
          const [x2, y2] = point(c, c, i % 9 === 0 ? 90 : 93, angle)
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} className={styles.graduation} />
        })}
        <path d={piste} className={styles.piste} />
        <motion.path
          d={piste}
          className={styles.progression}
          stroke={`url(#${degrade})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.001, pourcentage / 100) }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className={styles.centre}>
        <span className={styles.valeur}>{valeur}</span>
        <span className={styles.cible}>/ {cible}</span>
        <span className={styles.pourcentage}>
          {atteinte ? 'Cible atteinte' : `${Math.round(pourcentage)} %`}
        </span>
      </div>
    </div>
  )
}
