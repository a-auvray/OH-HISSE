/*
 * Thème « Papier » : une feuille crème dont les quatre bords sont des rabats,
 * avec un ton jour et un ton soir. L'accueil et la coque des espaces sont dessinés ;
 * les pages intérieures se recolorent avec la coque, et les vues principales
 * sont refaites une à une. Objectifs et la transition restent ceux de Classique.
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
import { EspaceStreetliftingPapier } from './espaces/EspaceStreetlifting'
import { EspaceVieCourantePapier } from './espaces/EspaceVieCourante'

const theme: Theme = {
  Accueil: AccueilPapier,
  Espaces: {
    ...classique.Espaces,
    streetlifting: EspaceStreetliftingPapier,
    'vie-courante': EspaceVieCourantePapier,
    marine: EspaceMarinePapier,
  },
  Scene: classique.Scene,
}

export default theme
