import type { CSSProperties } from 'react'

import styles from './Reglette.module.css'

interface Props {
  /** Ce que mesure la réglette, lu par les lecteurs d'écran. */
  libelle: string
  /** La valeur, en pourcents. */
  valeur: number
  min: number
  max: number
  /** Écart entre deux graduations. */
  pas: number
  /** La valeur dite en toutes lettres, imprimée à côté : « 92 % e1RM ». */
  texte: string
}

/**
 * Une réglette graduée, nommée comme telle : une règle d'un pixel, ses graduations, un index qui
 * glisse jusqu'à la valeur. Ce n'est ni un cadran ni une jauge ronde : une mesure qu'on lit.
 */
export function Reglette({ libelle, valeur, min, max, pas, texte }: Props) {
  const etendue = Math.max(1e-9, max - min)
  const position = Math.min(1, Math.max(0, (valeur - min) / etendue))
  const n = Math.floor(etendue / pas + 1e-9)

  return (
    <div className={styles.reglette}>
      <div
        className={styles.regle}
        role="meter"
        aria-label={libelle}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.min(max, Math.max(min, valeur))}
        aria-valuetext={texte}
      >
        {Array.from({ length: n + 1 }, (_, i) => (
          <span
            key={i}
            className={styles.cran}
            data-grand={i % 2 === 0 || undefined}
            style={{ left: `${((i * pas) / etendue) * 100}%` }}
            aria-hidden="true"
          />
        ))}
        <span className={styles.course} aria-hidden="true" style={{ '--p': position } as CSSProperties}>
          <span className={styles.index} />
        </span>
      </div>
      <p className={styles.bornes} aria-hidden="true">
        <span>{min} %</span>
        <span>{max} %</span>
      </p>
    </div>
  )
}
