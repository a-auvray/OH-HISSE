/*
 * Thème « Matière » : un banc d'essai. Sur une dalle (carbone ou béton), quatre
 * plaques de matière incrustées en croix subissent chacune une donnée du jour :
 * l'acier est poli par le bloc et prend les couleurs de la friction, le sable
 * est couvert par la vraie marée, l'albâtre est éclairé par la récupération, le
 * polymère est contraint vers sa cible. Les espaces portent l'échantillon de
 * leur matière ; la transition est une plaque qui se pose. Jour ou sombre.
 */
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'

import { lazy } from 'react'

import type { Theme } from '../types'
import { AccueilMatiere } from './Accueil'
import { SceneMatiere } from './Scene'

// Chaque espace se charge à son ouverture, comme dans les autres thèmes.
const theme: Theme = {
  Accueil: AccueilMatiere,
  Espaces: {
    streetlifting: lazy(() => import('./espaces').then((m) => ({ default: m.EspaceStreetliftingMatiere }))),
    'vie-courante': lazy(() => import('./espaces').then((m) => ({ default: m.EspaceVieCouranteMatiere }))),
    marine: lazy(() => import('./espaces').then((m) => ({ default: m.EspaceMarineMatiere }))),
    objectifs: lazy(() => import('./espaces').then((m) => ({ default: m.EspaceObjectifsMatiere }))),
  },
  Scene: SceneMatiere,
}

export default theme
