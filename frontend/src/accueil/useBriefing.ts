import { useState } from 'react'

import { api } from '../api/client'
import { nombre } from '../commun/format'
import { useDonnees } from '../commun/useDonnees'
import type { IdEspace } from '../espaces/espaces'
import { useSession } from '../session/contexte'

/** Un chiffre du briefing du jour, résumé pour un espace. */
export interface Indicateur {
  espace: IdEspace
  libelle: string
  chemin: string
  /** Null tant qu'il n'y a pas de donnée (le thème affiche alors un tiret). */
  valeur: string | null
  detail: string
}

const NIVEAUX = { vert: 'Vert', rouge: 'Rouge', noir: 'Noir' } as const
const ECARTS = { oui: 'ce soir, t’as le droit', petit: 'un petit, oui', non: 'pas cette fois' } as const

/** Ce que le briefing lit, à partir des espaces déjà construits. */
async function chargerBriefing() {
  const [seance, objectifs, mer, vie] = await Promise.all([
    api.GET('/api/streetlifting/seance-du-jour').then((r) => r.data ?? null),
    api.GET('/api/objectifs').then((r) => r.data ?? []),
    // La mer peut être indisponible (Open-Meteo) : le briefing s'affiche quand même.
    api
      .GET('/api/marine/conditions')
      .then((r) => r.data ?? null)
      .catch(() => null),
    api.GET('/api/vie-courante/etat').then((r) => r.data ?? null),
  ])
  return { seance, objectifs, mer, vie }
}

/** Les données brutes du briefing : de quoi construire un affichage plus riche que les quatre indicateurs. */
export type DonneesBriefing = Awaited<ReturnType<typeof chargerBriefing>>

export function salutation(heure: number): string {
  if (heure < 5 || heure >= 18) return 'Bonsoir'
  return 'Bonjour'
}

/** Les indicateurs du briefing (note 07), un par espace, à partir des données lues. */
export function indicateursDuBriefing(donnees: DonneesBriefing | null): Indicateur[] {
  const seance = donnees?.seance
  const mer = donnees?.mer
  const vie = donnees?.vie
  const objectif =
    donnees?.objectifs.find((o) => o.principal && o.statut === 'en_cours') ??
    donnees?.objectifs.find((o) => o.statut === 'en_cours')

  return [
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
      valeur: vie
        ? vie.recuperation.recupere
          ? 'Récupéré'
          : `Encore ${Math.round(vie.recuperation.restant_h)} h`
        : null,
      detail: vie
        ? `Écart : ${ECARTS[vie.cheat_meal.verdict]}`
        : 'Estimée à partir des séances et du sommeil',
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
}

/**
 * Tout ce que l'accueil a besoin de savoir, commun à tous les thèmes : le
 * thème décide seulement comment le montrer.
 */
export function useBriefing() {
  const { etat, seDeconnecter } = useSession()
  const utilisateur = etat.statut === 'connecte' ? etat.utilisateur : null
  const [maintenant] = useState(() => new Date())
  const [briefing] = useDonnees(chargerBriefing, [])
  const donnees = briefing.etat === 'pret' ? briefing.valeur : null

  return {
    maintenant,
    salutation: salutation(maintenant.getHours()),
    nom: utilisateur?.nom_affiche,
    /** En démo, le bandeau s'occupe déjà de la déconnexion. */
    peutSeDeconnecter: !!utilisateur && !utilisateur.est_demo,
    seDeconnecter: () => void seDeconnecter(),
    donnees,
    indicateurs: indicateursDuBriefing(donnees),
  }
}
