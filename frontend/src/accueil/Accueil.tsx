import { useEffect, useState } from 'react'

import { Lueurs } from '../commun/Lueurs'
import { ESPACES } from '../espaces/espaces'
import { useSession } from '../session/contexte'
import styles from './Accueil.module.css'
import { TableauDeBord } from './TableauDeBord'
import { TuileEspace } from './TuileEspace'

/**
 * L'animation d'entrée ne se joue qu'une fois par connexion : en revenant
 * d'un espace, l'accueil est déjà là. On retient pour quel utilisateur elle a été jouée.
 */
let entreeJoueePour: number | null = null

/** Accueil en croix : le briefing au centre, les quatre espaces autour (note 11). */
export function Accueil() {
  const { etat } = useSession()
  const utilisateurId = etat.statut === 'connecte' ? etat.utilisateur.id : null
  const [entree] = useState(() => entreeJoueePour !== utilisateurId)
  useEffect(() => {
    entreeJoueePour = utilisateurId
  }, [utilisateurId])

  return (
    <main className={styles.accueil}>
      <Lueurs intensite={0.45} />
      <div className={styles.croix}>
        {ESPACES.map((espace, i) => (
          <div key={espace.id} className={styles[espace.direction]}>
            <TuileEspace espace={espace} entree={entree} delai={0.15 + i * 0.12} />
          </div>
        ))}
        <div className={styles.centre}>
          <TableauDeBord entree={entree} />
        </div>
      </div>
    </main>
  )
}
