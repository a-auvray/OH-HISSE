import { Route, Routes } from 'react-router'

import { Aujourdhui } from '../../../espaces/vie-courante/Aujourdhui'
import { Briefings } from '../../../espaces/vie-courante/Briefings'
import { ONGLETS } from '../../../espaces/vie-courante/onglets'
import { Sommeil } from '../../../espaces/vie-courante/Sommeil'
import { Coque } from '../Coque'

/** Vie courante en Estampe. */
export function EspaceVieCouranteEstampe() {
  return (
    <Coque espace="vie-courante" titre="Vie courante" onglets={ONGLETS}>
      <Routes>
        <Route index element={<Aujourdhui />} />
        <Route path="sommeil" element={<Sommeil />} />
        <Route path="briefings" element={<Briefings />} />
      </Routes>
    </Coque>
  )
}
