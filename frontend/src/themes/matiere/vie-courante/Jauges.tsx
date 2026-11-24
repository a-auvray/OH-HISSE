import type { ReactNode } from 'react'

import styles from './Jauges.module.css'

/**
 * La récupération comme un disque d'albâtre : plus on est récupéré, plus la
 * lumière du jour le traverse. Peu de récupération, la pierre s'éteint.
 */
export function Albatre({
  progression,
  libelle,
  children,
}: {
  progression: number
  libelle: string
  children: ReactNode
}) {
  const part = Math.max(0, Math.min(1, progression))
  return (
    <div className={styles.albatre} style={{ ['--lumiere' as string]: part }}>
      <span role="img" aria-label={libelle} className={styles.pierre} />
      <div className={styles.texte}>{children}</div>
    </div>
  )
}

/** L'écart comme quatre éprouvettes : une de plus sous contrainte à chaque point gagné. */
export function Eprouvettes({ points, libelle }: { points: number; libelle: string }) {
  const pleines = Math.max(0, Math.min(4, Math.round(points)))
  return (
    <div className={styles.eprouvettes} role="img" aria-label={libelle}>
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} data-pleine={i < pleines ? true : undefined} />
      ))}
    </div>
  )
}
