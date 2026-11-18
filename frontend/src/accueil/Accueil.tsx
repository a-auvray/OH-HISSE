import { Link } from 'react-router'

import { ESPACES } from '../espaces/espaces'
import { useSession } from '../session/contexte'
import styles from './Accueil.module.css'
import { useEtatApi } from './useEtatApi'

/** Accueil provisoire du socle : remplacé par la coquille de navigation animée. */
export function Accueil() {
  const etat = useEtatApi()
  const { etat: session, seDeconnecter } = useSession()
  const nom = session.statut === 'connecte' ? session.utilisateur.nom_affiche : ''

  return (
    <main className={styles.accueil}>
      <h1 className={styles.titre}>Oh Hisse !</h1>
      <p>Bonjour, {nom}.</p>
      <nav className={styles.espaces} aria-label="Espaces">
        {ESPACES.map((espace) => (
          <Link key={espace.id} to={espace.chemin} data-espace={espace.id} className={styles.espace}>
            {espace.nom}
          </Link>
        ))}
      </nav>
      <p className={styles.api} role="status">
        {etat.statut === 'chargement' && 'Connexion à l’API…'}
        {etat.statut === 'ok' && `API en ligne · v${etat.version}`}
        {etat.statut === 'injoignable' && 'API injoignable'}
      </p>
      <button type="button" className={styles.espace} onClick={() => void seDeconnecter()}>
        Se déconnecter
      </button>
    </main>
  )
}
