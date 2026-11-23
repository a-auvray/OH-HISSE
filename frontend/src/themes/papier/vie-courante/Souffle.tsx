import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import styles from './Souffle.module.css'

const EXPO = [0.16, 1, 0.3, 1] as const

/**
 * Anneaux concentriques qui respirent doucement, et un arc qui dit où l'on en
 * est de la récupération. Rien ne clignote : le mouvement est un souffle lent.
 */
export function Souffle({
  progression,
  libelle,
  children,
}: {
  progression: number
  libelle: string
  children: ReactNode
}) {
  const valeur = Math.max(0.004, Math.min(1, progression))
  return (
    <div className={styles.souffle}>
      <svg viewBox="0 0 200 200" role="img" aria-label={libelle}>
        {[88, 74, 60].map((r, i) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            className={styles.anneau}
            style={{ animationDelay: `${i * 1.1}s` }}
          />
        ))}
        <circle cx="100" cy="100" r="88" className={styles.piste} />
        <motion.circle
          cx="100"
          cy="100"
          r="88"
          className={styles.arc}
          transform="rotate(-90 100 100)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: valeur }}
          transition={{ duration: 2.2, delay: 0.3, ease: EXPO }}
        />
      </svg>
      <div className={styles.centre}>{children}</div>
    </div>
  )
}
