import type { ReactNode } from 'react'

import styles from './Coque.module.css'

/** Plaque d'imprimerie : accueille, avec leurs couleurs d'origine, les pages pas encore refaites en Papier. */
export function Plaque({ children }: { children: ReactNode }) {
  return <div className={styles.plaque}>{children}</div>
}
