import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { Assistant } from '../../../espaces/marine/Assistant'
import { Carnet } from '../../../espaces/marine/Carnet'
import { Carte } from '../../../espaces/marine/EspaceMarine'
import { ONGLETS } from '../../../espaces/marine/onglets'
import { useMarine } from '../../../espaces/marine/useMarine'
import { Coque } from '../Coque'
import { ConditionsPapier } from '../marine/Conditions'
import { Plaque } from '../Plaque'
import styles from './espaces.module.css'

/** Marine en Papier : la coque, les mêmes données, et les pages recolorées par elle. */
export function EspaceMarinePapier() {
  const { spots, spotId, choisirSpot, conditions, recharger } = useMarine()

  return (
    <Coque
      espace="marine"
      titre="Marine"
      onglets={ONGLETS}
      entete={
        spots.etat === 'pret' && (
          <div className={styles.plages} role="radiogroup" aria-label="Plage">
            {spots.valeur.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === spotId}
                onClick={() => choisirSpot(s.id)}
              >
                {s.nom}
              </button>
            ))}
          </div>
        )
      }
    >
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
              <ConditionsPapier conditions={conditions.valeur} spotId={spotId} />
            ) : null
          }
        />
        <Route
          path="assistant"
          element={
            <Plaque>
              <Assistant spotId={spotId} />
            </Plaque>
          }
        />
        <Route
          path="carte"
          element={
            <Suspense fallback={<p className={styles.attente}>Chargement de la carte…</p>}>
              {spots.etat === 'pret' && (
                <Plaque>
                  <Carte spots={spots.valeur} />
                </Plaque>
              )}
            </Suspense>
          }
        />
        <Route
          path="carnet"
          element={
            <Plaque>
              <Carnet spots={spots.etat === 'pret' ? spots.valeur : []} />
            </Plaque>
          }
        />
      </Routes>
    </Coque>
  )
}
