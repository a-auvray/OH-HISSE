import { NavLink, Route, Routes, useLocation } from 'react-router'

import { BoutonRetour } from '../BoutonRetour'
import { Motif } from '../Motifs'
import styles from './EspaceStreetlifting.module.css'
import { Saisie } from './Saisie'
import { SeanceDuJour } from './SeanceDuJour'

const ONGLETS = [
  { chemin: '/streetlifting', libelle: 'Séance du jour', fin: true },
  { chemin: '/streetlifting/saisie', libelle: 'Saisie', fin: false },
] as const

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
          <Route index element={<SeanceDuJour />} />
          <Route path="saisie" element={<SaisieNeuve />} />
          <Route path="saisie/:id" element={<SaisieNeuve />} />
        </Routes>
      </div>
    </main>
  )
}

/** Repart d'un formulaire neuf à chaque navigation (nouvelle séance, autre séance à modifier…). */
function SaisieNeuve() {
  return <Saisie key={useLocation().key} />
}
