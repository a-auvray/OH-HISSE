import { motion } from 'motion/react'
import { Link, NavLink } from 'react-router'

import { espaceParId } from '../../espaces/espaces'
import { OPPOSE } from '../../navigation/directions'
import type { PropsCoque } from '../espacesCommuns'
import { useTon } from '../ton'
import styles from './Coque.module.css'

const EXPO = [0.16, 1, 0.3, 1] as const

/** La matière de chaque espace, telle qu'elle est sur l'accueil : l'échantillon de l'en-tête. */
const MATIERE = {
  streetlifting: 'acier',
  marine: 'estran',
  'vie-courante': 'albatre',
  objectifs: 'polymere',
} as const

/**
 * La coque des espaces du thème Matière : la dalle (carbone ou béton), un
 * échantillon de la matière de l'espace à côté du titre, des onglets gravés,
 * et le retour à l'accueil. Les pages lisent les jetons que la coque définit.
 */
export function Coque({ espace, titre, onglets, entete, children }: PropsCoque) {
  const [ton, changerTon] = useTon()
  const cote = OPPOSE[espaceParId(espace).direction]

  return (
    <main className={styles.coque} data-ton={ton} data-espace={espace} data-cote={cote}>
      <header className={styles.entete}>
        <Link to="/" className={styles.retour} aria-label="Retour à l’accueil">
          ← Accueil
        </Link>
        <span className={styles.echantillon} data-matiere={MATIERE[espace]} aria-hidden="true" />
        <motion.h1
          className={styles.titre}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EXPO }}
        >
          {titre}
        </motion.h1>
        {onglets.length > 0 && (
          <nav className={styles.onglets} aria-label={titre}>
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
          </nav>
        )}
        {entete}
      </header>

      <div className={styles.contenu}>{children}</div>

      <button type="button" className={styles.ton} onClick={changerTon} aria-pressed={ton === 'soir'}>
        {ton === 'jour' ? '◐ Mode sombre' : '◑ Mode clair'}
      </button>
    </main>
  )
}
