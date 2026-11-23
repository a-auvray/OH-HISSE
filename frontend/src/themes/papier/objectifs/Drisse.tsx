import { motion } from 'motion/react'

import type { ObjectifLu } from '../../../api/types'
import { nombre } from '../../../commun/format'
import { echeance, STATUTS } from '../../../espaces/objectifs/useObjectifs'
import styles from './Drisse.module.css'

interface Props {
  objectif: ObjectifLu
  grande?: boolean
  rang: number
}

const HISSAGE = { type: 'spring', stiffness: 38, damping: 15 } as const

/**
 * Un objectif est un fil qu'on hisse : la pince monte à chaque nouveau 1RM,
 * la cible flotte tout en haut. Plus la pince est haute, plus on est près.
 */
export function Drisse({ objectif: o, grande = false, rang }: Props) {
  const pourcentage = Math.max(0, Math.min(100, o.progression?.pourcentage ?? 0))
  const atteinte = o.progression?.cible_atteinte ?? false
  const delai = 0.5 + rang * 0.12

  return (
    <div className={styles.drisse} data-grande={grande || undefined} data-statut={o.statut}>
      <p className={styles.cible}>
        <span>cible</span>+{nombre(o.valeur_cible_kg)} kg
      </p>

      <div
        className={styles.mat}
        role="progressbar"
        aria-label={o.titre}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pourcentage)}
      >
        <i className={styles.reste} />
        <motion.i
          className={styles.hisse}
          initial={{ height: '0%' }}
          animate={{ height: `${pourcentage}%` }}
          transition={{ ...HISSAGE, delay: delai }}
        />
        <motion.div
          className={styles.pince}
          initial={{ bottom: '0%' }}
          animate={{ bottom: `${pourcentage}%` }}
          transition={{ ...HISSAGE, delay: delai }}
        >
          <span className={styles.valeur}>
            {o.progression ? `+${nombre(o.progression.e1rm_lest_kg)}` : '—'}
          </span>
          <span className={styles.pct}>{atteinte ? 'atteint' : `${Math.round(pourcentage)} %`}</span>
        </motion.div>
      </div>

      <p className={styles.etat}>
        <span className={styles.statut}>{STATUTS[o.statut]}</span> {echeance(o.jours_restants)}
      </p>
    </div>
  )
}
