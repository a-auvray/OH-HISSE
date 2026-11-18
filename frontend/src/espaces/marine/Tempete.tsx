import { motion } from 'motion/react'
import { useEffect } from 'react'

import styles from './Tempete.module.css'

/**
 * Easter egg « Essuyer une tempête ! » (note 07). Secret : il n'apparaît qu'au
 * retour d'une sortie notée par vent de force 10. Jamais présenté comme une
 * réussite : à ce vent, le danger était noir.
 */
export function Tempete({ fermer }: { fermer: () => void }) {
  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && fermer()
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [fermer])

  return (
    <motion.div
      className={styles.tempete}
      role="dialog"
      aria-modal="true"
      aria-label="Essuyer une tempête !"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={fermer}
    >
      {/* Rafales qui traversent l'écran */}
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span
          key={i}
          className={styles.rafale}
          style={{ top: `${6 + i * 6.5}%` }}
          initial={{ x: '-30vw' }}
          animate={{ x: '130vw' }}
          transition={{
            duration: 0.7 + (i % 4) * 0.25,
            repeat: Infinity,
            delay: (i * 0.13) % 1,
            ease: 'linear',
          }}
        />
      ))}
      <motion.div
        className={styles.eclair}
        animate={{ opacity: [0, 0, 1, 0, 0.7, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.55, 0.58, 0.62, 0.65, 0.7] }}
      />

      <motion.div
        className={styles.badge}
        initial={{ scale: 0.3, rotate: -14, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true" className={styles.icone}>
          <path d="M14 34h34a10 10 0 0 0 0-20 14 14 0 0 0-26.8 3.4A8.4 8.4 0 0 0 14 34z" />
          <path d="M34 36l-7 12h9l-5 12" className={styles.foudre} />
        </svg>
        <p className={styles.titre}>Essuyer une tempête !</p>
        <p className={styles.clin}>Tu es rentré. On n’en parle plus.</p>
        <p className={styles.serieux}>Force 10 : le niveau était noir. Ce badge n’est pas un objectif.</p>
        <button type="button" onClick={fermer}>
          Fermer
        </button>
      </motion.div>
    </motion.div>
  )
}
