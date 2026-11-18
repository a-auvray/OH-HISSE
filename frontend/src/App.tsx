import { MotionConfig } from 'motion/react'

import { Connexion } from './accueil/Connexion'
import { BandeauDemo } from './commun/BandeauDemo'
import { Navigation } from './navigation/Navigation'
import { useSession } from './session/contexte'

export function App() {
  const { etat } = useSession()

  return (
    // Les animations font partie de l'identité de l'appli : elles restent actives même si le
    // système demande de les réduire (décision du 18/11/2026, note 13 du CDC).
    <MotionConfig reducedMotion="never">
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
