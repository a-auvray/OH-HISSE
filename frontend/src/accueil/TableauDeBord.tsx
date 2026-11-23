import { motion } from 'motion/react'
import { Link } from 'react-router'

import styles from './TableauDeBord.module.css'
import { useBriefing } from './useBriefing'

const DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export function TableauDeBord({ entree }: { entree: boolean }) {
  const { maintenant, salutation, nom, indicateurs, peutSeDeconnecter, seDeconnecter } = useBriefing()

  return (
    <motion.section
      className={styles.tableau}
      aria-labelledby="titre-briefing"
      initial={entree ? { opacity: 0, scale: 0.94 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: entree ? 0.75 : 0, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className={styles.entete}>
        <p className={styles.date}>{DATE_LONGUE.format(maintenant)}</p>
        <h1 className={styles.salut}>
          {salutation}, <span>{nom}</span>
        </h1>
      </header>

      <div className={styles.enteteBriefing}>
        <h2 id="titre-briefing" className={styles.titreBriefing}>
          Briefing du jour
        </h2>
        <Link to="/vie-courante/briefings" className={styles.lireBriefing}>
          Le lire en entier →
        </Link>
      </div>
      <ul className={styles.indicateurs}>
        {indicateurs.map((indicateur) => (
          <li key={indicateur.espace} data-espace={indicateur.espace}>
            <Link
              to={indicateur.chemin}
              className={styles.indicateur}
              data-rempli={indicateur.valeur ? true : undefined}
            >
              <span className={styles.libelle}>{indicateur.libelle}</span>
              {indicateur.valeur ? (
                <span className={styles.valeur}>{indicateur.valeur}</span>
              ) : (
                <span className={styles.valeur} aria-label="Pas encore de donnée">
                  —
                </span>
              )}
              <span className={styles.attente}>{indicateur.detail}</span>
            </Link>
          </li>
        ))}
      </ul>

      {peutSeDeconnecter && (
        <button type="button" className={styles.deconnexion} onClick={seDeconnecter}>
          Se déconnecter
        </button>
      )}
    </motion.section>
  )
}
