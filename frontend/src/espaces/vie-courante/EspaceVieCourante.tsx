import { NavLink, Route, Routes } from 'react-router'

import { Vue } from '../../variantes/Vue'
import { BoutonRetour } from '../BoutonRetour'
import { Motif } from '../Motifs'
import { Aujourdhui } from './Aujourdhui'
import { Briefings } from './Briefings'
import { ONGLETS } from './onglets'
import styles from './EspaceVieCourante.module.css'
import { Sommeil } from './Sommeil'

/** Espace Vie courante : calme, apaisé (note 11). Le carrefour où tout se croise. */
export function EspaceVieCourante() {
  return (
    <main className={styles.espace} data-espace="vie-courante">
      <div className={styles.lune} aria-hidden="true">
        <Motif espace="vie-courante" />
      </div>
      <BoutonRetour espace="vie-courante" />

      <header className={styles.entete}>
        <h1 className={styles.marque}>Vie courante</h1>
        <nav className={styles.onglets} aria-label="Vie courante">
          {ONGLETS.map((o) => (
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
      </header>

      <div className={styles.contenu}>
        <Routes>
          <Route index element={<Vue espace="vie-courante" nom="Aujourdhui" parDefaut={Aujourdhui} />} />
          <Route path="sommeil" element={<Sommeil />} />
          <Route path="briefings" element={<Briefings />} />
        </Routes>
      </div>
    </main>
  )
}
