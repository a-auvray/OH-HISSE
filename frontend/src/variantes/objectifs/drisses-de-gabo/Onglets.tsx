import type { KeyboardEvent } from 'react'

import { type Onglet, ONGLETS, PANNEAU } from './catalogue'
import styles from './Onglets.module.css'

/**
 * Les trois statuts, empilés dans la marge sur un rail : un taquet par onglet, le taquet plein marque l'actif.
 * Touches 1 à 3 pour y aller d'où l'on est (gérées par la page), flèches pour s'y déplacer une fois dessus.
 */
export function Onglets({
  actif,
  comptes,
  onChoisir,
}: {
  actif: Onglet
  comptes: Readonly<Record<Onglet, number>>
  onChoisir: (onglet: Onglet) => void
}) {
  function surTouche(e: KeyboardEvent<HTMLDivElement>) {
    const sens =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? -1
          : 0
    const direct = e.key === 'Home' ? 0 : e.key === 'End' ? ONGLETS.length - 1 : null
    if (sens === 0 && direct === null) return
    e.preventDefault()
    const i = ONGLETS.findIndex((o) => o.id === actif)
    const suivant = ONGLETS[direct ?? (i + sens + ONGLETS.length) % ONGLETS.length]!
    onChoisir(suivant.id)
    // Le focus suit la sélection : les onglets hors actif sortent de l'ordre de tabulation.
    queueMicrotask(() => document.getElementById(`drisses-onglet-${suivant.id}`)?.focus())
  }

  return (
    <div
      className={styles.rail}
      role="tablist"
      aria-label="Statut des objectifs"
      aria-orientation="vertical"
      onKeyDown={surTouche}
    >
      {ONGLETS.map((o) => (
        <button
          key={o.id}
          id={`drisses-onglet-${o.id}`}
          type="button"
          role="tab"
          className={styles.onglet}
          aria-selected={actif === o.id}
          aria-controls={PANNEAU}
          aria-keyshortcuts={o.touche}
          tabIndex={actif === o.id ? 0 : -1}
          onClick={() => onChoisir(o.id)}
        >
          <span className={styles.taquet} aria-hidden="true" />
          <span className={styles.nom}>{o.nom}</span>
          <span className={styles.compte}>{comptes[o.id]}</span>
        </button>
      ))}
    </div>
  )
}
