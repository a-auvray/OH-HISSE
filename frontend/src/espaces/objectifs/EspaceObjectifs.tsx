import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'

import type { Exercice, ObjectifEcrit } from '../../api/types'
import { dateCourte, dateLongue, nombre } from '../../commun/format'
import { Vue } from '../../variantes/Vue'
import { BoutonRetour } from '../BoutonRetour'
import styles from './EspaceObjectifs.module.css'
import { Jauge } from './Jauge'
import { creerObjectif, echeance, STATUTS, useObjectifs } from './useObjectifs'

/** Espace Objectifs : un cap qui structure les blocs (note 06). */
export function EspaceObjectifs() {
  return (
    <main className={styles.espace} data-espace="objectifs">
      <div className={styles.cible} aria-hidden="true" />
      <BoutonRetour espace="objectifs" />
      <Vue espace="objectifs" nom="Objectifs" parDefaut={Objectifs} />
    </main>
  )
}

/**
 * Le contenu de la page, sans son enveloppe (fond, retour à l'accueil) : un fragment,
 * à poser dans la grille d'un thème. Classique et les autres thèmes l'utilisent.
 */
export function Objectifs() {
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
    <>
      <header className={styles.entete}>
        <p className={styles.marque}>Objectifs</p>
        <button type="button" className={styles.bouton} onClick={() => setFormulaireOuvert((v) => !v)}>
          {formulaireOuvert ? 'Fermer' : '+ Nouvel objectif'}
        </button>
      </header>

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
          <h1>Fixe un cap.</h1>
          <p>
            Un max, une compétition : l’objectif structure les blocs qui y mènent, et sa progression se
            calcule à partir de ton 1RM estimé.
          </p>
          <button type="button" className={styles.principal} onClick={() => setFormulaireOuvert(true)}>
            Créer mon premier objectif
          </button>
        </section>
      )}

      {principal && (
        <motion.section
          className={styles.heros}
          key={principal.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Jauge
            pourcentage={principal.progression?.pourcentage ?? 0}
            valeur={principal.progression ? `+${nombre(principal.progression.e1rm_lest_kg)}` : '—'}
            cible={`${nombre(principal.valeur_cible_kg)} kg`}
            atteinte={principal.progression?.cible_atteinte ?? false}
          />
          <div className={styles.fiche}>
            <p className={styles.etiquette}>
              Objectif principal · {principal.type === 'competition' ? 'compétition' : 'max'}
            </p>
            <h1 className={styles.titre}>{principal.titre}</h1>
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
                className={styles.principal}
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
              className={styles.carte}
              data-statut={o.statut}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
            >
              <div className={styles.enteteCarte}>
                <span className={styles.statut}>{STATUTS[o.statut]}</span>
                <span>{echeance(o.jours_restants)}</span>
              </div>
              <h2>{o.titre}</h2>
              <div className={styles.barre}>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: (o.progression?.pourcentage ?? 0) / 100 }}
                  transition={{ duration: 1, delay: 0.4 + i * 0.06 }}
                />
              </div>
              <p className={styles.chiffres}>
                {o.progression ? `+${nombre(o.progression.e1rm_lest_kg)}` : '—'} / {nombre(o.valeur_cible_kg)}{' '}
                kg · {o.exercice}
              </p>
              <div className={styles.actionsCarte}>
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
    </>
  )
}

interface PropsFormulaire {
  exercices: Exercice[]
  premier: boolean
  apresCreation: () => void
}

export function FormulaireObjectif({ exercices, premier, apresCreation }: PropsFormulaire) {
  const [valeurs, setValeurs] = useState<ObjectifEcrit>({
    titre: '',
    type: 'max',
    exercice_id: exercices[0]?.id ?? 1,
    valeur_cible_kg: 0,
    date_cible: '',
    principal: premier,
  })
  const [cible, setCible] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  async function creer(evenement: FormEvent) {
    evenement.preventDefault()
    const message = await creerObjectif(valeurs, cible)
    if (message) setErreur(message)
    else apresCreation()
  }

  const champ = <K extends keyof ObjectifEcrit>(cle: K, valeur: ObjectifEcrit[K]) =>
    setValeurs((v) => ({ ...v, [cle]: valeur }))

  return (
    <motion.form
      className={styles.formulaire}
      onSubmit={creer}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <label className={styles.large}>
        <span>Intitulé</span>
        <input
          required
          placeholder="55 kg de lest aux tractions"
          value={valeurs.titre}
          onChange={(e) => champ('titre', e.target.value)}
        />
      </label>
      <label>
        <span>Mouvement</span>
        <select value={valeurs.exercice_id} onChange={(e) => champ('exercice_id', Number(e.target.value))}>
          {exercices.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Type</span>
        <select value={valeurs.type} onChange={(e) => champ('type', e.target.value as ObjectifEcrit['type'])}>
          <option value="max">Max</option>
          <option value="competition">Compétition</option>
        </select>
      </label>
      <label>
        <span>Cible (kg de lest)</span>
        <input
          required
          inputMode="decimal"
          placeholder="55"
          value={cible}
          onChange={(e) => setCible(e.target.value)}
        />
      </label>
      <label>
        <span>Date cible</span>
        <input
          required
          type="date"
          value={valeurs.date_cible}
          onChange={(e) => champ('date_cible', e.target.value)}
        />
      </label>
      <label className={styles.case}>
        <input
          type="checkbox"
          checked={valeurs.principal ?? false}
          onChange={(e) => champ('principal', e.target.checked)}
        />
        <span>Objectif principal (affiché sur l’accueil)</span>
      </label>
      {erreur && (
        <p className={styles.erreur} role="alert">
          {erreur}
        </p>
      )}
      <button type="submit" className={styles.principal}>
        Fixer cet objectif
      </button>
    </motion.form>
  )
}
