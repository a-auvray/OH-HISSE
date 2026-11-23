/*
 * Thème « Papier » : une feuille crème dont les quatre bords sont des rabats,
 * avec un ton jour et un ton soir. Pour l'instant seul l'accueil est dessiné ;
 * les espaces et la transition reprennent ceux du thème Classique en attendant.
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

const theme: Theme = {
  Accueil: AccueilPapier,
  Espaces: classique.Espaces,
  Scene: classique.Scene,
}

export default theme
