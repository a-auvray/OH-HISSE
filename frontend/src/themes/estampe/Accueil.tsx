import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useBriefing } from '../../accueil/useBriefing'
import { nombre } from '../../commun/format'
import type { IdEspace } from '../../espaces/espaces'
import { useTheme } from '../contexte'
import { useTon } from '../ton'
import styles from './Accueil.module.css'
import { Fils } from './Fils'
import { parametresFils } from './modele'

const EXPO = [0.16, 1, 0.3, 1] as const
const DATE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const NOM_DANGER = { vert: 'vert', rouge: 'rouge', noir: 'noir' } as const

function heuresMinutes(heures: number): string {
  const total = Math.round(heures * 60)
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')}`
}

/**
 * Accueil du thème Estampe : quatre faisceaux de fils d'encre partent des quatre
 * bords, chacun dit une donnée par son comportement, et au centre, dans la
 * réserve que les fils contournent, le titre est le briefing lui-même.
 */
export function AccueilEstampe() {
  const { animation } = useTheme()
  const { maintenant, salutation, nom, donnees, phrase, peutSeDeconnecter, seDeconnecter } = useBriefing()
  const [ton, changerTon] = useTon()
  const [survol, setSurvol] = useState<IdEspace | null>(null)

  const parametres = parametresFils(donnees)
  const vie = donnees?.vie
  const seance = donnees?.seance
  const mer = donnees?.mer
  const principal =
    donnees?.objectifs.find((o) => o.principal && o.statut === 'en_cours') ??
    donnees?.objectifs.find((o) => o.statut === 'en_cours')

  const recuperation = vie ? Math.round(vie.recuperation.progression * 100) : null
  const objectif = principal?.progression ? Math.round(principal.progression.pourcentage) : null
  const coefficient =
    mer?.marees.find((m) => m.coefficient != null && new Date(m.instant) > maintenant)?.coefficient ??
    mer?.marees.find((m) => m.coefficient != null)?.coefficient

  const bords: readonly {
    espace: IdEspace
    cote: 'haut' | 'gauche' | 'droite' | 'bas'
    nom: string
    chiffre: string
    detail: string
    progression: { libelle: string; valeur: number; max: number } | null
  }[] = [
    {
      espace: 'vie-courante',
      cote: 'haut',
      nom: 'Vie courante',
      chiffre: recuperation === null ? '—' : `${recuperation} %`,
      detail: vie
        ? vie.recuperation.recupere
          ? 'récupération complète'
          : `récupération · encore ${Math.round(vie.recuperation.restant_h)} h`
        : 'récupération',
      progression: { libelle: 'Récupération', valeur: recuperation ?? 0, max: 100 },
    },
    {
      espace: 'streetlifting',
      cote: 'gauche',
      nom: 'Streetlifting',
      chiffre: seance?.bloc ? `S${seance.bloc.numero}/${seance.bloc.total}` : '—',
      detail: seance?.nom ?? 'aucun bloc en cours',
      progression: {
        libelle: 'Avancement du bloc',
        valeur: seance?.bloc?.numero ?? 0,
        max: seance?.bloc?.total ?? 0,
      },
    },
    {
      espace: 'marine',
      cote: 'droite',
      nom: 'Marine',
      chiffre: mer ? `danger ${NOM_DANGER[mer.danger.niveau]}` : '—',
      detail: mer
        ? [mer.spot.nom, coefficient != null && `coefficient ${coefficient}`].filter(Boolean).join(' · ')
        : 'conditions indisponibles',
      progression: null,
    },
    {
      espace: 'objectifs',
      cote: 'bas',
      nom: 'Objectifs',
      chiffre: objectif === null ? '—' : `${objectif} %`,
      detail: principal
        ? `${principal.titre}${principal.progression ? ` · +${nombre(principal.progression.e1rm_lest_kg)} / ${nombre(principal.valeur_cible_kg)} kg` : ''}`
        : 'fixe un cap',
      progression: { libelle: principal?.titre ?? 'Objectif principal', valeur: objectif ?? 0, max: 100 },
    },
  ]

  return (
    <main className={styles.feuille} data-ton={ton}>
      <Fils
        parametres={parametres}
        heure={maintenant.getHours() + maintenant.getMinutes() / 60}
        animation={animation}
        survol={survol}
        ton={ton}
      />

      <header className={styles.marque}>
        <p>OH HISSE !</p>
        <p className={styles.date}>{DATE.format(maintenant)}</p>
      </header>

      {peutSeDeconnecter && (
        <button type="button" className={`${styles.discret} ${styles.deconnexion}`} onClick={seDeconnecter}>
          Se déconnecter
        </button>
      )}

      <button
        type="button"
        className={`${styles.discret} ${styles.ton}`}
        onClick={changerTon}
        aria-pressed={ton === 'soir'}
      >
        {ton === 'jour' ? '◐ Mode sombre' : '◑ Mode clair'}
      </button>

      {bords.map((b, i) => (
        <motion.div
          key={b.espace}
          className={styles.bord}
          data-cote={b.cote}
          data-espace={b.espace}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: EXPO }}
        >
          <Link
            to={`/${b.espace}`}
            aria-label={`${b.nom} : ouvrir l’espace`}
            onMouseEnter={() => setSurvol(b.espace)}
            onMouseLeave={() => setSurvol(null)}
            onFocus={() => setSurvol(b.espace)}
            onBlur={() => setSurvol(null)}
          >
            <span className={styles.nom}>{b.nom}</span>
            <span className={styles.chiffre}>{b.chiffre}</span>
            <span className={styles.detail}>{b.detail}</span>
          </Link>
          {b.progression && b.progression.max > 0 && (
            <div
              className={styles.barre}
              role="progressbar"
              aria-label={b.progression.libelle}
              aria-valuemin={0}
              aria-valuemax={b.progression.max}
              aria-valuenow={b.progression.valeur}
            >
              <i style={{ ['--p' as string]: b.progression.valeur / b.progression.max }} />
            </div>
          )}
        </motion.div>
      ))}

      <section className={styles.reserve} aria-label="Briefing du jour">
        <p className={styles.salut}>
          {salutation}, {nom}
        </p>
        <h1 className={styles.titre}>
          {phrase.lignes.map((ligne, i) => (
            <span key={ligne} className={styles.ligne}>
              <motion.span
                initial={animation === 'immobile' ? false : { y: '105%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.25 + i * 0.08, ease: EXPO }}
              >
                {ligne}
              </motion.span>
            </span>
          ))}
        </h1>
        <p className={styles.unePar}>
          <b>
            À la une :{' '}
            {phrase.pourquoi.espace === 'marine'
              ? 'Marine'
              : phrase.pourquoi.espace === 'vie-courante'
                ? 'Vie courante'
                : 'Streetlifting'}
          </b>{' '}
          · {phrase.pourquoi.texte}
        </p>
        {phrase.resume && <p className={styles.resume}>{phrase.resume}</p>}
        {vie && (
          <p className={styles.chiffres}>
            Sommeil {vie.sommeil.derniere_nuit_h == null ? '—' : heuresMinutes(vie.sommeil.derniere_nuit_h)}
          </p>
        )}
      </section>
    </main>
  )
}
