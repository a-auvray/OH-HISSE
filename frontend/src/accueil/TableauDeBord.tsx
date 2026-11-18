import { motion } from 'motion/react'
import { useState } from 'react'

import type { IdEspace } from '../espaces/espaces'
import { useSession } from '../session/contexte'
import styles from './TableauDeBord.module.css'

interface Indicateur {
  espace: IdEspace
  libelle: string
  attente: string
}

/**
 * Les quatre indicateurs du briefing du jour (note 07). Ils affichent pour
 * l'instant leur état d'attente : chaque espace les remplira en arrivant.
 */
const INDICATEURS: Indicateur[] = [
  { espace: 'streetlifting', libelle: 'Séance du jour', attente: 'Calculée après tes premières séances' },
  { espace: 'vie-courante', libelle: 'Récupération', attente: 'Estimée à partir des séances et du sommeil' },
  { espace: 'marine', libelle: 'En mer', attente: 'Conditions et niveau de danger en direct' },
  { espace: 'objectifs', libelle: 'Objectif principal', attente: 'Progression vers ta cible' },
]

function salutation(heure: number): string {
  if (heure < 5 || heure >= 18) return 'Bonsoir'
  return 'Bonjour'
}

const DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export function TableauDeBord({ entree }: { entree: boolean }) {
  const { etat, seDeconnecter } = useSession()
  const utilisateur = etat.statut === 'connecte' ? etat.utilisateur : null
  const [maintenant] = useState(() => new Date())

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
          {salutation(maintenant.getHours())}, <span>{utilisateur?.nom_affiche}</span>
        </h1>
      </header>

      <h2 id="titre-briefing" className={styles.titreBriefing}>
        Briefing du jour
      </h2>
      <ul className={styles.indicateurs}>
        {INDICATEURS.map((indicateur) => (
          <li key={indicateur.espace} data-espace={indicateur.espace} className={styles.indicateur}>
            <span className={styles.libelle}>{indicateur.libelle}</span>
            <span className={styles.valeur} aria-label="Pas encore de donnée">
              —
            </span>
            <span className={styles.attente}>{indicateur.attente}</span>
          </li>
        ))}
      </ul>

      {utilisateur && !utilisateur.est_demo && (
        <button type="button" className={styles.deconnexion} onClick={() => void seDeconnecter()}>
          Se déconnecter
        </button>
      )}
    </motion.section>
  )
}
