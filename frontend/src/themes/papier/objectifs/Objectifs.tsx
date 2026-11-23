import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'

import { dateCourte, dateLongue, nombre } from '../../../commun/format'
import { echeance, useObjectifs } from '../../../espaces/objectifs/useObjectifs'
import { Drisse } from './Drisse'
import { FormulaireObjectif } from './FormulaireObjectif'
import styles from './Objectifs.module.css'

const EXPO = [0.16, 1, 0.3, 1] as const

/**
 * Les objectifs, version Papier : chacun est une drisse qu'on hisse vers sa
 * cible. Le principal est grand, avec sa fiche ; les autres alignés à côté.
 */
export function ObjectifsPapier() {
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

      <AnimatePresence>
        {formulaireOuvert && exercices.etat === 'pret' && (
          <FormulaireObjectif
            exercices={exercices.valeur}
            premier={liste.length === 0}
            apresCreation={() => {
              setFormulaireOuvert(false)
              recharger()
            }}
          />
        )}
      </AnimatePresence>

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
          <motion.section
            className={styles.principal}
            key={principal.id}
            aria-label="Objectif principal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EXPO }}
          >
            <div className={styles.drisse}>
              <Drisse objectif={principal} grande rang={0} />
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
          </motion.section>
        )}

        {autres.length > 0 && (
          <section className={styles.autres} aria-label="Autres objectifs">
            {autres.map((o, i) => (
              <motion.article
                key={o.id}
                className={styles.autre}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: EXPO }}
              >
                <Drisse objectif={o} rang={i + 1} />
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
              </motion.article>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
