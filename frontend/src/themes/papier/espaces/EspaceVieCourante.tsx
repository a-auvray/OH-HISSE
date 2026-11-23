import { Route, Routes } from 'react-router'

import { Briefings } from '../../../espaces/vie-courante/Briefings'
import { ONGLETS } from '../../../espaces/vie-courante/onglets'
import { Sommeil } from '../../../espaces/vie-courante/Sommeil'
import { Coque } from '../Coque'
import { Plaque } from '../Plaque'
import { AujourdhuiPapier } from '../vie-courante/Aujourdhui'

/** Vie courante en Papier : « Aujourd'hui » est refait ; sommeil et briefings restent sur la plaque en attendant. */
export function EspaceVieCourantePapier() {
  return (
    <Coque espace="vie-courante" titre="Vie courante" onglets={ONGLETS}>
      <Routes>
        <Route index element={<AujourdhuiPapier />} />
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
