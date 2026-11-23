/*
 * Thème « Papier » : une feuille crème dont les quatre bords sont des rabats,
 * avec un ton jour et un ton soir. L'accueil, la coque des espaces et leurs vues
 * principales sont dessinés ; quelques pages intérieures (saisie, calendrier,
 * blocs, sommeil, briefings, assistant, carte, carnet) restent sur la plaque, et
 * la transition est encore celle de Classique.
 */
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './papier.css'

import classique from '../classique'
import type { Theme } from '../types'
import { AccueilPapier } from './Accueil'
import { EspaceMarinePapier } from './espaces/EspaceMarine'
import { EspaceObjectifsPapier } from './espaces/EspaceObjectifs'
import { EspaceStreetliftingPapier } from './espaces/EspaceStreetlifting'
import { EspaceVieCourantePapier } from './espaces/EspaceVieCourante'

const theme: Theme = {
  Accueil: AccueilPapier,
  Espaces: {
    ...classique.Espaces,
    streetlifting: EspaceStreetliftingPapier,
    'vie-courante': EspaceVieCourantePapier,
    marine: EspaceMarinePapier,
    objectifs: EspaceObjectifsPapier,
  },
  Scene: classique.Scene,
}

export default theme
