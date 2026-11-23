import { dateCourte, nombre } from '../../commun/format'
import { useLargeur } from '../../commun/useLargeur'
import styles from './Analyse.module.css'
import { Courbe } from './Courbe'
import { METRIQUES, PERIODES } from './metriques'
import ui from './ui.module.css'
import { useAnalyse } from './useAnalyse'

/** Graphiques d'évolution par exercice (note 03). */
export function Analyse() {
  const {
    exercices,
    exerciceId,
    choisirExercice,
    metrique,
    choisirMetrique,
    periode,
    choisirPeriode,
    evolution,
    definition,
    points,
    premier,
    dernier,
    meilleur,
  } = useAnalyse()
  const [cadre, largeur] = useLargeur<HTMLDivElement>()

  return (
    <section className={styles.analyse}>
      <div className={styles.filtres}>
        <Segments
          libelle="Exercice"
          options={
            exercices.etat === 'pret' ? exercices.valeur.map((e) => ({ id: e.id, libelle: e.nom })) : []
          }
          valeur={exerciceId}
          choisir={choisirExercice}
        />
        <Segments
          libelle="Métrique"
          options={METRIQUES.map((m) => ({ id: m.id, libelle: m.libelle }))}
          valeur={metrique}
          choisir={choisirMetrique}
        />
        <Segments
          libelle="Période"
          options={PERIODES.map((p) => ({ id: p.id, libelle: p.libelle }))}
          valeur={periode}
          choisir={choisirPeriode}
        />
      </div>

      <div className={styles.tuiles}>
        <Tuile
          titre="1RM actuel"
          valeur={dernier ? `+${nombre(dernier.valeur)}` : '—'}
          detail={dernier ? `le ${dateCourte(dernier.date)}` : 'pas encore estimé'}
        />
        <Tuile
          titre="Meilleur"
          valeur={meilleur ? `+${nombre(meilleur.valeur)}` : '—'}
          detail={meilleur ? `le ${dateCourte(meilleur.date)}` : ''}
        />
        <Tuile
          titre="Progression"
          valeur={
            premier && dernier
              ? `${dernier.valeur >= premier.valeur ? '+' : ''}${nombre(dernier.valeur - premier.valeur)}`
              : '—'
          }
          detail={premier ? `depuis le ${dateCourte(premier.date)}` : ''}
        />
      </div>

      <div className={`${ui.carte} ${styles.graphique}`}>
        <p className={ui.etiquette}>
          {definition.libelle} · {definition.unite}
        </p>
        {evolution.etat === 'erreur' && <p className={ui.erreur}>{evolution.message}</p>}
        {evolution.etat === 'pret' && points.length === 0 && (
          <p className={styles.vide}>
            Pas encore de données pour ce choix. Le 1RM demande un RPE sur au moins une série et une pesée.
          </p>
        )}
        <div ref={cadre}>
          {points.length > 0 && largeur > 0 && (
            <Courbe
              key={`${exerciceId}-${metrique}-${periode}`}
              points={points}
              largeur={largeur}
              hauteur={380}
              unite={definition.unite}
            />
          )}
        </div>
      </div>
    </section>
  )
}

function Tuile({ titre, valeur, detail }: { titre: string; valeur: string; detail: string }) {
  return (
    <div className={`${ui.carte} ${styles.tuile}`}>
      <span className={ui.etiquette}>{titre}</span>
      <span className={ui.chiffre}>
        {valeur}
        {valeur !== '—' && <small> kg</small>}
      </span>
      <span className={styles.detail}>{detail}</span>
    </div>
  )
}

interface PropsSegments<T extends string | number> {
  libelle: string
  options: { id: T; libelle: string }[]
  valeur: T | null
  choisir: (valeur: T) => void
}

function Segments<T extends string | number>({ libelle, options, valeur, choisir }: PropsSegments<T>) {
  return (
    <div className={styles.segments} role="radiogroup" aria-label={libelle}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === valeur}
          onClick={() => choisir(o.id)}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  )
}
