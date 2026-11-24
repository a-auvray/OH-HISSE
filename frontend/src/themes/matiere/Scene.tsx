import { motion } from 'motion/react'

import { useTheme } from '../contexte'
import type { PropsScene } from '../types'

const EASE = [0.16, 1, 0.3, 1] as const
const DECALAGE = { gauche: { x: -60 }, droite: { x: 60 }, haut: { y: -60 }, bas: { y: 60 } } as const

/**
 * La transition du thème Matière : la plaque se pose. La page arrive du bord
 * où se trouve son espace, un peu plus grande, et vient s'incruster dans la
 * dalle. En mode sobre, un simple fondu.
 */
export function SceneMatiere({ sens, espace, children }: PropsScene) {
  const { animation } = useTheme()
  const duree = animation === 'sobre' ? 0.3 : 0.75
  // Plein écran, comme les autres scènes : l'espace recouvre l'accueil quand il entre ou sort.
  const calque = { position: 'fixed', inset: 0, overflow: 'hidden', zIndex: espace === null ? 1 : 2 } as const

  const pose = animation === 'cinema' && sens !== null
  return (
    <motion.div
      style={calque}
      initial={pose ? { opacity: 0, scale: 1.04, ...DECALAGE[sens] } : { opacity: 0 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: animation === 'immobile' ? 0 : duree, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
