import { motion } from 'motion/react'
import { Link } from 'react-router'

import type { Direction, Espace } from '../espaces/espaces'
import { Motif } from '../espaces/Motifs'
import styles from './TuileEspace.module.css'

const FLECHE: Record<Direction, string> = { haut: '↑', bas: '↓', gauche: '←', droite: '→' }

const APPROCHE: Record<Direction, { x?: number; y?: number }> = {
  haut: { y: -70 },
  bas: { y: 70 },
  gauche: { x: -70 },
  droite: { x: 70 },
}

interface Props {
  espace: Espace
  /** Joue l'animation d'entrée (première arrivée sur l'accueil). */
  entree: boolean
  delai: number
}

const LienAnime = motion.create(Link)

/** Porte d'entrée d'un espace, à sa place dans la croix. */
export function TuileEspace({ espace, entree, delai }: Props) {
  return (
    <LienAnime
      to={espace.chemin}
      data-espace={espace.id}
      data-direction={espace.direction}
      className={`${styles.tuile} motif-hote`}
      initial={entree ? { opacity: 0, ...APPROCHE[espace.direction] } : false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 1.1, delay: delai, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.motif}>
        <Motif espace={espace.id} />
      </div>
      <div className={styles.texte}>
        <h2 className={styles.nom}>{espace.nom}</h2>
        <p className={styles.devise}>{espace.devise}</p>
      </div>
      <span className={styles.fleche} aria-hidden="true">
        {FLECHE[espace.direction]}
      </span>
    </LienAnime>
  )
}
