import { type FormEvent, useEffect, useRef, useState } from 'react'

import type { Exercice, ObjectifEcrit } from '../../../api/types'
import { creerObjectif } from '../../../espaces/objectifs/useObjectifs'
import commun from './commun.module.css'
import styles from './Formulaire.module.css'

interface Props {
  exercices: Exercice[]
  premier: boolean
  apresCreation: () => void
}

/** Tendre une corde : les mêmes champs que dans tous les thèmes, posés entre deux montants. */
export function Formulaire({ exercices, premier, apresCreation }: Props) {
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
  const premierChamp = useRef<HTMLInputElement>(null)

  // On ouvre le formulaire pour écrire : le curseur est déjà dans le premier champ.
  useEffect(() => premierChamp.current?.focus(), [])

  async function creer(evenement: FormEvent) {
    evenement.preventDefault()
    const message = await creerObjectif(valeurs, cible)
    if (message) setErreur(message)
    else apresCreation()
  }

  const champ = <K extends keyof ObjectifEcrit>(cle: K, valeur: ObjectifEcrit[K]) =>
    setValeurs((v) => ({ ...v, [cle]: valeur }))

  return (
    <form className={styles.formulaire} onSubmit={creer} aria-label="Tendre une corde">
      <label className={styles.large}>
        <span>Intitulé</span>
        <input
          ref={premierChamp}
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
      <button type="submit" className={commun.plein}>
        Fixer cet objectif
      </button>
    </form>
  )
}
