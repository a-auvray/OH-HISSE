import { motion } from 'motion/react'
import { lazy, Suspense } from 'react'
import { NavLink, Route, Routes } from 'react-router'

import { BoutonRetour } from '../BoutonRetour'
import { Motif } from '../Motifs'
import { Assistant } from './Assistant'
import { Carnet } from './Carnet'
import { Conditions } from './Conditions'
import { ONGLETS } from './onglets'
import styles from './EspaceMarine.module.css'
import { useMarine } from './useMarine'

// La carte (MapLibre) est lourde : elle n'est chargée qu'à l'ouverture de son onglet.
export const Carte = lazy(() => import('./Carte').then((m) => ({ default: m.Carte })))

/** Espace Marine : fluide, profond, mouvement de vagues (note 11). */
export function EspaceMarine() {
  const { spots, spotId, choisirSpot, conditions, recharger } = useMarine()

  return (
    <main className={styles.espace} data-espace="marine">
      <div className={styles.houle} aria-hidden="true">
        <Motif espace="marine" />
      </div>
      <BoutonRetour espace="marine" />

      <header className={styles.entete}>
        <h1 className={styles.marque}>Marine</h1>
        <nav className={styles.onglets} aria-label="Marine">
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
        {spots.etat === 'pret' && (
          <div className={styles.spots} role="radiogroup" aria-label="Plage">
            {spots.valeur.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === spotId}
                onClick={() => choisirSpot(s.id)}
              >
                {s.id === spotId && <motion.span layoutId="spot-choisi" className={styles.pastille} />}
                <span>{s.nom}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      <div className={styles.contenu}>
        <Routes>
          <Route
            index
            element={
              conditions.etat === 'chargement' ? (
                <p className={styles.attente}>Lecture de la mer…</p>
              ) : conditions.etat === 'erreur' ? (
                <div className={styles.erreur} role="alert">
                  <p>{conditions.message}</p>
                  <button type="button" onClick={recharger}>
                    Réessayer
                  </button>
                </div>
              ) : conditions.valeur ? (
                <Conditions conditions={conditions.valeur} />
              ) : null
            }
          />
          <Route path="assistant" element={<Assistant spotId={spotId} />} />
          <Route
            path="carte"
            element={
              <Suspense fallback={<p className={styles.attente}>Chargement de la carte…</p>}>
                {spots.etat === 'pret' && <Carte spots={spots.valeur} />}
              </Suspense>
            }
          />
          <Route path="carnet" element={<Carnet spots={spots.etat === 'pret' ? spots.valeur : []} />} />
        </Routes>
      </div>
    </main>
  )
}
