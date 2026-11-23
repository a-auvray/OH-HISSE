import { Route, Routes } from 'react-router'

import { Analyse } from '../../../espaces/streetlifting/Analyse'
import { Blocs } from '../../../espaces/streetlifting/Blocs'
import { Calendrier } from '../../../espaces/streetlifting/Calendrier'
import { SaisieNeuve } from '../../../espaces/streetlifting/EspaceStreetlifting'
import { ONGLETS } from '../../../espaces/streetlifting/onglets'
import { SeanceDuJour } from '../../../espaces/streetlifting/SeanceDuJour'
import { Coque } from '../Coque'
import { Plaque } from '../Plaque'

/** Streetlifting en Papier : la coque, et les pages du carnet recolorées par elle. */
export function EspaceStreetliftingPapier() {
  return (
    <Coque espace="streetlifting" titre="Streetlifting" onglets={ONGLETS}>
      <Routes>
        <Route
          index
          element={
            <Plaque>
              <SeanceDuJour />
            </Plaque>
          }
        />
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
        <Route
          path="analyse"
          element={
            <Plaque>
              <Analyse />
            </Plaque>
          }
        />
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
