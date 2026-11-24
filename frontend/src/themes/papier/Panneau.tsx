import { type ReactNode, useId, useState } from 'react'

import styles from './Panneau.module.css'

const CLE = 'oh-hisse.papier.panneaux'

function lire(): Record<string, boolean> {
  try {
    const brut: unknown = JSON.parse(localStorage.getItem(CLE) ?? '{}')
    return typeof brut === 'object' && brut !== null ? (brut as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function ecrire(id: string, ouvert: boolean) {
  try {
    localStorage.setItem(CLE, JSON.stringify({ ...lire(), [id]: ouvert }))
  } catch {
    // Stockage indisponible (navigation privée) : le panneau reste ouvert ou fermé pour cette visite.
  }
}

interface Props {
  /** Identifiant stable : l'état ouvert ou fermé est retenu sous ce nom. */
  id: string
  titre: string
  /** Une ligne visible même fermé : de quoi savoir s'il vaut la peine de l'ouvrir. */
  resume?: ReactNode
  /** Ouvert la première fois ? Non par défaut : le détail reste à portée sans encombrer. */
  ouvertParDefaut?: boolean
  children: ReactNode
}

/**
 * Un panneau qu'on déplie pour plus de précisions. Partout le même geste et la même place :
 * le titre et son résumé restent visibles, le détail s'ouvre dessous, et le choix est retenu.
 */
export function Panneau({ id, titre, resume, ouvertParDefaut = false, children }: Props) {
  const [ouvert, setOuvert] = useState(() => lire()[id] ?? ouvertParDefaut)
  const idCorps = useId()

  return (
    <section className={styles.panneau} data-ouvert={ouvert || undefined}>
      <h3 className={styles.titre}>
        <button
          type="button"
          className={styles.bouton}
          aria-expanded={ouvert}
          aria-controls={idCorps}
          onClick={() => {
            setOuvert(!ouvert)
            ecrire(id, !ouvert)
          }}
        >
          <span className={styles.nom}>{titre}</span>
          {resume && !ouvert && <span className={styles.resume}>{resume}</span>}
          <span className={styles.signe} aria-hidden="true" />
        </button>
      </h3>
      <div id={idCorps} className={styles.corps} hidden={!ouvert}>
        {children}
      </div>
    </section>
  )
}
