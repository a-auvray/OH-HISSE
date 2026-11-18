import { motion } from 'motion/react'

import type { Danger, Niveau } from '../../api/types'
import styles from './BadgeDanger.module.css'

const LIBELLE_NIVEAU: Record<Niveau, string> = {
  vert: 'Vert',
  rouge: 'Rouge',
  noir: 'Noir',
}

const PHRASE: Record<Niveau, string> = {
  vert: 'Conditions favorables',
  rouge: 'Prudence : sortie déconseillée sans expérience',
  noir: 'Ne pas y aller',
}

/** Pastille de niveau seule (frise des heures, carnet, accueil). */
export function Pastille({ niveau, taille = 10 }: { niveau: Niveau; taille?: number }) {
  return (
    <span
      className={styles.pastille}
      data-niveau={niveau}
      style={{ width: taille, height: taille }}
      role="img"
      aria-label={`Niveau ${LIBELLE_NIVEAU[niveau].toLowerCase()}`}
    />
  )
}

/** Badge de danger avec ses raisons (note 04) : vert, rouge ou noir. */
export function BadgeDanger({ danger, grand = false }: { danger: Danger; grand?: boolean }) {
  return (
    <div className={styles.badge} data-niveau={danger.niveau} data-grand={grand || undefined} role="status">
      <motion.span
        className={styles.disque}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      />
      <div className={styles.texte}>
        <strong>{LIBELLE_NIVEAU[danger.niveau]}</strong>
        <span>{PHRASE[danger.niveau]}</span>
        {danger.raisons.length > 0 && (
          <ul>
            {danger.raisons.map((r) => (
              <li key={r.texte} data-niveau={r.niveau}>
                {r.texte}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
