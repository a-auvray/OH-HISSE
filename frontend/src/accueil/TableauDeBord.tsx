import { motion } from 'motion/react'
import { useState } from 'react'

import { Link } from 'react-router'

import { api } from '../api/client'
import { nombre } from '../commun/format'
import { useDonnees } from '../commun/useDonnees'
import type { IdEspace } from '../espaces/espaces'
import { useSession } from '../session/contexte'
import styles from './TableauDeBord.module.css'

interface Indicateur {
  espace: IdEspace
  libelle: string
  chemin: string
  valeur: string | null
  detail: string
}

const NIVEAUX = { vert: 'Vert', rouge: 'Rouge', noir: 'Noir' } as const

/** Ce que le briefing affiche, à partir des espaces déjà construits. */
async function chargerBriefing() {
  const [seance, objectifs, mer] = await Promise.all([
    api.GET('/api/streetlifting/seance-du-jour').then((r) => r.data ?? null),
    api.GET('/api/objectifs').then((r) => r.data ?? []),
    // La mer peut être indisponible (Open-Meteo) : le briefing s'affiche quand même.
    api
      .GET('/api/marine/conditions')
      .then((r) => r.data ?? null)
      .catch(() => null),
  ])
  return { seance, objectifs, mer }
}

function salutation(heure: number): string {
  if (heure < 5 || heure >= 18) return 'Bonsoir'
  return 'Bonjour'
}

const DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export function TableauDeBord({ entree }: { entree: boolean }) {
  const { etat, seDeconnecter } = useSession()
  const utilisateur = etat.statut === 'connecte' ? etat.utilisateur : null
  const [maintenant] = useState(() => new Date())
  const [briefing] = useDonnees(chargerBriefing, [])
  const donnees = briefing.etat === 'pret' ? briefing.valeur : null
  const seance = donnees?.seance
  const mer = donnees?.mer
  const objectif =
    donnees?.objectifs.find((o) => o.principal && o.statut === 'en_cours') ??
    donnees?.objectifs.find((o) => o.statut === 'en_cours')

  // Les quatre indicateurs du briefing du jour (note 07) ; Marine et Vie courante arrivent en phases 3 et 4.
  const indicateurs: Indicateur[] = [
    {
      espace: 'streetlifting',
      libelle: 'Séance du jour',
      chemin: '/streetlifting',
      valeur: seance?.nom ?? null,
      detail: seance?.bloc
        ? `Séance ${seance.bloc.numero} / ${seance.bloc.total} · ${seance.propositions.length} exercices`
        : 'Importe un bloc pour la recevoir',
    },
    {
      espace: 'vie-courante',
      libelle: 'Récupération',
      chemin: '/vie-courante',
      valeur: null,
      detail: 'Estimée à partir des séances et du sommeil',
    },
    {
      espace: 'marine',
      libelle: 'En mer',
      chemin: '/marine',
      valeur: mer?.danger
        ? `${NIVEAUX[mer.danger.niveau]}${mer.maintenant.eau_c != null ? ` · eau ${Math.round(mer.maintenant.eau_c)} °C` : ''}`
        : null,
      detail: mer?.danger
        ? (mer.danger.raisons[0]?.texte ?? `Conditions favorables à ${mer.spot.nom}`)
        : 'Conditions et niveau de danger en direct',
    },
    {
      espace: 'objectifs',
      libelle: 'Objectif principal',
      chemin: '/objectifs',
      valeur: objectif?.progression
        ? `+${nombre(objectif.progression.e1rm_lest_kg)} / ${nombre(objectif.valeur_cible_kg)} kg`
        : null,
      detail: objectif
        ? `${objectif.titre}${objectif.progression ? ` · ${Math.round(objectif.progression.pourcentage)} %` : ''}`
        : 'Fixe un cap pour suivre ta progression',
    },
  ]

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

      {utilisateur && !utilisateur.est_demo && (
        <button type="button" className={styles.deconnexion} onClick={() => void seDeconnecter()}>
          Se déconnecter
        </button>
      )}
    </motion.section>
  )
}
