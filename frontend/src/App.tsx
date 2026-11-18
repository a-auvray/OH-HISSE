import { MotionConfig } from 'motion/react'
import { Route, Routes } from 'react-router'

import { Accueil } from './accueil/Accueil'
import { Connexion } from './accueil/Connexion'
import { BandeauDemo } from './commun/BandeauDemo'
import { EspaceProvisoire } from './espaces/EspaceProvisoire'
import { ESPACES } from './espaces/espaces'
import { useSession } from './session/contexte'

export function App() {
  const { etat } = useSession()

  return (
    // Les animations respectent le réglage « réduire les animations » du système.
    <MotionConfig reducedMotion="user">
      {etat.statut === 'anonyme' && <Connexion />}
      {etat.statut === 'connecte' && (
        <>
          {etat.utilisateur.est_demo && <BandeauDemo utilisateur={etat.utilisateur} />}
          <Routes>
            <Route path="/" element={<Accueil />} />
            {ESPACES.map((espace) => (
              <Route key={espace.id} path={espace.chemin} element={<EspaceProvisoire id={espace.id} />} />
            ))}
          </Routes>
        </>
      )}
    </MotionConfig>
  )
}
