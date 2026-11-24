import { Route, Routes } from 'react-router'

import { Analyse } from '../../../espaces/streetlifting/Analyse'
import { Blocs } from '../../../espaces/streetlifting/Blocs'
import { Calendrier } from '../../../espaces/streetlifting/Calendrier'
import { SaisieNeuve } from '../../../espaces/streetlifting/EspaceStreetlifting'
import { ONGLETS } from '../../../espaces/streetlifting/onglets'
import { SeanceDuJour } from '../../../espaces/streetlifting/SeanceDuJour'
import { Coque } from '../Coque'

/** Streetlifting en Estampe : les pages de l'espace, aux couleurs et à l'en-tête de l'estampe. */
export function EspaceStreetliftingEstampe() {
  return (
    <Coque espace="streetlifting" titre="Streetlifting" onglets={ONGLETS}>
      <Routes>
        <Route index element={<SeanceDuJour />} />
        <Route path="saisie" element={<SaisieNeuve />} />
        <Route path="saisie/:id" element={<SaisieNeuve />} />
        <Route path="calendrier" element={<Calendrier />} />
        <Route path="analyse" element={<Analyse />} />
        <Route path="blocs" element={<Blocs />} />
      </Routes>
    </Coque>
  )
}
