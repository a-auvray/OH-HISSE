import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import styles from './Anneau.module.css'

interface Props {
  /** De 0 à 1. */
  valeur: number
  taille?: number
  epaisseur?: number
  couleur?: string
  children?: ReactNode
  libelle: string
}

/** Jauge circulaire qui se remplit doucement (note 11 : jauges animées). */
export function Anneau({
  valeur,
  taille = 220,
  epaisseur = 14,
  couleur = 'var(--vie-courante)',
  children,
  libelle,
}: Props) {
  const rayon = 50 - epaisseur / 2
  return (
    <div className={styles.anneau} style={{ width: taille, height: taille }}>
      <svg viewBox="0 0 100 100" role="img" aria-label={libelle}>
        <circle cx="50" cy="50" r={rayon} className={styles.piste} strokeWidth={epaisseur} />
        <motion.circle
          cx="50"
          cy="50"
          r={rayon}
          fill="none"
          stroke={couleur}
          strokeWidth={epaisseur}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.001, Math.min(1, valeur)) }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 6px ${couleur})` }}
        />
      </svg>
      <div className={styles.centre}>{children}</div>
    </div>
  )
}
