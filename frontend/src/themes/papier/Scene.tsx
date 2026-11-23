import { motion } from 'motion/react'

import styles from './Scene.module.css'
import { useTheme } from '../contexte'
import type { PropsScene } from '../types'
import { charniere } from './pli'

const EASE = [0.65, 0, 0.35, 1] as const

/**
 * La transition du thème Papier : l'accueil reste en place, un peu assombri,
 * et la page de l'espace se déplie par-dessus, comme un rabat, autour du bord
 * par lequel on y entre. Au retour, elle se replie et l'accueil réapparaît.
 */
export function ScenePapier({ espace, children }: PropsScene) {
  const { animation } = useTheme()
  const duree = animation === 'sobre' ? 0.5 : 1.1

  if (espace === null) {
    // L'accueil est toujours dessous : il se tasse et s'assombrit quand un rabat le recouvre.
    return (
      <motion.div
        className={styles.accueil}
        initial={{ scale: 0.97, opacity: 0.55 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0.55 }}
        transition={{ duration: duree, ease: EASE }}
      >
        {children}
      </motion.div>
    )
  }

  const { origine, axe, replie } = charniere(espace)
  const angle = animation === 'sobre' ? replie / 3 : replie
  return (
    <motion.div
      className={styles.espace}
      style={{ transformOrigin: origine, transformPerspective: 2600 }}
      initial={{ [axe]: angle }}
      animate={{ [axe]: 0 }}
      exit={{ [axe]: angle }}
      transition={{ duration: duree, ease: EASE }}
    >
      {children}
      {/* L'ombre du pli : sombre quand la page est repliée, elle s'efface à mesure qu'elle s'ouvre. */}
      <motion.div
        className={styles.ombre}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        exit={{ opacity: 0.6 }}
        transition={{ duration: duree, ease: EASE }}
      />
    </motion.div>
  )
}
