import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useBriefing } from '../../accueil/useBriefing'
import { kg, lest, nombre } from '../../commun/format'
import type { Direction, IdEspace } from '../../espaces/espaces'
import { useSession } from '../../session/contexte'
import styles from './Accueil.module.css'
import { CourbeDeMaree } from './CourbeDeMaree'
import { useTon } from './ton'

/** L'entrée en scène ne se joue qu'une fois par connexion, comme pour les autres thèmes. */
let entreeJoueePour: number | null = null

const EXPO = [0.16, 1, 0.3, 1] as const

/** D'où arrive l'encre de chaque espace : par l'axe de la croix où il se trouve. */
const AXE: Record<IdEspace, { x: number; y: number }> = {
  streetlifting: { x: -28, y: 0 },
  marine: { x: 28, y: 0 },
  'vie-courante': { x: 0, y: -28 },
  objectifs: { x: 0, y: 28 },
}

const RABATS: readonly {
  espace: IdEspace
  cote: Direction
  mot: string
  libelle: string
}[] = [
  { espace: 'vie-courante', cote: 'haut', mot: 'Vie', libelle: 'Vie courante' },
  { espace: 'streetlifting', cote: 'gauche', mot: 'STREET', libelle: 'Streetlifting' },
  { espace: 'marine', cote: 'droite', mot: 'Marine', libelle: 'Marine' },
  { espace: 'objectifs', cote: 'bas', mot: 'OBJECTIFS', libelle: 'Objectifs' },
]

/** Le pli s'ouvre autour de son bord intérieur : le rabat vient du dehors se rabattre sur la feuille. */
const DEPART_RABAT: Record<Direction, { rotateX?: number; rotateY?: number }> = {
  gauche: { rotateY: -96 },
  droite: { rotateY: 96 },
  haut: { rotateX: 96 },
  bas: { rotateX: -96 },
}

const LienAnime = motion.create(Link)

const NOM_DANGER = { vert: 'VERT', rouge: 'ROUGE', noir: 'NOIR' } as const
const VERDICT_ECART = {
  oui: 'Ce soir, t’as le droit.',
  petit: 'Un petit, oui.',
  non: 'Pas cette fois.',
} as const

function heuresMinutes(heures: number): string {
  const total = Math.round(heures * 60)
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')}`
}

const DATE = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'numeric' })
const DATE_ECHEANCE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Accueil du thème Papier : une feuille crème dont les quatre bords sont des
 * rabats portant chacun le nom d'un espace. Au centre, la phrase du jour et un
 * bloc par espace, tous calculés par `useBriefing` comme dans les autres thèmes.
 */
export function AccueilPapier() {
  const { etat } = useSession()
  const utilisateurId = etat.statut === 'connecte' ? etat.utilisateur.id : null
  const [entree] = useState(() => entreeJoueePour !== utilisateurId)
  useEffect(() => {
    entreeJoueePour = utilisateurId
  }, [utilisateurId])

  const { maintenant, salutation, nom, donnees, phrase, peutSeDeconnecter, seDeconnecter } = useBriefing()
  const [ton, changerTon] = useTon()

  const seance = donnees?.seance
  const vie = donnees?.vie
  const mer = donnees?.mer
  const objectifs = (donnees?.objectifs ?? []).filter((o) => o.statut === 'en_cours')
  const principal = objectifs.find((o) => o.principal) ?? objectifs[0]
  const autres = objectifs.filter((o) => o !== principal).slice(0, 2)

  const coefficient =
    mer?.marees.find((m) => m.coefficient != null && new Date(m.instant) > maintenant)?.coefficient ??
    mer?.marees.find((m) => m.coefficient != null)?.coefficient
  const recuperation = vie ? Math.round(vie.recuperation.progression * 100) : null

  /** Apparition d'un bloc : l'encre arrive par l'axe de son espace. */
  const arrivee = (espace: IdEspace, rang: number) => ({
    initial: entree ? { opacity: 0, ...AXE[espace] } : false,
    animate: { opacity: 1, x: 0, y: 0 },
    transition: { duration: 0.9, delay: 0.7 + rang * 0.08, ease: EXPO },
  })

  return (
    <main className={styles.feuille} data-ton={ton}>
      <div className={styles.papier} aria-hidden="true" />

      {RABATS.map(({ espace, cote, mot, libelle }, i) => (
        <LienAnime
          key={espace}
          to={`/${espace}`}
          className={styles.rabat}
          data-cote={cote}
          data-espace={espace}
          aria-label={`${libelle} : ouvrir l’espace`}
          initial={entree ? { ...DEPART_RABAT[cote], opacity: 0 } : false}
          animate={{ rotateX: 0, rotateY: 0, opacity: 1 }}
          whileHover={{
            rotateX: cote === 'haut' ? 5 : cote === 'bas' ? -5 : 0,
            rotateY: cote === 'gauche' ? 5 : cote === 'droite' ? -5 : 0,
          }}
          transition={{ duration: 1.3, delay: 0.1 + i * 0.12, ease: EXPO }}
        >
          <span className={styles.mot} aria-hidden="true">
            {mot}
          </span>
        </LienAnime>
      ))}

      <header className={styles.coin}>
        <p className={styles.marque}>OH HISSE !</p>
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

      <div className={styles.centre}>
        <motion.section
          className={styles.vie}
          data-espace="vie-courante"
          aria-labelledby="papier-vie"
          {...arrivee('vie-courante', 0)}
        >
          <h2 id="papier-vie" className={styles.rubrique}>
            Récupération
          </h2>
          <div className={styles.ligneVie}>
            <div>
              <p className={styles.heros}>{recuperation === null ? '—' : <>{recuperation}&#8239;%</>}</p>
              <div
                className={styles.barre}
                role="progressbar"
                aria-label="Récupération"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={recuperation ?? 0}
              >
                <i style={{ ['--p' as string]: (recuperation ?? 0) / 100 }} />
              </div>
              <p className={styles.note}>
                {vie
                  ? vie.recuperation.recupere
                    ? 'pleine forme'
                    : `encore ${Math.round(vie.recuperation.restant_h)} h avant pleine forme`
                  : 'estimée à partir des séances et du sommeil'}
              </p>
            </div>
            <div className={styles.chiffres}>
              <p>
                Sommeil{' '}
                <b>
                  {vie?.sommeil.derniere_nuit_h == null ? '—' : heuresMinutes(vie.sommeil.derniere_nuit_h)}
                </b>
              </p>
              <p>
                Pesée <b>{vie?.poids ? kg(vie.poids.kg, 1) : '—'}</b>
              </p>
              <Link to="/vie-courante" className={styles.entrer}>
                Entrer dans Vie courante ↑
              </Link>
            </div>
            <p className={styles.ecart}>{vie ? VERDICT_ECART[vie.cheat_meal.verdict] : ''}</p>
          </div>
        </motion.section>

        <motion.section
          className={styles.street}
          data-espace="streetlifting"
          aria-labelledby="papier-street"
          {...arrivee('streetlifting', 1)}
        >
          <h2 id="papier-street" className={styles.rubrique}>
            Séance du jour
          </h2>
          <p className={styles.heros}>{seance?.bloc ? `S${seance.bloc.numero}/${seance.bloc.total}` : '—'}</p>
          <div
            className={styles.barre}
            role="progressbar"
            aria-label="Avancement du bloc"
            aria-valuemin={0}
            aria-valuemax={seance?.bloc?.total ?? 0}
            aria-valuenow={seance?.bloc?.numero ?? 0}
          >
            <i style={{ ['--p' as string]: seance?.bloc ? seance.bloc.numero / seance.bloc.total : 0 }} />
          </div>
          <p className={styles.note}>{seance?.nom ?? 'Importe un bloc pour recevoir ta séance'}</p>
          <ul className={styles.exercices}>
            {(seance?.propositions ?? []).slice(0, 3).map((p) => (
              <li key={p.exercice_id}>
                <span>{p.exercice}</span>
                <b>
                  {p.series}×{p.reps}
                  {p.lest_kg == null ? '' : ` @ ${lest(p.lest_kg)}`}
                </b>
              </li>
            ))}
          </ul>
          <Link to="/streetlifting" className={styles.entrer}>
            ← Entrer dans Streetlifting
          </Link>
        </motion.section>

        <motion.div className={styles.phrase} {...arrivee('vie-courante', 2)}>
          <p className={styles.salut}>
            {salutation}, {nom}
          </p>
          <h1 className={styles.titre}>
            {phrase.lignes.map((ligne, i) => (
              <span key={ligne} className={styles.ligne}>
                <motion.span
                  initial={entree ? { y: '105%' } : false}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, delay: 0.55 + i * 0.07, ease: EXPO }}
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
        </motion.div>

        <motion.section
          className={styles.marine}
          data-espace="marine"
          aria-labelledby="papier-marine"
          {...arrivee('marine', 3)}
        >
          <div className={styles.enteteMarine}>
            <h2 id="papier-marine" className={styles.rubrique}>
              {mer ? mer.spot.nom : 'En mer'}
            </h2>
            {mer && (
              <span className={styles.danger} data-niveau={mer.danger.niveau} role="status">
                {NOM_DANGER[mer.danger.niveau]}
              </span>
            )}
          </div>
          <div className={styles.ligneMarine}>
            <p className={styles.heros}>{coefficient ?? '—'}</p>
            <p className={styles.note}>
              coefficient
              <br />
              {mer?.danger.raisons[0]?.texte ?? 'conditions et danger en direct'}
            </p>
          </div>
          {mer && <CourbeDeMaree mer={mer} maintenant={maintenant} />}
          <p className={styles.note}>
            {mer
              ? [
                  mer.maintenant.eau_c != null && `eau ${Math.round(mer.maintenant.eau_c)}°`,
                  mer.maintenant.air_c != null && `air ${Math.round(mer.maintenant.air_c)}°`,
                  mer.maintenant.vent_kmh != null && `vent ${Math.round(mer.maintenant.vent_kmh)} km/h`,
                  mer.maintenant.houle_m != null && `houle ${nombre(mer.maintenant.houle_m)} m`,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Les conditions de mer sont indisponibles pour l’instant.'}
          </p>
          <Link to="/marine" className={styles.entrer}>
            Entrer dans Marine →
          </Link>
        </motion.section>

        <motion.section
          className={styles.objectifs}
          data-espace="objectifs"
          aria-labelledby="papier-objectifs"
          {...arrivee('objectifs', 4)}
        >
          <h2 id="papier-objectifs" className={styles.rubrique}>
            Objectif principal
          </h2>
          {principal ? (
            <>
              <div className={styles.ligneObjectif}>
                <p className={styles.heros}>
                  {principal.progression ? <>{Math.round(principal.progression.pourcentage)}&#8239;%</> : '—'}
                </p>
                <div>
                  <div
                    className={styles.barre}
                    role="progressbar"
                    aria-label={principal.titre}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(principal.progression?.pourcentage ?? 0)}
                  >
                    <i style={{ ['--p' as string]: (principal.progression?.pourcentage ?? 0) / 100 }} />
                  </div>
                  <p className={styles.note}>
                    {principal.titre}
                    {principal.progression &&
                      ` · +${nombre(principal.progression.e1rm_lest_kg)} / ${nombre(principal.valeur_cible_kg)} kg`}
                    {` · ${DATE_ECHEANCE.format(new Date(`${principal.date_cible}T12:00:00`))}`}
                  </p>
                </div>
              </div>
              {autres.length > 0 && (
                <p className={styles.note}>
                  {autres
                    .map(
                      (o) =>
                        `${o.titre}${o.progression ? ` · ${Math.round(o.progression.pourcentage)} %` : ''}`,
                    )
                    .join(' — ')}
                </p>
              )}
            </>
          ) : (
            <p className={styles.note}>Fixe un cap pour suivre ta progression.</p>
          )}
          <Link to="/objectifs" className={styles.entrer}>
            Entrer dans Objectifs ↓
          </Link>
        </motion.section>
      </div>
    </main>
  )
}
