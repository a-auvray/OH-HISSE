import { motion } from 'motion/react'

import { useTheme } from '../contexte'
import type { PropsScene } from '../types'

const EASE = [0.65, 0, 0.35, 1] as const

/**
 * La transition du thème Estampe : une passe d'encre. La page entre par le bord
 * d'où le faisceau est parti, en se révélant comme une épreuve que l'on tire.
 * Un fondu seulement en mode sobre.
 */
export function SceneEstampe({ sens, espace, children }: PropsScene) {
  const { animation } = useTheme()
  const duree = animation === 'sobre' ? 0.35 : 0.8
  // Comme les autres scènes : plein écran, l'espace recouvre l'accueil quand il entre ou sort.
  const calque = { position: 'fixed', inset: 0, overflow: 'hidden', zIndex: espace === null ? 1 : 2 } as const

  if (animation === 'sobre' || animation === 'immobile' || sens === null) {
    return (
      <motion.div
        style={calque}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: animation === 'immobile' ? 0 : duree, ease: EASE }}
      >
        {children}
      </motion.div>
    )
  }

  // L'espace se révèle depuis son bord ; l'accueil se révèle du centre vers les bords.
  const depart =
    espace === null
      ? 'inset(50% 50% 50% 50%)'
      : sens === 'gauche'
        ? 'inset(0 100% 0 0)'
        : sens === 'droite'
          ? 'inset(0 0 0 100%)'
          : sens === 'haut'
            ? 'inset(0 0 100% 0)'
            : 'inset(100% 0 0 0)'

  return (
    <motion.div
      style={calque}
      initial={{ clipPath: depart, opacity: 0.4 }}
      animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: duree, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
