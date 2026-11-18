import { motion } from 'motion/react'
import { type FormEvent, useState } from 'react'

import { Lueurs } from '../commun/Lueurs'
import { useSession } from '../session/contexte'
import styles from './Connexion.module.css'

const MARQUE = 'OH HISSE !'
const SORTIE = [0.16, 1, 0.3, 1] as const

export function Connexion() {
  const { seConnecter, entrerEnDemo } = useSession()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState<'connexion' | 'demo' | null>(null)

  async function connecter(evenement: FormEvent) {
    evenement.preventDefault()
    setEnCours('connexion')
    setErreur(await seConnecter(email, motDePasse))
    setEnCours(null)
  }

  async function demo() {
    setEnCours('demo')
    setErreur(await entrerEnDemo())
    setEnCours(null)
  }

  return (
    <main className={styles.ecran}>
      <Lueurs />

      <div className={styles.contenu}>
        <h1 className={styles.marque} aria-label="Oh Hisse !">
          {[...MARQUE].map((lettre, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              initial={{ opacity: 0, y: '0.6em', rotate: 6 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.9, delay: 0.25 + i * 0.05, ease: SORTIE }}
            >
              {lettre === ' ' ? ' ' : lettre}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className={styles.devise}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
        >
          Muscu, mer, récup&nbsp;: un seul gestionnaire.
        </motion.p>

        <motion.div
          className={styles.carte}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.05, ease: SORTIE }}
        >
          <form className={styles.formulaire} onSubmit={connecter}>
            <label className={styles.champ}>
              <span>Email</span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className={styles.champ}>
              <span>Mot de passe</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
            </label>

            {erreur && (
              <p className={styles.erreur} role="alert">
                {erreur}
              </p>
            )}

            <button className={styles.principal} type="submit" disabled={enCours !== null}>
              {enCours === 'connexion' ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className={styles.separateur}>
            <span>ou</span>
          </div>

          <button className={styles.demo} type="button" onClick={demo} disabled={enCours !== null}>
            <span className={styles.demoTitre}>
              {enCours === 'demo' ? 'Préparation de la démo…' : 'Explorer en mode démo'}
            </span>
            <span className={styles.demoDetail}>Données fictives, rien qu’à toi pendant 24&nbsp;h</span>
          </button>
        </motion.div>
      </div>
    </main>
  )
}
