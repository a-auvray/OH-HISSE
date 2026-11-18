import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { api } from '../../api/client'
import { type Briefing, messageErreur } from '../../api/types'
import { exiger, useDonnees } from '../../commun/useDonnees'
import styles from './Briefings.module.css'

type Choix =
  | { type: 'jour' }
  | { type: 'semaine'; decalage: number }
  | { type: 'bloc'; id: number; moment: 'debut' | 'fin' }

/** Écrans de bilan : jour, semaine, début et fin de bloc (note 05). */
export function Briefings() {
  const [choix, setChoix] = useState<Choix>({ type: 'jour' })
  const [blocs] = useDonnees(
    async () => exiger(await api.GET('/api/streetlifting/blocs'), (e) => messageErreur(e)),
    [],
  )
  const cle = JSON.stringify(choix)
  const [briefing] = useDonnees(async (): Promise<Briefing> => {
    const message = (e: unknown) => messageErreur(e, 'Briefing indisponible.')
    if (choix.type === 'jour') return exiger(await api.GET('/api/vie-courante/briefings/jour'), message)
    if (choix.type === 'semaine') {
      return exiger(
        await api.GET('/api/vie-courante/briefings/semaine', {
          params: { query: { decalage: choix.decalage } },
        }),
        message,
      )
    }
    return exiger(
      await api.GET('/api/vie-courante/briefings/bloc/{bloc_id}', {
        params: { path: { bloc_id: choix.id }, query: { moment: choix.moment } },
      }),
      message,
    )
  }, [cle])

  const listeBlocs = blocs.etat === 'pret' ? blocs.valeur : []

  return (
    <div className={styles.briefings}>
      <nav className={styles.choix} aria-label="Choisir un briefing">
        <button type="button" aria-pressed={choix.type === 'jour'} onClick={() => setChoix({ type: 'jour' })}>
          Aujourd’hui
        </button>
        <div className={styles.semaine}>
          <button
            type="button"
            aria-label="Semaine précédente"
            onClick={() =>
              setChoix({ type: 'semaine', decalage: choix.type === 'semaine' ? choix.decalage + 1 : 1 })
            }
          >
            ‹
          </button>
          <button
            type="button"
            aria-pressed={choix.type === 'semaine'}
            onClick={() => setChoix({ type: 'semaine', decalage: 0 })}
          >
            {choix.type === 'semaine' && choix.decalage > 0
              ? `Il y a ${choix.decalage} sem.`
              : 'Cette semaine'}
          </button>
          <button
            type="button"
            aria-label="Semaine suivante"
            disabled={choix.type !== 'semaine' || choix.decalage === 0}
            onClick={() =>
              choix.type === 'semaine' && setChoix({ type: 'semaine', decalage: choix.decalage - 1 })
            }
          >
            ›
          </button>
        </div>
        {listeBlocs.length > 0 && (
          <select
            aria-label="Bilan de bloc"
            value={choix.type === 'bloc' ? `${choix.id}:${choix.moment}` : ''}
            onChange={(e) => {
              const [id, moment] = e.target.value.split(':')
              if (id && (moment === 'debut' || moment === 'fin'))
                setChoix({ type: 'bloc', id: Number(id), moment })
            }}
          >
            <option value="">Bilans de bloc…</option>
            {listeBlocs.map((b) => (
              <optgroup key={b.id} label={b.nom}>
                <option value={`${b.id}:debut`}>Début du bloc</option>
                <option value={`${b.id}:fin`}>{b.actif ? 'Bilan en cours' : 'Fin du bloc'}</option>
              </optgroup>
            ))}
          </select>
        )}
      </nav>

      {briefing.etat === 'erreur' && <p className={styles.erreur}>{briefing.message}</p>}
      <AnimatePresence mode="wait">
        {briefing.etat === 'pret' && <VueBriefing key={cle} briefing={briefing.valeur} />}
      </AnimatePresence>
    </div>
  )
}

/** Un briefing : un titre, puis une carte par espace, à sa couleur. */
export function VueBriefing({ briefing }: { briefing: Briefing }) {
  return (
    <motion.article
      className={styles.vue}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <header>
        <p className={styles.sousTitre}>{briefing.sous_titre}</p>
        <h2 className={styles.titre}>{briefing.titre}</h2>
      </header>
      <div className={styles.sections}>
        {briefing.sections.map((s, i) => (
          <motion.section
            key={`${s.espace}-${s.titre}`}
            data-espace={s.espace}
            className={styles.section}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
          >
            <p className={styles.nomSection}>{s.titre}</p>
            {s.valeur && <p className={styles.valeur}>{s.valeur}</p>}
            <ul>
              {s.lignes.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>
    </motion.article>
  )
}
