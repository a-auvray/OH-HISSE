import { AnimatePresence } from 'motion/react'
import { Suspense, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router'

import { ESPACES, type Direction } from '../espaces/espaces'
import { useTheme } from '../themes/contexte'
import { racine, sensDuTrajet } from './directions'

interface Trajet {
  chemin: string
  sens: Direction | null
}

/**
 * Les cinq pages de la croix, et le passage de l'une à l'autre. Les routes sont
 * communes à tous les thèmes ; l'accueil, les espaces et la transition viennent du thème.
 */
export function Navigation() {
  const { theme } = useTheme()
  const position = useLocation()
  // Seul le changement d'espace fait glisser l'écran ; les sous-pages d'un espace gèrent les leurs.
  const espace = racine(position.pathname)
  const [trajet, setTrajet] = useState<Trajet>({ chemin: espace, sens: null })

  // État dérivé : quand l'espace change, on retient d'où l'on vient pour connaître le sens.
  if (trajet.chemin !== espace) {
    setTrajet({ chemin: espace, sens: sensDuTrajet(trajet.chemin, espace) })
  }

  // Le thème est en cours de chargement : le fond de l'appli est déjà posé, rien à montrer de plus.
  if (!theme) return null
  const { Accueil, Espaces, Scene } = theme

  return (
    // `custom` est aussi transmis à la page qui sort : elle connaît ainsi le sens du trajet.
    <AnimatePresence initial={false} custom={trajet.sens}>
      <Scene key={espace} sens={trajet.sens}>
        <Routes location={position}>
          <Route path="/" element={<Accueil />} />
          {ESPACES.map(({ id, chemin }) => {
            const Espace = Espaces[id]
            return (
              <Route
                key={id}
                path={`${chemin}/*`}
                element={
                  <Suspense fallback={null}>
                    <Espace />
                  </Suspense>
                }
              />
            )
          })}
          <Route path="*" element={<Accueil />} />
        </Routes>
      </Scene>
    </AnimatePresence>
  )
}
