import { motion } from 'motion/react'
import { type FormEvent, useState } from 'react'

import type { Exercice, ObjectifEcrit } from '../../../api/types'
import { creerObjectif } from '../../../espaces/objectifs/useObjectifs'
import styles from './FormulaireObjectif.module.css'

interface Props {
  exercices: Exercice[]
  premier: boolean
  apresCreation: () => void
}

/** Fixer un cap : les mêmes champs que partout, tracés sur des lignes. */
export function FormulaireObjectif({ exercices, premier, apresCreation }: Props) {
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
      <button type="submit" className={styles.valider}>
        Fixer cet objectif
      </button>
    </motion.form>
  )
}
