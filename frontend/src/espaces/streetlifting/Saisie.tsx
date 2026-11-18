import { motion } from 'motion/react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { api } from '../../api/client'
import { type Exercice, messageErreur, type SeanceDuJour, type SeanceLue } from '../../api/types'
import { couleurRessenti, dateLongue, kg, lest as formatLest, nombre } from '../../commun/format'
import { exiger, useDonnees } from '../../commun/useDonnees'
import {
  depuisSeance,
  depuisSeanceDuJour,
  type Formulaire,
  formulaireVierge,
  type Groupe,
  type LigneSerie,
  ligneVide,
  nouvelleCle,
  RPE_POSSIBLES,
  versEcriture,
} from './formulaire'
import styles from './Saisie.module.css'
import ui from './ui.module.css'

async function chargerExercices(): Promise<Exercice[]> {
  return exiger(await api.GET('/api/streetlifting/exercices'), (e) => messageErreur(e))
}

/** Saisie (ou modification) d'une séance : séries, ressenti, récapitulatif avant validation. */
export function Saisie() {
  const { id } = useParams()
  const etatNavigation = useLocation().state as { seanceDuJour?: SeanceDuJour } | null
  const naviguer = useNavigate()
  const [exercices] = useDonnees(chargerExercices, [])
  const [formulaire, setFormulaire] = useState<Formulaire | null>(() =>
    etatNavigation?.seanceDuJour ? depuisSeanceDuJour(etatNavigation.seanceDuJour) : null,
  )
  const [problemes, setProblemes] = useState<string[]>([])
  const [enCours, setEnCours] = useState(false)
  const [bilan, setBilan] = useState<SeanceLue | null>(null)
  const [confirmerSuppression, setConfirmerSuppression] = useState(false)

  // Modification : on charge la séance enregistrée.
  useEffect(() => {
    if (!id) return
    let actif = true
    api
      .GET('/api/streetlifting/seances/{seance_id}', { params: { path: { seance_id: Number(id) } } })
      .then(({ data, error }) => {
        if (!actif) return
        if (data) setFormulaire(depuisSeance(data))
        else setProblemes([messageErreur(error, 'Séance introuvable.')])
      })
    return () => {
      actif = false
    }
  }, [id])

  // Séance libre : un premier exercice dès que la liste est connue.
  const premier = exercices.etat === 'pret' ? exercices.valeur[0] : undefined
  if (!formulaire && !id && premier) setFormulaire(formulaireVierge(premier.id))

  if (bilan) return <Bilan seance={bilan} exercices={exercices.etat === 'pret' ? exercices.valeur : []} />
  if (exercices.etat === 'erreur') return <p className={ui.erreur}>{exercices.message}</p>
  if (!formulaire || exercices.etat !== 'pret') {
    return problemes.length ? (
      <p className={ui.erreur}>{problemes[0]}</p>
    ) : (
      <p className={ui.etiquette}>Chargement…</p>
    )
  }

  const liste = exercices.valeur
  const nomExercice = (exerciceId: number) => liste.find((e) => e.id === exerciceId)?.nom ?? '?'

  // --- Mises à jour immuables du formulaire ---
  const changer = (modif: Partial<Formulaire>) => setFormulaire({ ...formulaire, ...modif })
  const changerGroupe = (cle: string, modif: (g: Groupe) => Groupe) =>
    changer({ groupes: formulaire.groupes.map((g) => (g.cle === cle ? modif(g) : g)) })
  const changerLigne = (groupe: string, ligne: string, modif: Partial<LigneSerie>) =>
    changerGroupe(groupe, (g) => ({
      ...g,
      series: g.series.map((s) => (s.cle === ligne ? { ...s, ...modif } : s)),
    }))

  const totalSeries = formulaire.groupes.reduce((n, g) => n + g.series.length, 0)
  const totalReps = formulaire.groupes.reduce(
    (n, g) => n + g.series.reduce((m, s) => m + (Number(s.reps) || 0), 0),
    0,
  )

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault()
    if (!formulaire) return
    const corps = versEcriture(formulaire)
    if (Array.isArray(corps)) {
      setProblemes(corps)
      return
    }
    setEnCours(true)
    const reponse = id
      ? await api.PUT('/api/streetlifting/seances/{seance_id}', {
          params: { path: { seance_id: Number(id) } },
          body: corps,
        })
      : await api.POST('/api/streetlifting/seances', { body: corps })
    setEnCours(false)
    if (reponse.data) setBilan(reponse.data)
    else setProblemes([messageErreur(reponse.error, 'Enregistrement impossible.')])
  }

  async function supprimer() {
    if (!id) return
    await api.DELETE('/api/streetlifting/seances/{seance_id}', {
      params: { path: { seance_id: Number(id) } },
    })
    naviguer('/streetlifting/calendrier')
  }

  return (
    <form className={styles.saisie} onSubmit={enregistrer} noValidate>
      <div className={styles.groupes}>
        <h1 className={`${ui.titre} ${styles.titre}`}>
          {id ? 'Modifier la séance' : formulaire.nom || 'Nouvelle séance'}
        </h1>

        {formulaire.groupes.map((groupe, g) => {
          const prevu = groupe.series.find((s) => s.prevu)?.prevu
          return (
            <motion.fieldset
              key={groupe.cle}
              className={`${ui.carte} ${styles.groupe}`}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <legend className="sr-only">Exercice {g + 1}</legend>
              <div className={styles.enteteGroupe}>
                <select
                  className={`${ui.champ} ${styles.exercice}`}
                  aria-label={`Exercice ${g + 1}`}
                  value={groupe.exercice_id}
                  onChange={(e) =>
                    changerGroupe(groupe.cle, (gr) => ({ ...gr, exercice_id: Number(e.target.value) }))
                  }
                >
                  {liste.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                    </option>
                  ))}
                </select>
                {prevu && (
                  <p className={styles.prevu}>
                    Prévu : {groupe.series.length} × {prevu.reps} · RPE {nombre(prevu.rpe)} ·{' '}
                    {prevu.lest === null ? 'charge à choisir' : formatLest(prevu.lest)}
                  </p>
                )}
                <button
                  type="button"
                  className={ui.discret}
                  onClick={() => changer({ groupes: formulaire.groupes.filter((x) => x.cle !== groupe.cle) })}
                  disabled={formulaire.groupes.length === 1}
                >
                  Retirer
                </button>
              </div>

              <table className={styles.series}>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Reps</th>
                    <th scope="col">Lest (kg)</th>
                    <th scope="col">RPE</th>
                    <th scope="col">Échec</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupe.series.map((ligne, i) => (
                    <tr key={ligne.cle} data-echec={ligne.echec || undefined}>
                      <td className={styles.numero}>{i + 1}</td>
                      <td>
                        <input
                          className={ui.champ}
                          inputMode="numeric"
                          aria-label={`Répétitions, série ${i + 1}`}
                          value={ligne.reps}
                          onChange={(e) => changerLigne(groupe.cle, ligne.cle, { reps: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className={ui.champ}
                          inputMode="decimal"
                          aria-label={`Lest, série ${i + 1}`}
                          placeholder="0"
                          value={ligne.lest}
                          onChange={(e) => changerLigne(groupe.cle, ligne.cle, { lest: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className={ui.champ}
                          aria-label={`RPE, série ${i + 1}`}
                          value={ligne.rpe}
                          onChange={(e) => changerLigne(groupe.cle, ligne.cle, { rpe: e.target.value })}
                        >
                          <option value="">—</option>
                          {RPE_POSSIBLES.map((r) => (
                            <option key={r} value={r}>
                              {nombre(r)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className={styles.echec}
                          aria-label={`Échec, série ${i + 1}`}
                          checked={ligne.echec}
                          onChange={(e) => changerLigne(groupe.cle, ligne.cle, { echec: e.target.checked })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={ui.discret}
                          aria-label={`Supprimer la série ${i + 1}`}
                          disabled={groupe.series.length === 1}
                          onClick={() =>
                            changerGroupe(groupe.cle, (gr) => ({
                              ...gr,
                              series: gr.series.filter((s) => s.cle !== ligne.cle),
                            }))
                          }
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                className={ui.bouton}
                onClick={() =>
                  changerGroupe(groupe.cle, (gr) => ({
                    ...gr,
                    series: [...gr.series, ligneVide(gr.series.at(-1))],
                  }))
                }
              >
                + Série
              </button>
            </motion.fieldset>
          )
        })}

        <button
          type="button"
          className={`${ui.bouton} ${styles.ajouterExercice}`}
          onClick={() =>
            changer({
              groupes: [
                ...formulaire.groupes,
                { cle: nouvelleCle(), exercice_id: liste[0]?.id ?? 1, series: [ligneVide()] },
              ],
            })
          }
        >
          + Ajouter un exercice
        </button>
      </div>

      <aside className={`${ui.carte} ${styles.recap}`} aria-label="Récapitulatif">
        <p className={ui.etiquette}>Récapitulatif</p>

        <label className={styles.champRecap}>
          <span>Date</span>
          <input
            className={ui.champ}
            type="date"
            value={formulaire.date}
            onChange={(e) => changer({ date: e.target.value })}
          />
        </label>
        <label className={styles.champRecap}>
          <span>Nom</span>
          <input
            className={ui.champ}
            placeholder="Séance libre"
            value={formulaire.nom}
            onChange={(e) => changer({ nom: e.target.value })}
          />
        </label>

        <fieldset className={styles.ressenti}>
          <legend>Ressenti global</legend>
          <div className={styles.notes}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((note) => (
              <button
                key={note}
                type="button"
                data-couleur={couleurRessenti(note)}
                aria-pressed={formulaire.ressenti === note}
                onClick={() => changer({ ressenti: formulaire.ressenti === note ? null : note })}
              >
                {note}
              </button>
            ))}
          </div>
        </fieldset>

        <label className={styles.champRecap}>
          <span>Note</span>
          <textarea
            className={ui.champ}
            rows={3}
            value={formulaire.note}
            onChange={(e) => changer({ note: e.target.value })}
          />
        </label>

        <dl className={styles.totaux}>
          <div>
            <dt>Exercices</dt>
            <dd>{formulaire.groupes.length}</dd>
          </div>
          <div>
            <dt>Séries</dt>
            <dd>{totalSeries}</dd>
          </div>
          <div>
            <dt>Reps</dt>
            <dd>{totalReps}</dd>
          </div>
        </dl>
        <ul className={styles.resume}>
          {formulaire.groupes.map((g) => (
            <li key={g.cle}>
              {nomExercice(g.exercice_id)} · {g.series.length} série{g.series.length > 1 ? 's' : ''}
            </li>
          ))}
        </ul>

        {problemes.length > 0 && (
          <div className={ui.erreur} role="alert">
            {problemes.join('\n')}
          </div>
        )}

        <button className={ui.principal} type="submit" disabled={enCours}>
          {enCours ? 'Enregistrement…' : 'Valider la séance'}
        </button>

        {id &&
          (confirmerSuppression ? (
            <button type="button" className={`${ui.bouton} ${ui.danger}`} onClick={() => void supprimer()}>
              Confirmer la suppression
            </button>
          ) : (
            <button type="button" className={ui.discret} onClick={() => setConfirmerSuppression(true)}>
              Supprimer la séance
            </button>
          ))}
      </aside>
    </form>
  )
}

/** Après l'enregistrement : les 1RM estimés de la séance. */
function Bilan({ seance, exercices }: { seance: SeanceLue; exercices: Exercice[] }) {
  return (
    <motion.section
      className={`${ui.carte} ${styles.bilan}`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className={ui.etiquette}>Séance enregistrée · {dateLongue(seance.date)}</p>
      <h2 className={ui.titre}>{seance.nom ?? 'Bien joué'}</h2>
      {seance.records.length > 0 ? (
        <ul className={styles.records}>
          {seance.records.map((r, i) => (
            <motion.li
              key={r.exercice_id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.12 }}
            >
              <span className={ui.etiquette}>
                1RM estimé · {exercices.find((e) => e.id === r.exercice_id)?.nom}
              </span>
              <span className={ui.chiffre}>+{nombre(r.e1rm_lest_kg)}</span>
              <span className={styles.total}>soit {kg(r.e1rm_total_kg, 1)} avec le poids du corps</span>
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className={styles.sansRecord}>
          Aucun 1RM estimé : il faut un RPE sur au moins une série, et une pesée.
        </p>
      )}
      <div className={styles.suite}>
        <Link className={ui.principal} to="/streetlifting">
          Séance suivante
        </Link>
        <Link className={ui.bouton} to="/streetlifting/calendrier">
          Voir le calendrier
        </Link>
      </div>
    </motion.section>
  )
}
