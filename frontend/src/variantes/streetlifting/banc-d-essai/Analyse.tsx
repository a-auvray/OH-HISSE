import { dateCourte, lest, nombre } from '../../../commun/format'
import { PERIODES } from '../../../espaces/streetlifting/metriques'
import { useAnalyse } from '../../../espaces/streetlifting/useAnalyse'
import { Etincelle } from '../../../themes/Etincelle'
import styles from './Analyse.module.css'
import { CourbeCaracteristique } from './CourbeCaracteristique'
import { useObjectifsDuBanc } from './donnees'
import { Feuille } from './Feuille'
import { GraphiqueSerie } from './GraphiqueSerie'
import { objectifDeLExercice, phraseLimiteVisee, referenceDepuis } from './modele'
import { Reglette } from './Reglette'

/**
 * L'analyse comme un procès-verbal : le tableau des résultats (1RM actuel, meilleur, progression),
 * la courbe caractéristique de l'exercice avec sa limite visée, puis chaque grandeur dans le temps.
 * Les données sont celles de l'analyse commune ; ici, seule la forme est propre à la variante.
 */
export function AnalyseBanc() {
  const a = useAnalyse()
  const objectifs = useObjectifsDuBanc()
  const { definition, points } = a

  const brut = a.evolution.etat === 'pret' ? a.evolution.valeur : []
  const reference = referenceDepuis(brut)
  const exercice =
    a.exercices.etat === 'pret' ? a.exercices.valeur.find((e) => e.id === a.exerciceId)?.nom : undefined
  const objectif =
    a.exerciceId !== null && objectifs.etat === 'pret'
      ? objectifDeLExercice(objectifs.valeur, a.exerciceId)
      : undefined
  const progression = a.premier && a.dernier ? a.dernier.valeur - a.premier.valeur : null
  const brutVise = objectif
    ? (objectif.progression?.pourcentage ??
      (objectif.valeur_cible_kg <= 0 ? 100 : ((a.dernier?.valeur ?? 0) / objectif.valeur_cible_kg) * 100))
    : null
  const pourcentageVise =
    brutVise !== null && Number.isFinite(brutVise)
      ? Math.round(Math.min(100, Math.max(0, brutVise)))
      : objectif
        ? 0
        : null
  const rpeParDate = new Map(
    (a.parMetrique.find((m) => m.id === 'rpe_moyen')?.points ?? []).map((p) => [p.date, p.valeur] as const),
  )
  const libellePeriode = PERIODES.find((p) => p.id === a.periode)?.libelle.toLowerCase() ?? ''

  return (
    <Feuille
      haut={
        <>
          <span className={styles.titreMors}>Procès-verbal d’analyse</span>
          {exercice && <span>Éprouvette · {exercice}</span>}
        </>
      }
      bas={
        <>
          <span>
            {points.length} mesure{points.length > 1 ? 's' : ''} · par {libellePeriode}
          </span>
          {a.dernier && <span>Dernier essai le {dateCourte(a.dernier.date)}</span>}
        </>
      }
    >
      <section className={styles.page}>
        <header className={`${styles.reserve} ${styles.filtres}`}>
          <div className={styles.choix} role="radiogroup" aria-label="Exercice">
            {a.exercices.etat === 'pret' &&
              a.exercices.valeur.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  role="radio"
                  aria-checked={e.id === a.exerciceId}
                  onClick={() => a.choisirExercice(e.id)}
                >
                  {e.nom}
                </button>
              ))}
          </div>
          <div className={styles.choix} role="radiogroup" aria-label="Période">
            {PERIODES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === a.periode}
                onClick={() => a.choisirPeriode(p.id)}
              >
                {p.libelle}
              </button>
            ))}
          </div>
        </header>

        {a.exercices.etat === 'chargement' && (
          <p className={styles.etat} role="status">
            Lecture des exercices…
          </p>
        )}
        {a.exercices.etat === 'erreur' && (
          <p className={styles.etat} role="alert">
            {a.exercices.message}
          </p>
        )}

        <div className={styles.haut}>
          <div className={styles.resultats}>
            <dl className={`${styles.reserve} ${styles.chiffres}`}>
              <div>
                <dt>1RM actuel</dt>
                <dd className={styles.limite}>{a.dernier ? `+${nombre(a.dernier.valeur)} kg` : '—'}</dd>
                <dd className={styles.detail}>
                  {a.dernier ? `le ${dateCourte(a.dernier.date)}` : 'pas encore estimé'}
                </dd>
              </div>
              <div>
                <dt>Meilleur</dt>
                <dd>{a.meilleur ? `+${nombre(a.meilleur.valeur)} kg` : '—'}</dd>
                <dd className={styles.detail}>{a.meilleur ? `le ${dateCourte(a.meilleur.date)}` : ''}</dd>
              </div>
              <div>
                <dt>Progression</dt>
                <dd>
                  {progression === null ? '—' : `${progression >= 0 ? '+' : ''}${nombre(progression)} kg`}
                </dd>
                <dd className={styles.detail}>
                  {a.premier ? `depuis le ${dateCourte(a.premier.date)}` : ''}
                </dd>
              </div>
            </dl>

            {objectif && pourcentageVise !== null && (
              <div className={`${styles.reserve} ${styles.visee}`}>
                <p className={styles.etiquette}>
                  Vers {lest(objectif.valeur_cible_kg)} : {pourcentageVise} % du lest
                </p>
                <Reglette
                  libelle={`Progression vers la limite visée de ${lest(objectif.valeur_cible_kg)}`}
                  valeur={pourcentageVise}
                  min={0}
                  max={100}
                  pas={5}
                  texte={`${pourcentageVise} % du lest visé`}
                />
                {a.dernier && (
                  <p className={styles.phrase}>
                    {phraseLimiteVisee(a.dernier.valeur, objectif.valeur_cible_kg)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className={styles.caracteristique}>
            {reference && exercice ? (
              <CourbeCaracteristique
                exercice={exercice}
                e1rmTotal={reference.e1rmTotal}
                e1rmLest={reference.e1rmLest}
                series={[]}
                limiteVisee={
                  objectif
                    ? {
                        charge: reference.poidsDuCorps + objectif.valeur_cible_kg,
                        lest: objectif.valeur_cible_kg,
                      }
                    : null
                }
                nomTrace="analyse-courbe"
              />
            ) : (
              a.evolution.etat === 'pret' && (
                <p className={`${styles.reserve} ${styles.vide}`}>
                  La courbe caractéristique demande un RPE sur au moins une série et une pesée.
                </p>
              )
            )}
          </div>
        </div>

        <div className={styles.corps}>
          <ul className={`${styles.reserve} ${styles.rail}`} aria-label="Grandeurs">
            {a.parMetrique.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={m.id === a.metrique}
                  onClick={() => a.choisirMetrique(m.id)}
                >
                  <span className={styles.nomMetrique}>{m.libelle}</span>
                  <Etincelle valeurs={m.points.map((p) => p.valeur)} />
                  <span className={styles.derniere}>
                    {m.points.length > 0 ? nombre(m.points.at(-1)?.valeur ?? 0) : '—'}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.planche}>
            {a.evolution.etat === 'erreur' && (
              <p className={`${styles.reserve} ${styles.etat}`} role="alert">
                {a.evolution.message}
              </p>
            )}
            {a.evolution.etat === 'pret' && points.length === 0 && (
              <p className={`${styles.reserve} ${styles.vide}`}>
                Pas encore de données pour ce choix. Le 1RM demande un RPE sur au moins une série et une
                pesée.
              </p>
            )}
            {points.length > 0 && (
              <GraphiqueSerie
                key={`${a.exerciceId}-${a.metrique}-${a.periode}`}
                points={points}
                unite={definition.unite}
                libelle={definition.libelle}
                barres={a.metrique === 'tonnage_kg'}
                rpeParDate={a.metrique === 'tonnage_kg' ? rpeParDate : undefined}
                nomTrace="analyse-serie"
              />
            )}
          </div>
        </div>
      </section>
    </Feuille>
  )
}
