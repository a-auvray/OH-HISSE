import { type ComponentType, type ReactNode, Suspense } from 'react'
import { Route, Routes } from 'react-router'

import type { Conditions as DonneesConditions } from '../api/types'
import { Aujourdhui } from '../espaces/vie-courante/Aujourdhui'
import { Analyse } from '../espaces/streetlifting/Analyse'
import { Assistant } from '../espaces/marine/Assistant'
import { Blocs } from '../espaces/streetlifting/Blocs'
import { Briefings } from '../espaces/vie-courante/Briefings'
import { Calendrier } from '../espaces/streetlifting/Calendrier'
import { Carnet } from '../espaces/marine/Carnet'
import { Carte } from '../espaces/marine/EspaceMarine'
import { Conditions } from '../espaces/marine/Conditions'
import type { IdEspace } from '../espaces/espaces'
import { ONGLETS as ONGLETS_MARINE } from '../espaces/marine/onglets'
import { ONGLETS as ONGLETS_STREET } from '../espaces/streetlifting/onglets'
import { ONGLETS as ONGLETS_VIE } from '../espaces/vie-courante/onglets'
import { Objectifs } from '../espaces/objectifs/EspaceObjectifs'
import { SaisieNeuve } from '../espaces/streetlifting/EspaceStreetlifting'
import { SeanceDuJour } from '../espaces/streetlifting/SeanceDuJour'
import { Sommeil } from '../espaces/vie-courante/Sommeil'
import { useMarine } from '../espaces/marine/useMarine'
import { Vue } from '../variantes/Vue'
import styles from './espacesCommuns.module.css'

export interface OngletCoque {
  chemin: string
  libelle: string
  fin: boolean
}

export interface PropsCoque {
  espace: IdEspace
  titre: string
  onglets: readonly OngletCoque[]
  /** Posé à côté des onglets (le choix de plage en Marine, par exemple). */
  entete?: ReactNode
  children: ReactNode
}

/** La coque d'un thème : tout ce qui entoure les pages d'un espace. Le reste est commun. */
export type CoqueTheme = ComponentType<PropsCoque>

/*
 * Les quatre espaces tels que les thèmes qui n'ont pas dessiné les leurs les
 * montrent : les pages communes, dans la coque du thème. Les pages ne lisent
 * que des jetons de couleur, la coque les définit.
 */

/** Les vues qu'un thème a dessinées à lui ; celles qu'il ne donne pas restent les pages communes. */
export interface VuesStreetlifting {
  SeanceDuJour?: ComponentType
  Analyse?: ComponentType
}

export function EspaceStreetliftingCommun({
  Coque,
  vues = {},
}: {
  Coque: CoqueTheme
  vues?: VuesStreetlifting
}) {
  return (
    <Coque espace="streetlifting" titre="Streetlifting" onglets={ONGLETS_STREET}>
      <Routes>
        <Route
          index
          element={
            <Vue espace="streetlifting" nom="SeanceDuJour" parDefaut={vues.SeanceDuJour ?? SeanceDuJour} />
          }
        />
        <Route path="saisie" element={<SaisieNeuve />} />
        <Route path="saisie/:id" element={<SaisieNeuve />} />
        <Route path="calendrier" element={<Calendrier />} />
        <Route
          path="analyse"
          element={<Vue espace="streetlifting" nom="Analyse" parDefaut={vues.Analyse ?? Analyse} />}
        />
        <Route path="blocs" element={<Blocs />} />
      </Routes>
    </Coque>
  )
}

export interface VuesVieCourante {
  Aujourdhui?: ComponentType
}

export function EspaceVieCouranteCommun({ Coque, vues = {} }: { Coque: CoqueTheme; vues?: VuesVieCourante }) {
  return (
    <Coque espace="vie-courante" titre="Vie courante" onglets={ONGLETS_VIE}>
      <Routes>
        <Route
          index
          element={<Vue espace="vie-courante" nom="Aujourdhui" parDefaut={vues.Aujourdhui ?? Aujourdhui} />}
        />
        <Route path="sommeil" element={<Sommeil />} />
        <Route path="briefings" element={<Briefings />} />
      </Routes>
    </Coque>
  )
}

export interface VuesObjectifs {
  Objectifs?: ComponentType
}

export function EspaceObjectifsCommun({ Coque, vues = {} }: { Coque: CoqueTheme; vues?: VuesObjectifs }) {
  return (
    <Coque espace="objectifs" titre="Objectifs" onglets={[]}>
      <Vue espace="objectifs" nom="Objectifs" parDefaut={vues.Objectifs ?? Objectifs} />
    </Coque>
  )
}

export interface VuesMarine {
  Conditions?: ComponentType<{ conditions: DonneesConditions; spotId: number | null }>
}

/** Les conditions telles que les montre une page commune : sans le choix de plage, qu'elle n'utilise pas. */
function ConditionsCommune({ conditions }: { conditions: DonneesConditions }) {
  return <Conditions conditions={conditions} />
}

export function EspaceMarineCommun({ Coque, vues = {} }: { Coque: CoqueTheme; vues?: VuesMarine }) {
  const { spots, spotId, choisirSpot, conditions, recharger } = useMarine()

  return (
    <Coque
      espace="marine"
      titre="Marine"
      onglets={ONGLETS_MARINE}
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
              <Vue
                espace="marine"
                nom="Conditions"
                parDefaut={vues.Conditions ?? ConditionsCommune}
                props={{ conditions: conditions.valeur, spotId }}
              />
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
    </Coque>
  )
}
