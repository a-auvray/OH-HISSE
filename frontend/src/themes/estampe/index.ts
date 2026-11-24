/*
 * Thème « Estampe » : une feuille d'imprimeur et quatre faisceaux de fils
 * d'encre. Chaque bord de l'accueil dit une donnée par le comportement de ses
 * fils (récupération, bloc, danger, progression) ; les espaces gardent un
 * en-tête de relevé et prennent les couleurs de l'estampe, jour ou sombre.
 * La transition est une passe d'encre qui révèle la page depuis son bord.
 */
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'

import { lazy } from 'react'

import type { Theme } from '../types'
import { AccueilEstampe } from './Accueil'
import { SceneEstampe } from './Scene'

// Chaque espace se charge à son ouverture, comme dans les autres thèmes.
const theme: Theme = {
  Accueil: AccueilEstampe,
  Espaces: {
    streetlifting: lazy(() =>
      import('./espaces/EspaceStreetlifting').then((m) => ({ default: m.EspaceStreetliftingEstampe })),
    ),
    'vie-courante': lazy(() =>
      import('./espaces/EspaceVieCourante').then((m) => ({ default: m.EspaceVieCouranteEstampe })),
    ),
    marine: lazy(() => import('./espaces/EspaceMarine').then((m) => ({ default: m.EspaceMarineEstampe }))),
    objectifs: lazy(() =>
      import('./espaces/EspaceObjectifs').then((m) => ({ default: m.EspaceObjectifsEstampe })),
    ),
  },
  Scene: SceneEstampe,
}

export default theme
