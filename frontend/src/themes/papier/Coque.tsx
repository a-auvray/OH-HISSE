import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'

import { espaceParId, type IdEspace } from '../../espaces/espaces'
import { OPPOSE } from '../../navigation/directions'
import styles from './Coque.module.css'
import { useTon } from './ton'

export interface OngletPapier {
  chemin: string
  libelle: string
  fin: boolean
}

interface Props {
  espace: IdEspace
  titre: string
  onglets: readonly OngletPapier[]
  /** Posé à côté des onglets (le choix de plage en Marine, par exemple). */
  entete?: ReactNode
  children: ReactNode
}

const EXPO = [0.16, 1, 0.3, 1] as const

/**
 * La coque commune des espaces du thème Papier : la feuille, l'en-tête avec
 * ses onglets, le dos par lequel on retourne à l'accueil, et le ton jour ou
 * soir. Chaque espace garde sa propre identité (police, couleur, décor).
 * Les couleurs de l'application sont ramenées à celles de la feuille, ce qui
 * recolore aussi les pages intérieures sans les réécrire.
 */
export function Coque({ espace, titre, onglets, entete, children }: Props) {
  const [ton, changerTon] = useTon()
  const cote = OPPOSE[espaceParId(espace).direction]

  return (
    <main className={styles.coque} data-ton={ton} data-espace={espace} data-dos={cote}>
      <div className={styles.papier} aria-hidden="true" />
      <div className={styles.decor} aria-hidden="true" />

      {/* Le dos du pli : il faut retourner la feuille pour revenir à l'accueil. */}
      <motion.div
        className={styles.dos}
        data-cote={cote}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease: EXPO }}
      >
        <Link to="/" aria-label="Retour à l’accueil">
          <span aria-hidden="true">Accueil</span>
        </Link>
      </motion.div>

      <header className={styles.entete}>
        <motion.h1
          className={styles.titre}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: EXPO }}
        >
          {titre}
        </motion.h1>
        <motion.nav
          className={styles.onglets}
          aria-label={titre}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: EXPO }}
        >
          {onglets.map((o) => (
            <NavLink
              key={o.chemin}
              to={o.chemin}
              end={o.fin}
              className={({ isActive }) => (isActive ? `${styles.onglet} ${styles.actif}` : styles.onglet)}
            >
              {o.libelle}
            </NavLink>
          ))}
        </motion.nav>
        {entete}
      </header>

      <div className={styles.contenu}>{children}</div>

      <button type="button" className={styles.ton} onClick={changerTon} aria-pressed={ton === 'soir'}>
        {ton === 'jour' ? '◐ Mode sombre' : '◑ Mode clair'}
      </button>
    </main>
  )
}
