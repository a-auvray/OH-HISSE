import { AnimatePresence } from 'motion/react'
import { lazy, Suspense, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router'

import { Accueil } from '../accueil/Accueil'
import type { Direction } from '../espaces/espaces'
import { CadreEspace } from '../espaces/CadreEspace'
import { ESPACES } from '../espaces/espaces'
import { racine, sensDuTrajet } from './directions'
import { Scene } from './Scene'

// Chargé à la demande : ses graphiques (visx) n'alourdissent pas l'accueil ni la connexion.
const EspaceStreetlifting = lazy(() =>
  import('../espaces/streetlifting/EspaceStreetlifting').then((m) => ({ default: m.EspaceStreetlifting })),
)

interface Trajet {
  chemin: string
  sens: Direction | null
}

/** Les cinq pages de la croix, et la glissade de l'une à l'autre. */
export function Navigation() {
  const position = useLocation()
  // Seul le changement d'espace fait glisser l'écran ; les sous-pages d'un espace gèrent les leurs.
  const espace = racine(position.pathname)
  const [trajet, setTrajet] = useState<Trajet>({ chemin: espace, sens: null })

  // État dérivé : quand l'espace change, on retient d'où l'on vient pour connaître le sens.
  if (trajet.chemin !== espace) {
    setTrajet({ chemin: espace, sens: sensDuTrajet(trajet.chemin, espace) })
  }

  return (
    // `custom` est aussi transmis à la page qui sort : elle connaît ainsi le sens du trajet.
    <AnimatePresence initial={false} custom={trajet.sens}>
      <Scene key={espace} sens={trajet.sens}>
        <Routes location={position}>
          <Route path="/" element={<Accueil />} />
          <Route
            path="/streetlifting/*"
            element={
              <Suspense fallback={null}>
                <EspaceStreetlifting />
              </Suspense>
            }
          />
          {ESPACES.filter((e) => e.id !== 'streetlifting').map((e) => (
            <Route key={e.id} path={e.chemin} element={<CadreEspace id={e.id} />} />
          ))}
          <Route path="*" element={<Accueil />} />
        </Routes>
      </Scene>
    </AnimatePresence>
  )
}
