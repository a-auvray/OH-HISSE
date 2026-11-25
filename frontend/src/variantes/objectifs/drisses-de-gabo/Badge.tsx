import styles from './Badge.module.css'
import { MOTS_STATUT, type Statut } from './modele'

/** Le tracé de chaque statut : plein, en créneaux (en marches, jamais ondulé), double, pointillé. */
const TRACES: Readonly<Record<Statut, string>> = {
  tension: 'M0 4H20',
  retard: 'M0 6H4V2H8V6H12V2H16V6H20',
  verrouille: 'M0 2.5H20M0 5.5H20',
  detendu: 'M0 4H20',
}

/**
 * Un statut : une forme, un libellé et une couleur, jamais l'un sans les autres. Capsule rectangulaire,
 * angles vifs ; le libellé est en encre du thème, la couleur ne porte que le trait.
 */
export function Badge({ statut }: { statut: Statut }) {
  return (
    <span className={styles.badge} data-statut={statut}>
      <svg viewBox="0 0 20 8" width="20" height="8" aria-hidden="true">
        <path d={TRACES[statut]} fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {MOTS_STATUT[statut]}
    </span>
  )
}
