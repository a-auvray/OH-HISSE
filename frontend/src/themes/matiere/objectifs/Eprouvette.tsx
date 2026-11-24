import type { ObjectifLu } from '../../../api/types'
import styles from './Eprouvette.module.css'
import { nombreDeFranges } from '../modele'

const FRANGES = ['#e6a5c2', '#8fd0a3', '#8fa8e0'] as const

/**
 * Un objectif comme une éprouvette de polymère sous lumière polarisée : les
 * franges de contrainte autour du trou se resserrent avec la progression, et
 * l'éprouvette se verrouille d'un cadre net à 100 %.
 */
export function Eprouvette({ objectif, grande = false }: { objectif: ObjectifLu; grande?: boolean }) {
  const pourcentage = Math.max(0, Math.min(100, objectif.progression?.pourcentage ?? 0))
  const franges = nombreDeFranges(pourcentage / 100)

  return (
    <div
      className={styles.eprouvette}
      data-grande={grande || undefined}
      data-verrouille={pourcentage >= 100 || undefined}
      role="progressbar"
      aria-label={objectif.titre}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pourcentage)}
    >
      <svg viewBox="0 0 160 110" aria-hidden="true">
        {Array.from({ length: franges }, (_, i) => {
          const k = franges - i
          return (
            <ellipse
              key={k}
              cx="80"
              cy="55"
              rx={10 + k * 6.4}
              ry={8 + k * 4.8}
              fill="none"
              stroke={FRANGES[k % FRANGES.length]}
              strokeWidth="2"
              opacity="0.65"
            />
          )
        })}
        <circle cx="80" cy="55" r="5" fill="#0c0b0f" />
      </svg>
      <p className={styles.chiffre}>{objectif.progression ? `${Math.round(pourcentage)} %` : '—'}</p>
    </div>
  )
}
