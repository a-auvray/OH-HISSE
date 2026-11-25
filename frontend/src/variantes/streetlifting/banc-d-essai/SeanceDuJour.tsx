import { type CSSProperties, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { SeanceDuJour } from '../../../api/types'
import { aujourdhui, kg, lest, nombre } from '../../../commun/format'
import { TYPES_BLOC } from '../../../espaces/streetlifting/chronologie'
import { PeseeRapide } from '../../../espaces/streetlifting/PeseeRapide'
import { useSeanceDuJour } from '../../../espaces/streetlifting/useSeanceDuJour'
import { Etincelle } from '../../../themes/Etincelle'
import { CourbeCaracteristique } from './CourbeCaracteristique'
import { useEvolutions, useObjectifsDuBanc } from './donnees'
import { Feuille } from './Feuille'
import {
  dateDePV,
  historiqueDouzeSemaines,
  intensiteDuJour,
  objectifDeLExercice,
  phraseLimiteVisee,
  referenceDepuis,
  regrouperSeries,
  seriesPrevues,
  typoIntensite,
} from './modele'
import { Reglette } from './Reglette'
import styles from './SeanceDuJour.module.css'

/** Le cartouche du mors du haut, commun aux états de la page. */
const ENTETE_PAR_DEFAUT = <span>Essai du jour</span>

/**
 * La séance du jour comme un essai de traction. L'éprouvette est pincée entre deux mors : le titre
 * prend la largeur de l'intensité du jour, chaque série prévue est un bloc (sa largeur dit les
 * répétitions, sa hauteur la charge en % du 1RM, son chiffre le RPE) et la courbe caractéristique
 * de l'exercice monte jusqu'à sa limite.
 */
export function SeanceDuJourBanc() {
  const { donnees, recharger } = useSeanceDuJour()
  const naviguer = useNavigate()
  const seance = donnees.etat === 'pret' ? donnees.valeur : null
  const identifiants = seance?.bloc ? seance.propositions.map((p) => p.exercice_id) : null
  const evolutions = useEvolutions(identifiants)
  const objectifs = useObjectifsDuBanc()
  const [choisi, choisirExercice] = useState<number | null>(null)

  if (donnees.etat === 'chargement') {
    return (
      <Feuille haut={ENTETE_PAR_DEFAUT} bas={<span>Procès-verbal en cours</span>}>
        <p className={styles.etat} role="status">
          Calcul de la séance…
        </p>
      </Feuille>
    )
  }
  if (donnees.etat === 'erreur') {
    return (
      <Feuille haut={ENTETE_PAR_DEFAUT} bas={<span>Essai interrompu</span>}>
        <p className={styles.etat} role="alert">
          {donnees.message}
        </p>
      </Feuille>
    )
  }

  const donneesSeance: SeanceDuJour = donnees.valeur
  const { bloc } = donneesSeance
  if (!bloc) {
    return (
      <Feuille haut={ENTETE_PAR_DEFAUT} bas={<span>Aucun essai en cours</span>}>
        <section className={`${styles.reserve} ${styles.vide}`}>
          <h1 className={styles.titreVide}>Pas de bloc en cours</h1>
          <p>{donneesSeance.message}</p>
          <div className={styles.actions}>
            <Link className={styles.principal} to="/streetlifting/blocs">
              Importer un bloc
            </Link>
            <Link className={styles.secondaire} to="/streetlifting/saisie">
              Saisir une séance libre
            </Link>
          </div>
        </section>
      </Feuille>
    )
  }

  const poidsDuCorps = donneesSeance.poids?.kg ?? null
  const lues = evolutions.etat === 'pret' ? evolutions.valeur : null
  const referencesPretes =
    lues !== null && (identifiants ?? []).every((id) => id in lues.parExercice || lues.manquants.includes(id))
  const referenceDe = (id: number) => {
    const points = lues?.parExercice[id]
    return points ? referenceDepuis(points) : null
  }

  const lignes = donneesSeance.propositions.map((p) => {
    const reference = referenceDe(p.exercice_id)
    return { proposition: p, series: seriesPrevues(p, poidsDuCorps, reference?.e1rmTotal ?? null) }
  })
  const toutes = lignes.flatMap((l) => l.series)
  const intensite = intensiteDuJour(toutes)
  const pourcent = intensite === null ? null : Math.round(intensite * 100)
  const typo = typoIntensite(intensite)

  // L'exercice de la courbe : celui qu'on a choisi, sinon le premier dont la limite est connue.
  const parDefaut = lignes.find((l) => referenceDe(l.proposition.exercice_id) !== null)?.proposition
    .exercice_id
  const exerciceCourbe = choisi ?? parDefaut ?? null
  const referenceCourbe = exerciceCourbe === null ? null : referenceDe(exerciceCourbe)
  const lignesCourbe = lignes.filter((l) => l.proposition.exercice_id === exerciceCourbe)
  const nomCourbe = lignesCourbe[0]?.proposition.exercice ?? ''
  const objectif =
    exerciceCourbe !== null && objectifs.etat === 'pret'
      ? objectifDeLExercice(objectifs.valeur, exerciceCourbe)
      : undefined
  const historique =
    exerciceCourbe !== null && lues?.parExercice[exerciceCourbe]
      ? historiqueDouzeSemaines(lues.parExercice[exerciceCourbe])
      : []

  const nbSeries = toutes.length
  const nbReps = toutes.reduce((somme, s) => somme + s.reps, 0)

  return (
    <Feuille
      haut={
        <>
          <span className={styles.bloc}>
            {TYPES_BLOC[bloc.type]} · {bloc.nom}
          </span>
          <div
            className={styles.crans}
            role="progressbar"
            aria-label="Avancement du bloc"
            aria-valuemin={1}
            aria-valuemax={bloc.total}
            aria-valuenow={bloc.numero}
            aria-valuetext={`Séance ${bloc.numero} sur ${bloc.total}`}
          >
            <ol style={{ gridTemplateColumns: `repeat(${bloc.total}, minmax(0, 1fr))` }}>
              {Array.from({ length: bloc.total }, (_, i) => (
                <li
                  key={i}
                  data-etat={i < bloc.numero - 1 ? 'fait' : i === bloc.numero - 1 ? 'courant' : 'a-venir'}
                />
              ))}
            </ol>
            <span>
              Séance {bloc.numero} / {bloc.total}
            </span>
          </div>
          {donneesSeance.poids && (
            <span className={styles.poids}>
              Poids du corps <strong>{kg(donneesSeance.poids.kg, 1)}</strong>
              {!donneesSeance.poids.a_jour && <em> · pesée à refaire</em>}
            </span>
          )}
        </>
      }
      bas={
        <>
          <span>Procès-verbal du {dateDePV(aujourdhui())}</span>
          <span>
            {lignes.length} exercice{lignes.length > 1 ? 's' : ''} · {nbSeries} série{nbSeries > 1 ? 's' : ''}{' '}
            · {nbReps} rép.
          </span>
          <span>
            {TYPES_BLOC[bloc.type]} S{bloc.numero}/{bloc.total}
          </span>
        </>
      }
    >
      <div className={styles.corps}>
        <div className={styles.colonne}>
          <header className={styles.heros}>
            <h1
              className={styles.titre}
              style={
                {
                  '--largeur': typo.largeur,
                  '--graisse': typo.graisse,
                  '--suivi': `${typo.suivi}em`,
                } as CSSProperties
              }
            >
              {TYPES_BLOC[bloc.type]} · S{bloc.numero}/{bloc.total}
            </h1>
            <h2 className={styles.nom}>{donneesSeance.nom}</h2>
            {pourcent !== null && (
              <div className={`${styles.reserve} ${styles.intensite}`}>
                <p className={styles.etiquette}>Intensité {pourcent} % e1RM</p>
                <Reglette
                  libelle="Intensité du jour"
                  valeur={pourcent}
                  min={50}
                  max={100}
                  pas={5}
                  texte={`${pourcent} % du 1RM estimé`}
                />
              </div>
            )}
          </header>

          {(!donneesSeance.poids || !donneesSeance.poids.a_jour) && (
            <div className={styles.reserve}>
              <PeseeRapide
                apresPesee={recharger}
                raison={
                  donneesSeance.poids
                    ? 'Ta dernière pesée date de plus de trois semaines.'
                    : 'Sans ton poids, les charges ne peuvent pas être calculées.'
                }
              />
            </div>
          )}

          {donneesSeance.forme && donneesSeance.forme.consignes.length > 0 && (
            <aside className={`${styles.reserve} ${styles.forme}`} role="note">
              <p className={styles.etiquette}>Forme du jour</p>
              <ul>
                {donneesSeance.forme.consignes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Link to="/vie-courante" className={styles.lien}>
                Voir ma récupération →
              </Link>
            </aside>
          )}

          <ol className={styles.rangees}>
            {lignes.map(({ proposition: p, series }, i) => {
              const reference = referenceDe(p.exercice_id)
              const selectionnee = p.exercice_id === exerciceCourbe
              return (
                <li
                  key={`${p.exercice_id}-${i}`}
                  className={`${styles.reserve} ${styles.rangee}`}
                  style={{ '--rang': i } as CSSProperties}
                >
                  <div className={styles.enteteRangee}>
                    <h3>{p.exercice}</h3>
                    <button
                      type="button"
                      className={styles.courbeBouton}
                      aria-pressed={selectionnee}
                      aria-label={`Voir la courbe de ${p.exercice}`}
                      onClick={() => choisirExercice(p.exercice_id)}
                    >
                      Courbe
                    </button>
                  </div>
                  <p className={styles.programme}>
                    {p.series}×{p.reps} {p.lest_kg === null ? '· charge à choisir' : `@ ${lest(p.lest_kg)}`} ·
                    RPE cible {nombre(p.rpe_cible)}
                  </p>
                  <ul className={styles.blocs} aria-label={`${p.series} séries prévues`}>
                    {series.map((s) => (
                      <li
                        key={s.indice}
                        style={
                          {
                            '--reps': s.reps,
                            '--hauteur': s.intensite ?? 0.5,
                          } as CSSProperties
                        }
                      >
                        <span className={styles.rpe} aria-hidden="true">
                          {nombre(s.rpe)}
                        </span>
                        <span className="sr-only">
                          Série {s.indice} : {s.reps} reps à RPE {nombre(s.rpe)}
                          {s.intensite !== null ? `, ${Math.round(s.intensite * 100)} % du 1RM` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {referencesPretes && !reference && (
                    <p className={styles.marge}>
                      Pas encore de 1RM estimé : la hauteur des blocs suit la table RPE.
                    </p>
                  )}
                  {p.justifications.length > 0 && (
                    <ul className={styles.raisons} aria-label={`Pourquoi cette charge pour ${p.exercice}`}>
                      {p.justifications.map((j) => (
                        <li key={j}>{j}</li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>

          <div className={styles.lancer}>
            <button
              type="button"
              className={styles.principal}
              onClick={() => naviguer('/streetlifting/saisie', { state: { seanceDuJour: donneesSeance } })}
            >
              Commencer la séance →
            </button>
          </div>
        </div>

        <div className={styles.colonne}>
          {evolutions.etat === 'erreur' && (
            <p className={`${styles.reserve} ${styles.note}`} role="alert">
              {evolutions.message}
            </p>
          )}
          {!referencesPretes && evolutions.etat !== 'erreur' && (
            <p className={`${styles.reserve} ${styles.note}`} role="status">
              Lecture de la limite de l’éprouvette…
            </p>
          )}
          {referencesPretes && referenceCourbe && (
            <>
              <CourbeCaracteristique
                exercice={nomCourbe}
                e1rmTotal={referenceCourbe.e1rmTotal}
                e1rmLest={referenceCourbe.e1rmLest}
                series={regrouperSeries(lignesCourbe.flatMap((l) => l.series))}
                limiteVisee={
                  objectif
                    ? {
                        charge: referenceCourbe.poidsDuCorps + objectif.valeur_cible_kg,
                        lest: objectif.valeur_cible_kg,
                      }
                    : null
                }
                nomTrace="seance"
              />
              {objectif && (
                <p className={`${styles.reserve} ${styles.note}`}>
                  {phraseLimiteVisee(referenceCourbe.e1rmLest, objectif.valeur_cible_kg)}
                </p>
              )}
              <figure className={`${styles.reserve} ${styles.historique}`}>
                <figcaption className={styles.etiquette}>1RM · 12 semaines</figcaption>
                {historique.length >= 2 ? (
                  <div className={styles.trait}>
                    <Etincelle valeurs={historique.map((h) => h.valeur)} largeur={240} hauteur={72} />
                    <strong>+{nombre(historique.at(-1)?.valeur ?? 0)} kg</strong>
                  </div>
                ) : (
                  <p className={styles.marge}>Pas assez de séances estimées pour tracer l’historique.</p>
                )}
              </figure>
            </>
          )}
          {referencesPretes && !referenceCourbe && (
            <p className={`${styles.reserve} ${styles.note}`}>
              La limite de l’éprouvette n’est pas encore connue : elle demande une série avec RPE et une
              pesée.
            </p>
          )}
        </div>
      </div>
    </Feuille>
  )
}
