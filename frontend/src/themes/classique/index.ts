/*
 * Thème « Classique » : le design d'origine, tel qu'il était avant les thèmes.
 * Ses polices ne se chargent qu'avec lui ; Unbounded et Manrope, communes à
 * la connexion et à tous les thèmes, restent dans le paquet de départ.
 */
import '@fontsource/anton'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/opsz-italic.css'
import '@fontsource-variable/quicksand'
import '@fontsource-variable/space-grotesk'

import { lazy } from 'react'

import { Accueil } from '../../accueil/Accueil'
import { Scene } from '../../navigation/Scene'
import type { Theme } from '../types'

// Chaque espace se charge à son ouverture : ses graphiques ou sa carte n'alourdissent pas l'accueil.
const theme: Theme = {
  Accueil,
  Espaces: {
    streetlifting: lazy(() =>
      import('../../espaces/streetlifting/EspaceStreetlifting').then((m) => ({
        default: m.EspaceStreetlifting,
      })),
    ),
    marine: lazy(() =>
      import('../../espaces/marine/EspaceMarine').then((m) => ({ default: m.EspaceMarine })),
    ),
    'vie-courante': lazy(() =>
      import('../../espaces/vie-courante/EspaceVieCourante').then((m) => ({ default: m.EspaceVieCourante })),
    ),
    objectifs: lazy(() =>
      import('../../espaces/objectifs/EspaceObjectifs').then((m) => ({ default: m.EspaceObjectifs })),
    ),
  },
  Scene,
}

export default theme
