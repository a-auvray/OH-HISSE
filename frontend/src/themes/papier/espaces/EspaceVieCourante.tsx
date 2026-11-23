import { Route, Routes } from 'react-router'

import { Aujourdhui } from '../../../espaces/vie-courante/Aujourdhui'
import { Briefings } from '../../../espaces/vie-courante/Briefings'
import { ONGLETS } from '../../../espaces/vie-courante/onglets'
import { Sommeil } from '../../../espaces/vie-courante/Sommeil'
import { Coque } from '../Coque'
import { Plaque } from '../Plaque'

/** Vie courante en Papier : la coque, et les pages recolorées par elle. */
export function EspaceVieCourantePapier() {
  return (
    <Coque espace="vie-courante" titre="Vie courante" onglets={ONGLETS}>
      <Routes>
        <Route
          index
          element={
            <Plaque>
              <Aujourdhui />
            </Plaque>
          }
        />
        <Route
          path="sommeil"
          element={
            <Plaque>
              <Sommeil />
            </Plaque>
          }
        />
        <Route
          path="briefings"
          element={
            <Plaque>
              <Briefings />
            </Plaque>
          }
        />
      </Routes>
    </Coque>
  )
}
