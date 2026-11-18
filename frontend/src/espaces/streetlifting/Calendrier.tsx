import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { api } from '../../api/client'
import { type Exercice, messageErreur, type SeanceLue } from '../../api/types'
import { aujourdhui, couleurRessenti, dateLongue, kg, lest, nombre } from '../../commun/format'
import { exiger, useDonnees } from '../../commun/useDonnees'
import { blocDuJour, grilleDuMois, type PeriodeBloc, TYPES_BLOC } from './chronologie'
import styles from './Calendrier.module.css'
import ui from './ui.module.css'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/** Historique des séances, mois par mois, sur fond de blocs (note 03). */
export function Calendrier() {
  const [{ annee, mois }, setMois] = useState(() => {
    const d = new Date()
    return { annee: d.getFullYear(), mois: d.getMonth() }
  })
  const [filtre, setFiltre] = useState<number | null>(null)
  const [ouverte, setOuverte] = useState<SeanceLue | null>(null)

  const grille = grilleDuMois(annee, mois)
  const debut = grille[0]?.[0] ?? ''
  const fin = grille.at(-1)?.at(-1) ?? ''
  const jour = aujourdhui()

  const [seances] = useDonnees(
    async () =>
      exiger(await api.GET('/api/streetlifting/seances', { params: { query: { debut, fin } } }), (e) =>
        messageErreur(e),
      ),
    [debut, fin],
  )
  const [blocs] = useDonnees(
    async () => exiger(await api.GET('/api/streetlifting/blocs'), (e) => messageErreur(e)),
    [],
  )
  const [exercices] = useDonnees(
    async () => exiger(await api.GET('/api/streetlifting/exercices'), (e) => messageErreur(e)),
    [],
  )

  const deplacer = (delta: number) => {
    const d = new Date(annee, mois + delta, 1)
    setMois({ annee: d.getFullYear(), mois: d.getMonth() })
  }

  const listeBlocs: PeriodeBloc[] = blocs.etat === 'pret' ? blocs.valeur : []
  const listeExercices: Exercice[] = exercices.etat === 'pret' ? exercices.valeur : []
  const parJour = new Map<string, SeanceLue[]>()
  if (seances.etat === 'pret') {
    for (const s of seances.valeur) {
      if (filtre !== null && !s.series.some((x) => x.exercice_id === filtre)) continue
      parJour.set(s.date, [...(parJour.get(s.date) ?? []), s])
    }
  }

  return (
    <section className={styles.calendrier}>
      <header className={styles.entete}>
        <h1 className={`${ui.titre} ${styles.mois}`}>{MOIS.format(new Date(annee, mois, 1))}</h1>
        <div className={styles.commandes}>
          <button
            type="button"
            className={ui.bouton}
            onClick={() => deplacer(-1)}
            aria-label="Mois précédent"
          >
            ←
          </button>
          <button
            type="button"
            className={ui.bouton}
            onClick={() => setMois({ annee: new Date().getFullYear(), mois: new Date().getMonth() })}
          >
            Aujourd’hui
          </button>
          <button type="button" className={ui.bouton} onClick={() => deplacer(1)} aria-label="Mois suivant">
            →
          </button>
          <select
            className={ui.champ}
            aria-label="Filtrer par exercice"
            value={filtre ?? ''}
            onChange={(e) => setFiltre(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Tous les exercices</option>
            {listeExercices.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        </div>
      </header>

      {seances.etat === 'erreur' && <p className={ui.erreur}>{seances.message}</p>}

      <div className={styles.grille} role="grid" aria-label="Séances du mois">
        {JOURS.map((j) => (
          <div key={j} className={styles.jourSemaine} role="columnheader">
            {j}
          </div>
        ))}
        {grille.flat().map((iso) => {
          const bloc = blocDuJour(listeBlocs, iso, jour)
          const duMois = Number(iso.slice(5, 7)) === mois + 1
          return (
            <div
              key={iso}
              role="gridcell"
              className={styles.case}
              data-hors-mois={!duMois || undefined}
              data-aujourdhui={iso === jour || undefined}
              data-bloc={bloc?.type}
              title={bloc ? `${TYPES_BLOC[bloc.type]} — ${bloc.nom}` : undefined}
            >
              <span className={styles.numero}>{Number(iso.slice(8))}</span>
              {(parJour.get(iso) ?? []).map((s) => (
                <button key={s.id} type="button" className={styles.seance} onClick={() => setOuverte(s)}>
                  <span
                    className={styles.pastille}
                    data-couleur={s.ressenti ? couleurRessenti(s.ressenti) : undefined}
                    aria-label={s.ressenti ? `Ressenti ${s.ressenti} sur 10` : 'Ressenti non noté'}
                  />
                  <span className={styles.nomSeance}>{s.nom ?? 'Séance'}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>

      <ul className={styles.legende} aria-label="Légende des blocs">
        {Object.entries(TYPES_BLOC).map(([type, libelle]) => (
          <li key={type} data-bloc={type}>
            {libelle}
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {ouverte && <Detail seance={ouverte} exercices={listeExercices} fermer={() => setOuverte(null)} />}
      </AnimatePresence>
    </section>
  )
}

/** Panneau latéral : la séance réalisée, série par série. */
function Detail({
  seance,
  exercices,
  fermer,
}: {
  seance: SeanceLue
  exercices: Exercice[]
  fermer: () => void
}) {
  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && fermer()
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [fermer])

  const nom = (id: number) => exercices.find((e) => e.id === id)?.nom ?? '?'
  const groupes: { exercice_id: number; series: SeanceLue['series'] }[] = []
  for (const s of seance.series) {
    const dernier = groupes.at(-1)
    if (dernier?.exercice_id === s.exercice_id) dernier.series.push(s)
    else groupes.push({ exercice_id: s.exercice_id, series: [s] })
  }

  return (
    <>
      <motion.div
        className={styles.voile}
        onClick={fermer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.aside
        className={`${ui.carte} ${styles.detail}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Séance du ${dateLongue(seance.date)}`}
        initial={{ x: '105%' }}
        animate={{ x: 0 }}
        exit={{ x: '105%' }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className={ui.etiquette}>{dateLongue(seance.date)}</p>
        <h2 className={ui.titre}>{seance.nom ?? 'Séance'}</h2>
        <p className={styles.meta}>
          {seance.ressenti && (
            <span className={styles.ressenti} data-couleur={couleurRessenti(seance.ressenti)}>
              Ressenti {seance.ressenti}/10
            </span>
          )}
          {seance.poids_du_corps_kg && <span>Poids du corps {kg(seance.poids_du_corps_kg, 1)}</span>}
        </p>

        {seance.records.length > 0 && (
          <ul className={styles.records}>
            {seance.records.map((r) => (
              <li key={r.exercice_id}>
                <span className={ui.etiquette}>1RM · {nom(r.exercice_id)}</span>
                <span className={ui.chiffre}>+{nombre(r.e1rm_lest_kg)}</span>
              </li>
            ))}
          </ul>
        )}

        {groupes.map((g, i) => (
          <div key={i} className={styles.groupe}>
            <h3>{nom(g.exercice_id)}</h3>
            <ol>
              {g.series.map((s) => (
                <li key={s.id} data-echec={s.echec || undefined}>
                  <span>
                    {s.reps} × {lest(s.lest_kg ?? 0)}
                  </span>
                  <span>{s.rpe ? `RPE ${nombre(s.rpe)}` : '—'}</span>
                  {s.echec && <span className={styles.echec}>échec</span>}
                  {s.reps_prevues !== null && s.reps_prevues !== undefined && (
                    <span className={styles.prevu}>
                      prévu {s.reps_prevues} × {s.lest_prevu_kg === null ? '?' : lest(s.lest_prevu_kg ?? 0)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}

        {seance.note && <p className={styles.note}>« {seance.note} »</p>}

        <div className={styles.actions}>
          <Link className={ui.principal} to={`/streetlifting/saisie/${seance.id}`}>
            Modifier
          </Link>
          <button type="button" className={ui.bouton} onClick={fermer}>
            Fermer
          </button>
        </div>
      </motion.aside>
    </>
  )
}
