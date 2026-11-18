import { motion } from 'motion/react'
import { type ChangeEvent, useRef, useState } from 'react'

import { api } from '../../api/client'
import { type BlocLu, messageErreur, type ObjectifLu } from '../../api/types'
import { aujourdhui, dateCourte } from '../../commun/format'
import { exiger, useDonnees } from '../../commun/useDonnees'
import styles from './Blocs.module.css'
import { TYPES_BLOC } from './chronologie'
import ui from './ui.module.css'

const EXEMPLE = `{
  "nom": "Force — cap 55 kg",
  "type": "force",
  "cycles": 6,
  "seances": [
    { "nom": "A — Tirage lourd",
      "exercices": [
        { "exercice": "traction", "series": [3, 5], "reps": 3, "rpe_cible": 8 },
        { "exercice": "dips", "series": 4, "reps": 5, "rpe_cible": 7.5 }
      ] }
  ]
}`

/** Les blocs d'entraînement : import d'un fichier JSON, suivi, rattachement à un objectif. */
export function Blocs() {
  const [blocs, rechargerBlocs] = useDonnees(
    async () => exiger(await api.GET('/api/streetlifting/blocs'), (e) => messageErreur(e)),
    [],
  )
  const [objectifs] = useDonnees(
    async () => exiger(await api.GET('/api/objectifs'), (e) => messageErreur(e)),
    [],
  )
  const fichier = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState<string | null>(null)

  async function importer(evenement: ChangeEvent<HTMLInputElement>) {
    const choisi = evenement.target.files?.[0]
    evenement.target.value = '' // permet de réimporter le même fichier après correction
    if (!choisi) return
    setErreur(null)
    setSucces(null)
    let contenu: unknown
    try {
      contenu = JSON.parse(await choisi.text())
    } catch {
      setErreur(`« ${choisi.name} » n’est pas un JSON valide.`)
      return
    }
    const { data, error } = await api.POST('/api/streetlifting/blocs', {
      // Le serveur valide le contenu en détail et renvoie des messages précis.
      body: contenu as never,
    })
    if (!data) {
      setErreur(messageErreur(error, 'Import impossible.'))
      return
    }
    setSucces(`« ${data.nom} » importé : ${data.seances_total} séances.`)
    rechargerBlocs()
  }

  const listeObjectifs: ObjectifLu[] = objectifs.etat === 'pret' ? objectifs.valeur : []

  return (
    <section className={styles.page}>
      <div className={`${ui.carte} ${styles.import}`}>
        <div>
          <h1 className={`${ui.titre} ${styles.titre}`}>Blocs</h1>
          <p className={styles.explication}>
            Un bloc est une suite de séances types, répétée plusieurs fois, sans jour fixe : la séance du jour
            avance à chaque séance réalisée.
          </p>
        </div>
        <div className={styles.actionsImport}>
          <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={importer} />
          <button type="button" className={ui.principal} onClick={() => fichier.current?.click()}>
            Importer un bloc (.json)
          </button>
          <details className={styles.format}>
            <summary>Format attendu</summary>
            <pre>{EXEMPLE}</pre>
            <p>
              <code>series</code> : un nombre, ou une plage <code>[min, max]</code> dans laquelle l’algorithme
              choisit.
              <code>rpe_cible</code> est facultatif. Exercices : <code>traction</code>, <code>dips</code>,{' '}
              <code>muscle-up</code>.
            </p>
          </details>
        </div>
        {erreur && (
          <p className={ui.erreur} role="alert">
            {erreur}
          </p>
        )}
        {succes && (
          <p className={styles.succes} role="status">
            {succes}
          </p>
        )}
      </div>

      {blocs.etat === 'erreur' && <p className={ui.erreur}>{blocs.message}</p>}
      {blocs.etat === 'pret' && blocs.valeur.length === 0 && (
        <p className={styles.aucun}>Aucun bloc pour l’instant.</p>
      )}

      <div className={styles.liste}>
        {blocs.etat === 'pret' &&
          blocs.valeur.map((bloc, i) => (
            <CarteBloc
              key={bloc.id}
              bloc={bloc}
              objectifs={listeObjectifs}
              rang={i}
              apresModification={rechargerBlocs}
            />
          ))}
      </div>
    </section>
  )
}

interface PropsCarte {
  bloc: BlocLu
  objectifs: ObjectifLu[]
  rang: number
  apresModification: () => void
}

function CarteBloc({ bloc, objectifs, rang, apresModification }: PropsCarte) {
  const [confirmer, setConfirmer] = useState(false)
  const chemin = { params: { path: { bloc_id: bloc.id } } }
  const avancement = bloc.seances_total ? bloc.seances_realisees / bloc.seances_total : 0

  async function modifier(corps: { objectif_id?: number; detacher_objectif?: boolean; fin?: string }) {
    await api.PATCH('/api/streetlifting/blocs/{bloc_id}', {
      ...chemin,
      body: { detacher_objectif: false, ...corps },
    })
    apresModification()
  }

  async function supprimer() {
    await api.DELETE('/api/streetlifting/blocs/{bloc_id}', chemin)
    apresModification()
  }

  return (
    <motion.article
      className={`${ui.carte} ${styles.bloc}`}
      data-bloc={bloc.type}
      data-actif={bloc.actif || undefined}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rang * 0.06 }}
    >
      <header className={styles.enteteBloc}>
        <span className={styles.type}>{TYPES_BLOC[bloc.type]}</span>
        {bloc.actif && <span className={styles.enCours}>En cours</span>}
        <span className={styles.periode}>
          {dateCourte(bloc.debut)} → {bloc.fin ? dateCourte(bloc.fin) : '…'}
        </span>
      </header>
      <h2 className={ui.titre}>{bloc.nom}</h2>

      <div className={styles.progression}>
        <div className={styles.barre}>
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: avancement }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <span>
          {bloc.seances_realisees} / {bloc.seances_total} séances · {bloc.cycles} cycle
          {bloc.cycles > 1 ? 's' : ''}
        </span>
      </div>

      <ol className={styles.modeles}>
        {bloc.seances.map((s) => (
          <li key={s.nom}>
            <strong>{s.nom}</strong>
            <span>
              {s.exercices
                .map((e) => {
                  const series = Array.isArray(e.series) ? `${e.series[0]}–${e.series[1]}` : e.series
                  return `${e.exercice} ${series}×${e.reps}`
                })
                .join(' · ')}
            </span>
          </li>
        ))}
      </ol>

      <footer className={styles.piedBloc}>
        <label className={styles.objectif}>
          <span className={ui.etiquette}>Objectif</span>
          <select
            className={ui.champ}
            value={bloc.objectif_id ?? ''}
            onChange={(e) =>
              void modifier(
                e.target.value ? { objectif_id: Number(e.target.value) } : { detacher_objectif: true },
              )
            }
          >
            <option value="">Aucun</option>
            {objectifs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.titre}
              </option>
            ))}
          </select>
        </label>
        {bloc.actif && (
          <button type="button" className={ui.bouton} onClick={() => void modifier({ fin: aujourdhui() })}>
            Clore aujourd’hui
          </button>
        )}
        {confirmer ? (
          <button type="button" className={`${ui.bouton} ${ui.danger}`} onClick={() => void supprimer()}>
            Confirmer (les séances restent)
          </button>
        ) : (
          <button type="button" className={ui.discret} onClick={() => setConfirmer(true)}>
            Supprimer
          </button>
        )}
      </footer>
    </motion.article>
  )
}
