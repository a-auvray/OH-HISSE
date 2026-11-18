import { type FormEvent, useState } from 'react'

import { api } from '../../api/client'
import { messageErreur } from '../../api/types'
import { aujourdhui } from '../../commun/format'
import styles from './PeseeRapide.module.css'
import ui from './ui.module.css'

interface Props {
  /** Appelé après l'enregistrement, pour recalculer les charges. */
  apresPesee: () => void
  raison: string
}

/** Saisie express du poids du jour : le 1RM et les charges en dépendent. */
export function PeseeRapide({ apresPesee, raison }: Props) {
  const [poids, setPoids] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault()
    setEnCours(true)
    const { error } = await api.POST('/api/vie-courante/pesees', {
      body: { date: aujourdhui(), poids_kg: Number(poids.replace(',', '.')) },
    })
    setEnCours(false)
    if (error) {
      setErreur(messageErreur(error, 'Pesée impossible.'))
      return
    }
    apresPesee()
  }

  return (
    <form className={styles.pesee} onSubmit={enregistrer}>
      <div>
        <p className={ui.etiquette}>Pesée</p>
        <p className={styles.raison}>{raison}</p>
      </div>
      <label className={styles.saisie}>
        <span className="sr-only">Poids du jour en kg</span>
        <input
          className={ui.champ}
          inputMode="decimal"
          placeholder="75,0"
          required
          pattern="\d{2,3}([.,]\d{1,2})?"
          value={poids}
          onChange={(e) => setPoids(e.target.value)}
        />
        <span>kg</span>
      </label>
      <button className={ui.bouton} type="submit" disabled={enCours}>
        Enregistrer
      </button>
      {erreur && (
        <p className={ui.erreur} role="alert">
          {erreur}
        </p>
      )}
    </form>
  )
}
