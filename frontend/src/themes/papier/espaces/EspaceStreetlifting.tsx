import { Route, Routes } from 'react-router'

import { Blocs } from '../../../espaces/streetlifting/Blocs'
import { Calendrier } from '../../../espaces/streetlifting/Calendrier'
import { SaisieNeuve } from '../../../espaces/streetlifting/EspaceStreetlifting'
import { ONGLETS } from '../../../espaces/streetlifting/onglets'
import { Coque } from '../Coque'
import { AnalysePapier } from '../streetlifting/Analyse'
import { SeanceDuJourPapier } from '../streetlifting/SeanceDuJour'

/**
 * Streetlifting en Papier : la séance du jour et l'analyse sont refaites ;
 * saisie, calendrier et blocs gardent leur mise en page, aux couleurs de la feuille.
 */
export function EspaceStreetliftingPapier() {
  return (
    <Coque espace="streetlifting" titre="Streetlifting" onglets={ONGLETS}>
      <Routes>
        <Route index element={<SeanceDuJourPapier />} />
        <Route path="saisie" element={<SaisieNeuve />} />
        <Route path="saisie/:id" element={<SaisieNeuve />} />
        <Route path="calendrier" element={<Calendrier />} />
        <Route path="analyse" element={<AnalysePapier />} />
        <Route path="blocs" element={<Blocs />} />
      </Routes>
    </Coque>
  )
}
