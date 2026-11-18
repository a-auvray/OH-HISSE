import { motion } from 'motion/react'

import { ESPACES, type Direction } from '../espaces/espaces'
import styles from './Lueurs.module.css'

/** D'où chaque lueur entre à l'écran : depuis le bord de son espace. */
const DEPART: Record<Direction, { x: number; y: number }> = {
  haut: { x: 0, y: -80 },
  bas: { x: 0, y: 80 },
  gauche: { x: -80, y: 0 },
  droite: { x: 80, y: 0 },
}

/**
 * Quatre halos colorés, un par espace, posés à leur place dans la croix de
 * navigation (Vie courante en haut, Marine à droite…). Ils respirent
 * lentement en fond : on devine les espaces avant même d'y entrer.
 */
export function Lueurs({ intensite = 1 }: { intensite?: number }) {
  return (
    <div className={styles.lueurs} aria-hidden="true">
      {ESPACES.map((espace, i) => (
        <motion.div
          key={espace.id}
          className={styles.lueur}
          data-direction={espace.direction}
          style={{ background: `var(--${espace.id})` }}
          initial={{ opacity: 0, ...DEPART[espace.direction] }}
          animate={{ opacity: 0.55 * intensite, x: 0, y: 0 }}
          transition={{ duration: 1.6, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <div className={styles.grain} />
    </div>
  )
}
