import { motion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'

import { kg, nombre } from '../../../commun/format'
import { noterEcart, noterNuit, peser, useEtatDuJour } from '../../../espaces/vie-courante/etat'
import { Panneau } from '../Panneau'
import { Assiette } from './Assiette'
import styles from './Aujourdhui.module.css'
import { Souffle } from './Souffle'

const QUAND = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

const VERDICTS = {
  oui: 'Ce soir, t’as le droit.',
  petit: 'Un petit écart, oui.',
  non: 'Pas cette fois.',
} as const

const EXPO = [0.16, 1, 0.3, 1] as const
const apparaitre = (rang: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, delay: 0.2 + rang * 0.15, ease: EXPO },
})

/**
 * Les verdicts du jour, version Papier : une page calme, la phrase d'abord,
 * peu de lignes, beaucoup d'air. Mêmes données et mêmes gestes que dans les autres thèmes.
 */
export function AujourdhuiPapier() {
  const [etat, recharger] = useEtatDuJour()
  const [enCours, setEnCours] = useState(false)

  const [heures, setHeures] = useState<string | null>(null)
  const [qualite, setQualite] = useState<number | null>(null)
  const [erreurNuit, setErreurNuit] = useState<string | null>(null)
  const [poids, setPoids] = useState('')
  const [erreurPoids, setErreurPoids] = useState<string | null>(null)

  if (etat.etat === 'chargement') return <p className={styles.attente}>Un instant…</p>
  if (etat.etat === 'erreur') return <p className={styles.erreur}>{etat.message}</p>
  const e = etat.valeur
  const r = e.recuperation
  const v = e.cheat_meal
  const s = e.sommeil
  const p = e.poids
  const nuit =
    heures ?? (s.derniere_nuit_h === null || s.derniere_nuit_h === undefined ? '' : String(s.derniere_nuit_h))

  async function ecart() {
    setEnCours(true)
    await noterEcart()
    setEnCours(false)
    recharger()
  }

  async function enregistrerNuit(evenement: FormEvent) {
    evenement.preventDefault()
    const message = await noterNuit(nuit, qualite)
    setErreurNuit(message)
    if (!message) recharger()
  }

  async function enregistrerPoids(evenement: FormEvent) {
    evenement.preventDefault()
    const message = await peser(poids)
    setErreurPoids(message)
    if (!message) {
      setPoids('')
      recharger()
    }
  }

  return (
    <div className={styles.page}>
      <motion.h2 className={styles.phrase} {...apparaitre(0)}>
        {VERDICTS[v.verdict]}
      </motion.h2>
      <motion.p className={styles.sousPhrase} {...apparaitre(1)}>
        {v.phrase}
      </motion.p>

      <div className={styles.corps}>
        <motion.section className={styles.recup} aria-labelledby="papier-recup" {...apparaitre(2)}>
          <h3 id="papier-recup" className={styles.rubrique}>
            Récupération
          </h3>
          <Souffle
            progression={r.progression}
            libelle={`Récupération à ${Math.round(r.progression * 100)} %`}
          >
            {r.recupere ? (
              <span className={styles.grand}>Prêt</span>
            ) : (
              <>
                <span className={styles.grand}>{Math.round(r.restant_h)} h</span>
                <span className={styles.petit}>restantes</span>
              </>
            )}
          </Souffle>
          <p className={styles.texte}>
            {r.recupere
              ? 'Tu es récupéré : la prochaine séance peut être intense.'
              : `Prochain effort intense conseillé ${r.fin ? QUAND.format(new Date(r.fin)) : 'bientôt'}.`}
          </p>
          {r.raisons.length > 0 && (
            <Panneau id="vie-recuperation" titre="Pourquoi" resume={r.raisons[0]}>
              <ul className={styles.raisons}>
                {r.raisons.map((raison) => (
                  <li key={raison}>{raison}</li>
                ))}
              </ul>
            </Panneau>
          )}
          {r.recup_active_conseillee && (
            <Link to="/marine/assistant" className={styles.lien}>
              Une baignade courte t’aiderait : l’assistant de sortie →
            </Link>
          )}
        </motion.section>

        <div className={styles.colonne}>
          <motion.section className={styles.ecart} aria-labelledby="papier-ecart" {...apparaitre(3)}>
            <h3 id="papier-ecart" className={styles.rubrique}>
              Écart mérité ?
            </h3>
            <div className={styles.assiette}>
              <Assiette points={v.points} libelle={`${v.points} points`} />
              <p className={styles.texte}>
                <strong>{v.points}</strong> point{v.points > 1 ? 's' : ''} sur 4
              </p>
            </div>
            {v.details.length > 0 && (
              <Panneau id="vie-ecart" titre="Le détail des points" resume={v.details[0]}>
                <ul className={styles.raisons}>
                  {v.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </Panneau>
            )}
            <button type="button" className={styles.bouton} onClick={() => void ecart()} disabled={enCours}>
              J’ai pris mon écart aujourd’hui
            </button>
          </motion.section>

          <motion.section className={styles.matin} aria-labelledby="papier-nuit" {...apparaitre(4)}>
            <h3 id="papier-nuit" className={styles.rubrique}>
              Cette nuit
            </h3>
            <form className={styles.champ} onSubmit={enregistrerNuit}>
              <label>
                <span className="sr-only">Heures dormies</span>
                <input
                  inputMode="decimal"
                  placeholder="7,5"
                  value={nuit}
                  onChange={(ev) => setHeures(ev.target.value)}
                  required
                />
                <span>h</span>
              </label>
              <div className={styles.lunes} role="radiogroup" aria-label="Qualité du sommeil">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={qualite === n}
                    aria-label={`Qualité ${n} sur 5`}
                    data-allume={qualite !== null && n <= qualite ? true : undefined}
                    onClick={() => setQualite(qualite === n ? null : n)}
                  >
                    ☾
                  </button>
                ))}
              </div>
              <button type="submit" className={styles.bouton}>
                Noter
              </button>
            </form>
            {erreurNuit && <p className={styles.erreur}>{erreurNuit}</p>}
            <p className={styles.texte}>
              {s.moyenne_h !== null && s.moyenne_h !== undefined
                ? `Moyenne sur 7 jours : ${nombre(s.moyenne_h)} h (${s.nuits_comptees} nuit${s.nuits_comptees > 1 ? 's' : ''})`
                : 'Pas encore de nuit notée cette semaine.'}{' '}
              <Link to="/vie-courante/sommeil" className={styles.lien}>
                La tendance →
              </Link>
            </p>
          </motion.section>

          <motion.section className={styles.matin} aria-labelledby="papier-poids" {...apparaitre(5)}>
            <h3 id="papier-poids" className={styles.rubrique}>
              Poids du corps
            </h3>
            <p className={styles.poids}>{p ? kg(p.kg, 1) : '—'}</p>
            <p className={styles.texte}>
              {p
                ? p.a_jour
                  ? 'Moyenne des pesées des trois dernières semaines.'
                  : 'Dernière pesée de plus de trois semaines : non mise à jour.'
                : 'Le 1RM et les charges en ont besoin : une pesée par semaine, le lundi matin à jeun.'}
            </p>
            <form className={styles.champ} onSubmit={enregistrerPoids}>
              <label>
                <span className="sr-only">Poids du jour en kg</span>
                <input
                  inputMode="decimal"
                  placeholder="75,0"
                  value={poids}
                  onChange={(ev) => setPoids(ev.target.value)}
                  required
                />
                <span>kg</span>
              </label>
              <button type="submit" className={styles.bouton}>
                Peser
              </button>
            </form>
            {erreurPoids && <p className={styles.erreur}>{erreurPoids}</p>}
          </motion.section>
        </div>
      </div>
    </div>
  )
}
