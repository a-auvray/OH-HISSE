import { type ComponentType, useState } from 'react'
import { Link } from 'react-router'

import type { ObjectifLu } from '../api/types'
import { dateCourte, dateLongue, nombre } from '../commun/format'
import { FormulaireObjectif } from '../espaces/objectifs/EspaceObjectifs'
import { echeance, useObjectifs } from '../espaces/objectifs/useObjectifs'

/** Les classes que la mise en page attend : chaque thème fournit une feuille de style qui les définit. */
export type StylesObjectifs = Readonly<Record<string, string | undefined>>

/** La progression d'un objectif telle que le thème la dessine (câbles, éprouvette…). */
export type ProgressionObjectif = ComponentType<{ objectif: ObjectifLu; grande?: boolean }>

/**
 * Les objectifs pour un thème qui les dessine par sa feuille de style et sa
 * progression : le principal en grand avec sa fiche, les autres à côté, et le
 * formulaire pour en créer. Mêmes données et mêmes gestes dans tous les thèmes.
 */
export function ObjectifsThemee({
  styles,
  Progression,
}: {
  styles: StylesObjectifs
  Progression: ProgressionObjectif
}) {
  const {
    objectifs,
    exercices,
    liste,
    principal,
    autres,
    recharger,
    changerStatut,
    mettreEnAvant,
    supprimer,
  } = useObjectifs()
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)

  return (
    <div className={styles.page}>
      <div className={styles.barre}>
        <p>Un cap structure les blocs qui y mènent ; sa progression suit ton 1RM estimé.</p>
        <button type="button" className={styles.bouton} onClick={() => setFormulaireOuvert((v) => !v)}>
          {formulaireOuvert ? 'Fermer' : '+ Nouvel objectif'}
        </button>
      </div>

      {formulaireOuvert && exercices.etat === 'pret' && (
        <div className={styles.formulaire}>
          <FormulaireObjectif
            exercices={exercices.valeur}
            premier={liste.length === 0}
            apresCreation={() => {
              setFormulaireOuvert(false)
              recharger()
            }}
          />
        </div>
      )}

      {objectifs.etat === 'erreur' && <p className={styles.erreur}>{objectifs.message}</p>}

      {objectifs.etat === 'pret' && !principal && !formulaireOuvert && (
        <section className={styles.vide}>
          <h2>Fixe un cap.</h2>
          <p>
            Un max, une compétition : l’objectif structure les blocs qui y mènent, et sa progression se
            calcule à partir de ton 1RM estimé.
          </p>
          <button type="button" className={styles.plein} onClick={() => setFormulaireOuvert(true)}>
            Créer mon premier objectif
          </button>
        </section>
      )}

      <div className={styles.mats}>
        {principal && (
          <section className={styles.principal} key={principal.id} aria-label="Objectif principal">
            <div className={styles.progression}>
              <Progression objectif={principal} grande />
            </div>
            <div className={styles.fiche}>
              <p className={styles.etiquette}>
                Objectif principal · {principal.type === 'competition' ? 'compétition' : 'max'}
              </p>
              <h2 className={styles.titre}>{principal.titre}</h2>
              <dl className={styles.faits}>
                <div>
                  <dt>Mouvement</dt>
                  <dd>{principal.exercice}</dd>
                </div>
                <div>
                  <dt>Cible</dt>
                  <dd>+{nombre(principal.valeur_cible_kg)} kg de lest</dd>
                </div>
                <div>
                  <dt>Échéance</dt>
                  <dd>
                    {dateLongue(principal.date_cible)} · <strong>{echeance(principal.jours_restants)}</strong>
                  </dd>
                </div>
                <div>
                  <dt>1RM estimé</dt>
                  <dd>
                    {principal.progression
                      ? `+${nombre(principal.progression.e1rm_lest_kg)} kg (le ${dateCourte(principal.progression.le)})`
                      : 'pas encore estimé : saisis des séances avec RPE'}
                  </dd>
                </div>
              </dl>
              <div className={styles.blocs}>
                <span className={styles.etiquette}>Blocs</span>
                {principal.blocs.length ? (
                  principal.blocs.map((b) => (
                    <Link key={b.id} to="/streetlifting/blocs" className={styles.puce}>
                      {b.nom}
                    </Link>
                  ))
                ) : (
                  <Link to="/streetlifting/blocs" className={styles.lien}>
                    Rattacher un bloc →
                  </Link>
                )}
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.plein}
                  onClick={() => void changerStatut(principal, 'atteint')}
                >
                  Marquer atteint
                </button>
                <button
                  type="button"
                  className={styles.bouton}
                  onClick={() => void changerStatut(principal, 'abandonne')}
                >
                  Abandonner
                </button>
              </div>
            </div>
          </section>
        )}

        {autres.length > 0 && (
          <section className={styles.autres} aria-label="Autres objectifs">
            {autres.map((o) => (
              <article key={o.id} className={styles.autre}>
                <Progression objectif={o} />
                <h3>{o.titre}</h3>
                <p className={styles.chiffres}>
                  {o.progression ? `+${nombre(o.progression.e1rm_lest_kg)}` : '—'} /{' '}
                  {nombre(o.valeur_cible_kg)} kg · {o.exercice}
                </p>
                <div className={styles.actionsAutre}>
                  {o.statut === 'en_cours' ? (
                    <button type="button" className={styles.bouton} onClick={() => void mettreEnAvant(o)}>
                      Mettre en avant
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.bouton}
                      onClick={() => void changerStatut(o, 'en_cours')}
                    >
                      Reprendre
                    </button>
                  )}
                  <button type="button" className={styles.discret} onClick={() => void supprimer(o)}>
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
