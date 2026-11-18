import { useState } from 'react'

import { api } from '../../api/client'
import { messageErreur } from '../../api/types'
import { dateCourte, nombre } from '../../commun/format'
import { exiger, useDonnees } from '../../commun/useDonnees'
import { useLargeur } from '../../commun/useLargeur'
import styles from './Analyse.module.css'
import { agreger, type Metrique, type Periode } from './chronologie'
import { Courbe } from './Courbe'
import ui from './ui.module.css'

const METRIQUES: { id: Metrique; libelle: string; unite: string }[] = [
  { id: 'e1rm_lest_kg', libelle: '1RM estimé', unite: 'kg de lest' },
  { id: 'tonnage_kg', libelle: 'Tonnage', unite: 'kg' },
  { id: 'series', libelle: 'Séries', unite: 'séries' },
  { id: 'reps', libelle: 'Répétitions', unite: 'reps' },
  { id: 'rpe_moyen', libelle: 'RPE moyen', unite: 'RPE' },
]

const PERIODES: { id: Periode; libelle: string }[] = [
  { id: 'seance', libelle: 'Séance' },
  { id: 'semaine', libelle: 'Semaine' },
  { id: 'mois', libelle: 'Mois' },
]

/** Graphiques d'évolution par exercice (note 03). */
export function Analyse() {
  const [exercices] = useDonnees(
    async () => exiger(await api.GET('/api/streetlifting/exercices'), (e) => messageErreur(e)),
    [],
  )
  const [choix, setChoix] = useState<number | null>(null)
  const [metrique, setMetrique] = useState<Metrique>('e1rm_lest_kg')
  const [periode, setPeriode] = useState<Periode>('seance')
  const [cadre, largeur] = useLargeur<HTMLDivElement>()

  const exerciceId = choix ?? (exercices.etat === 'pret' ? (exercices.valeur[0]?.id ?? null) : null)
  const [evolution] = useDonnees(
    async () =>
      exerciceId === null
        ? []
        : exiger(
            await api.GET('/api/streetlifting/evolution/{exercice_id}', {
              params: { path: { exercice_id: exerciceId } },
            }),
            (e) => messageErreur(e),
          ),
    [exerciceId],
  )

  const definition = METRIQUES.find((m) => m.id === metrique)!
  const points = evolution.etat === 'pret' ? agreger(evolution.valeur, metrique, periode) : []
  const records = evolution.etat === 'pret' ? agreger(evolution.valeur, 'e1rm_lest_kg', 'seance') : []
  const premier = records[0]
  const dernier = records.at(-1)
  const meilleur = records.reduce<(typeof records)[number] | undefined>(
    (m, p) => (!m || p.valeur > m.valeur ? p : m),
    undefined,
  )

  return (
    <section className={styles.analyse}>
      <div className={styles.filtres}>
        <Segments
          libelle="Exercice"
          options={
            exercices.etat === 'pret' ? exercices.valeur.map((e) => ({ id: e.id, libelle: e.nom })) : []
          }
          valeur={exerciceId}
          choisir={setChoix}
        />
        <Segments
          libelle="Métrique"
          options={METRIQUES.map((m) => ({ id: m.id, libelle: m.libelle }))}
          valeur={metrique}
          choisir={setMetrique}
        />
        <Segments
          libelle="Période"
          options={PERIODES.map((p) => ({ id: p.id, libelle: p.libelle }))}
          valeur={periode}
          choisir={setPeriode}
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
