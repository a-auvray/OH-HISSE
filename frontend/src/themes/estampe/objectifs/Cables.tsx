import type { ObjectifLu } from '../../../api/types'
import styles from './Cables.module.css'

const CABLES = 18

/**
 * Un objectif comme une drisse : des câbles tendus du bord vers le centre, qui
 * perdent leur mou à mesure que la progression avance, et se verrouillent à 100 %.
 */
export function Cables({ objectif, grande = false }: { objectif: ObjectifLu; grande?: boolean }) {
  const pourcentage = Math.max(0, Math.min(100, objectif.progression?.pourcentage ?? 0))
  const mou = 1 - pourcentage / 100
  const [l, h] = grande ? [300, 190] : [190, 110]

  return (
    <div
      className={styles.cables}
      data-grande={grande || undefined}
      data-verrouille={pourcentage >= 100 || undefined}
      role="progressbar"
      aria-label={objectif.titre}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pourcentage)}
    >
      <svg viewBox={`0 0 ${l} ${h}`} aria-hidden="true">
        {Array.from({ length: CABLES }, (_, i) => {
          const x0 = 6 + (i * (l - 12)) / (CABLES - 1)
          const x1 = l / 2 - 14 + (i * 28) / (CABLES - 1)
          const ancre = h * 0.18
          const creux = Math.sin(Math.PI * 0.5) * h * 0.2 * mou
          return (
            <path
              key={i}
              d={`M${x0},${h} Q${(x0 + x1) / 2},${(h + ancre) / 2 + creux} ${x1},${ancre}`}
              fill="none"
              className={styles.cable}
              style={{ opacity: 0.35 + 0.65 * (pourcentage / 100) }}
            />
          )
        })}
      </svg>
      <p className={styles.chiffre}>{objectif.progression ? `${Math.round(pourcentage)} %` : '—'}</p>
    </div>
  )
}
