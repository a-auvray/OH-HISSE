import type { ReactNode } from 'react'

import styles from './Jauges.module.css'

const FIBRES = 44

/**
 * La récupération comme un faisceau de fibres verticales qui poussent : la part
 * encrée est la part récupérée, comme sur l'accueil. Le texte se pose dessous.
 */
export function Fibres({
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
    <div className={styles.fibres}>
      <svg viewBox="0 0 220 110" role="img" aria-label={libelle}>
        {Array.from({ length: FIBRES }, (_, i) => {
          const x = 4 + (i * 212) / (FIBRES - 1)
          const penche = (i - FIBRES / 2) * 0.12
          return (
            <g key={i}>
              <line x1={x} y1="0" x2={x + penche} y2="104" className={styles.pale} />
              <line x1={x} y1="0" x2={x + penche * part} y2={104 * part} className={styles.encre} />
            </g>
          )
        })}
      </svg>
      <div className={styles.texte}>{children}</div>
    </div>
  )
}

/** L'écart comme quatre strates : une de plus encrée à chaque point gagné. */
export function Strates({ points, libelle }: { points: number; libelle: string }) {
  const pleines = Math.max(0, Math.min(4, Math.round(points)))
  return (
    <div className={styles.strates} role="img" aria-label={libelle}>
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} data-pleine={i < pleines ? true : undefined} />
      ))}
    </div>
  )
}
