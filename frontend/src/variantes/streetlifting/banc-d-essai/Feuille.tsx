import type { ReactNode } from 'react'

import styles from './Feuille.module.css'

interface Props {
  /** Dans le mors du haut : de quoi situer l'essai. */
  haut: ReactNode
  /** Dans le mors du bas : le cartouche du procès-verbal. */
  bas: ReactNode
  children: ReactNode
}

/**
 * La machine : une feuille tendue entre deux mors. Rien ne flotte (ni ombre portée, ni carte) ;
 * la grille millimétrée ne passe jamais sous un texte, qui pose sa propre « réserve d'impression ».
 */
export function Feuille({ haut, bas, children }: Props) {
  return (
    <div className={styles.feuille}>
      <div className={styles.mors} data-position="haut">
        {haut}
      </div>
      <div className={styles.papier}>{children}</div>
      <div className={styles.mors} data-position="bas">
        {bas}
      </div>
    </div>
  )
}
