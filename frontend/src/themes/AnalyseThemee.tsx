import { dateCourte, nombre } from '../commun/format'
import { useLargeur } from '../commun/useLargeur'
import { Courbe } from '../espaces/streetlifting/Courbe'
import { PERIODES } from '../espaces/streetlifting/metriques'
import { useAnalyse } from '../espaces/streetlifting/useAnalyse'
import { Etincelle } from './Etincelle'

/** Les classes que la mise en page attend : chaque thème fournit une feuille de style qui les définit. */
export type StylesAnalyse = Readonly<Record<string, string | undefined>>

/**
 * L'analyse d'un thème qui la dessine par sa feuille de style : trois chiffres, le
 * rail des grandeurs à côté, une grande courbe. La structure est commune, le
 * thème ne choisit que la forme (traits, plaques, couleurs, polices).
 */
export function AnalyseThemee({ styles }: { styles: StylesAnalyse }) {
  const a = useAnalyse()
  const [cadre, largeur] = useLargeur<HTMLDivElement>()
  const { definition, points } = a
  const progression = a.premier && a.dernier ? a.dernier.valeur - a.premier.valeur : null

  return (
    <section className={styles.page}>
      <header className={styles.filtres}>
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

      <dl className={styles.chiffres}>
        <div>
          <dt>1RM actuel</dt>
          <dd>{a.dernier ? `+${nombre(a.dernier.valeur)} kg` : '—'}</dd>
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
          <dd>{progression === null ? '—' : `${progression >= 0 ? '+' : ''}${nombre(progression)} kg`}</dd>
          <dd className={styles.detail}>{a.premier ? `depuis le ${dateCourte(a.premier.date)}` : ''}</dd>
        </div>
      </dl>

      <div className={styles.corps}>
        <ul className={styles.rail} aria-label="Grandeurs">
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

        <figure className={styles.planche}>
          <figcaption>
            {definition.libelle} · {definition.unite}
          </figcaption>
          {a.evolution.etat === 'erreur' && <p className={styles.vide}>{a.evolution.message}</p>}
          {a.evolution.etat === 'pret' && points.length === 0 && (
            <p className={styles.vide}>
              Pas encore de données pour ce choix. Le 1RM demande un RPE sur au moins une série et une pesée.
            </p>
          )}
          <div ref={cadre}>
            {points.length > 0 && largeur > 0 && (
              <Courbe
                key={`${a.exerciceId}-${a.metrique}-${a.periode}`}
                points={points}
                largeur={largeur}
                hauteur={380}
                unite={definition.unite}
              />
            )}
          </div>
        </figure>
      </div>
    </section>
  )
}
