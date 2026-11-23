/*
 * Thème « Papier » : une feuille crème dont les quatre bords sont des rabats,
 * avec un ton jour et un ton soir. L'accueil, la coque des espaces et leurs vues
 * principales sont dessinés ; quelques pages intérieures (saisie, calendrier,
 * blocs, sommeil, briefings, assistant, carte, carnet) restent sur la plaque, et
 * la transition est propre au thème : un rabat qui se déplie.
 */
import '@fontsource/anton'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/opsz-italic.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './papier.css'

import { lazy } from 'react'

import type { Theme } from '../types'
import { AccueilPapier } from './Accueil'
import { ScenePapier } from './Scene'

// Chaque espace se charge à son ouverture, comme dans le thème Classique.
const theme: Theme = {
  Accueil: AccueilPapier,
  Espaces: {
    streetlifting: lazy(() =>
      import('./espaces/EspaceStreetlifting').then((m) => ({ default: m.EspaceStreetliftingPapier })),
    ),
    'vie-courante': lazy(() =>
      import('./espaces/EspaceVieCourante').then((m) => ({ default: m.EspaceVieCourantePapier })),
    ),
    marine: lazy(() => import('./espaces/EspaceMarine').then((m) => ({ default: m.EspaceMarinePapier }))),
    objectifs: lazy(() =>
      import('./espaces/EspaceObjectifs').then((m) => ({ default: m.EspaceObjectifsPapier })),
    ),
  },
  Scene: ScenePapier,
}

export default theme
