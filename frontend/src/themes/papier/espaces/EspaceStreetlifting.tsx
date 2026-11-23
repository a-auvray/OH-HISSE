import { Route, Routes } from 'react-router'

import { Blocs } from '../../../espaces/streetlifting/Blocs'
import { Calendrier } from '../../../espaces/streetlifting/Calendrier'
import { SaisieNeuve } from '../../../espaces/streetlifting/EspaceStreetlifting'
import { ONGLETS } from '../../../espaces/streetlifting/onglets'
import { Coque } from '../Coque'
import { Plaque } from '../Plaque'
import { AnalysePapier } from '../streetlifting/Analyse'
import { SeanceDuJourPapier } from '../streetlifting/SeanceDuJour'

/**
 * Streetlifting en Papier : la séance du jour et l'analyse sont refaites ;
 * saisie, calendrier et blocs restent sur la plaque en attendant les leurs.
 */
export function EspaceStreetliftingPapier() {
  return (
    <Coque espace="streetlifting" titre="Streetlifting" onglets={ONGLETS}>
      <Routes>
        <Route index element={<SeanceDuJourPapier />} />
        <Route
          path="saisie"
          element={
            <Plaque>
              <SaisieNeuve />
            </Plaque>
          }
        />
        <Route
          path="saisie/:id"
          element={
            <Plaque>
              <SaisieNeuve />
            </Plaque>
          }
        />
        <Route
          path="calendrier"
          element={
            <Plaque>
              <Calendrier />
            </Plaque>
          }
        />
        <Route path="analyse" element={<AnalysePapier />} />
        <Route
          path="blocs"
          element={
            <Plaque>
              <Blocs />
            </Plaque>
          }
        />
      </Routes>
    </Coque>
  )
}
