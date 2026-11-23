import { motion } from 'motion/react'

import styles from './Assiette.module.css'

const PARTS = 4

/** Chemin d'une part de l'assiette : un quart de disque, entre deux angles. */
function part(i: number): string {
  const a0 = (i / PARTS) * Math.PI * 2 - Math.PI / 2
  const a1 = ((i + 1) / PARTS) * Math.PI * 2 - Math.PI / 2
  const r = 38
  const p = (a: number) => `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`
  return `M50,50 L${p(a0)} A${r},${r} 0 0 1 ${p(a1)} Z`
}

/**
 * L'assiette de l'écart : un point de plus, une part de plus. Quand elle est
 * pleine, c'est mérité. Les parts arrivent une à une.
 */
export function Assiette({ points, libelle }: { points: number; libelle: string }) {
  const pleines = Math.max(0, Math.min(PARTS, Math.round(points)))
  return (
    <svg className={styles.assiette} viewBox="0 0 100 100" role="img" aria-label={libelle}>
      <circle cx="50" cy="50" r="46" className={styles.bord} />
      <circle cx="50" cy="50" r="40" className={styles.creux} />
      {Array.from({ length: PARTS }, (_, i) => (
        <motion.path
          key={i}
          d={part(i)}
          className={i < pleines ? styles.pleine : styles.vide}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ transformOrigin: '50px 50px' }}
          transition={{ duration: 0.8, delay: 0.4 + i * 0.18, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <circle cx="50" cy="50" r="2.4" className={styles.centre} />
    </svg>
  )
}
