import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { Route, Routes, useLocation } from 'react-router'

import { Accueil } from '../accueil/Accueil'
import type { Direction } from '../espaces/espaces'
import { CadreEspace } from '../espaces/CadreEspace'
import { ESPACES } from '../espaces/espaces'
import { sensDuTrajet } from './directions'
import { Scene } from './Scene'

interface Trajet {
  chemin: string
  sens: Direction | null
}

/** Les cinq pages de la croix, et la glissade de l'une à l'autre. */
export function Navigation() {
  const position = useLocation()
  const [trajet, setTrajet] = useState<Trajet>({ chemin: position.pathname, sens: null })

  // État dérivé : quand l'adresse change, on retient d'où l'on vient pour connaître le sens.
  if (trajet.chemin !== position.pathname) {
    setTrajet({ chemin: position.pathname, sens: sensDuTrajet(trajet.chemin, position.pathname) })
  }

  return (
    // `custom` est aussi transmis à la page qui sort : elle connaît ainsi le sens du trajet.
    <AnimatePresence initial={false} custom={trajet.sens}>
      <Scene key={position.pathname} sens={trajet.sens}>
        <Routes location={position}>
          <Route path="/" element={<Accueil />} />
          {ESPACES.map((espace) => (
            <Route key={espace.id} path={espace.chemin} element={<CadreEspace id={espace.id} />} />
          ))}
          <Route path="*" element={<Accueil />} />
        </Routes>
      </Scene>
    </AnimatePresence>
  )
}
