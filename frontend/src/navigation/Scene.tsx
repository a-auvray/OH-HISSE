import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'

import type { Direction } from '../espaces/espaces'
import { horsEcran, OPPOSE } from './directions'
import styles from './Scene.module.css'

/**
 * Une page plein écran qui glisse : elle entre depuis le côté vers lequel on
 * se dirige, et l'ancienne sort par le côté opposé. Les deux bougent ensemble,
 * comme un seul plan qui défile.
 */
const variantes: Variants = {
  entree: (sens: Direction | null) => (sens ? { ...horsEcran(sens), opacity: 1 } : { opacity: 0 }),
  presente: { x: '0%', y: '0%', opacity: 1 },
  sortie: (sens: Direction | null) => (sens ? { ...horsEcran(OPPOSE[sens]), opacity: 1 } : { opacity: 0 }),
}

export function Scene({ sens, children }: { sens: Direction | null; children: ReactNode }) {
  return (
    <motion.div
      className={styles.scene}
      variants={variantes}
      custom={sens}
      initial="entree"
      animate="presente"
      exit="sortie"
      transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
    >
      {children}
    </motion.div>
  )
}
