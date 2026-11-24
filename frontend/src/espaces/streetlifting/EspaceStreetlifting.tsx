import { NavLink, Route, Routes, useLocation } from 'react-router'

import { Vue } from '../../variantes/Vue'
import { BoutonRetour } from '../BoutonRetour'
import { Motif } from '../Motifs'
import { ONGLETS } from './onglets'
import styles from './EspaceStreetlifting.module.css'
import { Analyse } from './Analyse'
import { Blocs } from './Blocs'
import { Calendrier } from './Calendrier'
import { Saisie } from './Saisie'
import { SeanceDuJour } from './SeanceDuJour'

/** Espace Streetlifting : brut, chaud, métal et craie (note 11 du CDC). */
export function EspaceStreetlifting() {
  return (
    <main className={styles.espace} data-espace="streetlifting">
      <div className={styles.disque} aria-hidden="true">
        <Motif espace="streetlifting" />
      </div>

      <header className={styles.entete}>
        <p className={styles.marque}>Streetlifting</p>
        <nav className={styles.onglets} aria-label="Streetlifting">
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

      <BoutonRetour espace="streetlifting" />

      <div className={styles.contenu}>
        <Routes>
          <Route index element={<Vue espace="streetlifting" nom="SeanceDuJour" parDefaut={SeanceDuJour} />} />
          <Route path="saisie" element={<SaisieNeuve />} />
          <Route path="saisie/:id" element={<SaisieNeuve />} />
          <Route path="calendrier" element={<Calendrier />} />
          <Route path="analyse" element={<Vue espace="streetlifting" nom="Analyse" parDefaut={Analyse} />} />
          <Route path="blocs" element={<Blocs />} />
        </Routes>
      </div>
    </main>
  )
}

/** Repart d'un formulaire neuf à chaque navigation (nouvelle séance, autre séance à modifier…). */
export function SaisieNeuve() {
  return <Saisie key={useLocation().key} />
}
