import { MotionConfig } from 'motion/react'

import { Connexion } from './accueil/Connexion'
import { BandeauDemo } from './commun/BandeauDemo'
import { Navigation } from './navigation/Navigation'
import { useSession } from './session/contexte'

export function App() {
  const { etat } = useSession()

  return (
    // Les animations respectent le réglage « réduire les animations » du système.
    <MotionConfig reducedMotion="user">
      {etat.statut === 'anonyme' && <Connexion />}
      {etat.statut === 'connecte' && (
        <>
          <Navigation />
          {etat.utilisateur.est_demo && <BandeauDemo utilisateur={etat.utilisateur} />}
        </>
      )}
    </MotionConfig>
  )
}
