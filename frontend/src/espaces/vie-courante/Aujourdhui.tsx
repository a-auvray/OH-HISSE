import { motion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'

import { api } from '../../api/client'
import { type EtatDuJour, messageErreur } from '../../api/types'
import { aujourdhui, kg, nombre } from '../../commun/format'
import { exiger, useDonnees } from '../../commun/useDonnees'
import { Anneau } from './Anneau'
import styles from './Aujourdhui.module.css'

const QUAND = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

const VERDICTS = {
  oui: { titre: 'Ce soir, t’as le droit', couleur: 'var(--vie-courante)' },
  petit: { titre: 'Un petit écart, oui', couleur: '#c9d36a' },
  non: { titre: 'Pas cette fois', couleur: '#7d8c84' },
} as const

const apparaitre = (rang: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay: rang * 0.1, ease: [0.16, 1, 0.3, 1] as const },
})

/** Les verdicts du jour : récupération, écart mérité, sommeil, poids (note 05). */
export function Aujourdhui() {
  const [etat, recharger] = useDonnees(
    async () => exiger(await api.GET('/api/vie-courante/etat'), (e) => messageErreur(e)),
    [],
  )

  if (etat.etat === 'chargement') return <p className={styles.attente}>Un instant…</p>
  if (etat.etat === 'erreur') return <p className={styles.erreur}>{etat.message}</p>
  const e = etat.valeur

  return (
    <div className={styles.grille}>
      <Recuperation etat={e} />
      <CheatMeal etat={e} apresEcart={recharger} />
      <Nuit etat={e} apresSaisie={recharger} />
      <Poids etat={e} apresSaisie={recharger} />
    </div>
  )
}

function Recuperation({ etat }: { etat: EtatDuJour }) {
  const r = etat.recuperation
  return (
    <motion.section
      className={`${styles.carte} ${styles.large}`}
      {...apparaitre(0)}
      aria-labelledby="titre-recup"
    >
      <h2 id="titre-recup" className={styles.etiquette}>
        Récupération
      </h2>
      <div className={styles.recuperation}>
        <Anneau valeur={r.progression} libelle={`Récupération à ${Math.round(r.progression * 100)} %`}>
          {r.recupere ? (
            <span className={styles.geant}>Prêt</span>
          ) : (
            <>
              <span className={styles.geant}>{Math.round(r.restant_h)} h</span>
              <span className={styles.petit}>restantes</span>
            </>
          )}
        </Anneau>
        <div className={styles.explication}>
          <p className={styles.phrase}>
            {r.recupere
              ? 'Tu es récupéré : la prochaine séance peut être intense.'
              : `Prochain effort intense conseillé ${r.fin ? QUAND.format(new Date(r.fin)) : 'bientôt'}.`}
          </p>
          <ul className={styles.raisons}>
            {r.raisons.map((raison) => (
              <li key={raison}>{raison}</li>
            ))}
          </ul>
          {r.recup_active_conseillee && (
            <Link to="/marine/assistant" className={styles.lien}>
              Une baignade courte t’aiderait : voir l’assistant de sortie →
            </Link>
          )}
        </div>
      </div>
    </motion.section>
  )
}

function CheatMeal({ etat, apresEcart }: { etat: EtatDuJour; apresEcart: () => void }) {
  const v = etat.cheat_meal
  const style = VERDICTS[v.verdict]
  const [enCours, setEnCours] = useState(false)

  async function noter() {
    setEnCours(true)
    await api.POST('/api/vie-courante/cheat-meals', { body: { date: aujourdhui() } })
    setEnCours(false)
    apresEcart()
  }

  return (
    <motion.section className={styles.carte} {...apparaitre(1)} aria-labelledby="titre-ecart">
      <h2 id="titre-ecart" className={styles.etiquette}>
        Écart mérité ?
      </h2>
      <div className={styles.ecart}>
        <Anneau
          valeur={Math.max(0, v.points) / 4}
          taille={130}
          epaisseur={12}
          couleur={style.couleur}
          libelle={`${v.points} points`}
        >
          <span className={styles.moyen}>{v.points}</span>
          <span className={styles.petit}>points</span>
        </Anneau>
        <div>
          <p className={styles.verdict} style={{ color: style.couleur }}>
            {style.titre}
          </p>
          <p className={styles.phrase}>{v.phrase}</p>
        </div>
      </div>
      {v.details.length > 0 && (
        <ul className={styles.raisons}>
          {v.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
      <button type="button" className={styles.bouton} onClick={() => void noter()} disabled={enCours}>
        J’ai pris mon écart aujourd’hui
      </button>
    </motion.section>
  )
}

function Nuit({ etat, apresSaisie }: { etat: EtatDuJour; apresSaisie: () => void }) {
  const s = etat.sommeil
  const [heures, setHeures] = useState(
    s.derniere_nuit_h !== null && s.derniere_nuit_h !== undefined ? String(s.derniere_nuit_h) : '',
  )
  const [qualite, setQualite] = useState<number | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault()
    const { error } = await api.PUT('/api/vie-courante/nuits/{jour}', {
      params: { path: { jour: aujourdhui() } },
      body: { heures: Number(heures.replace(',', '.')), qualite },
    })
    if (error) setErreur(messageErreur(error, 'Saisie impossible.'))
    else {
      setErreur(null)
      apresSaisie()
    }
  }

  return (
    <motion.section className={styles.carte} {...apparaitre(2)} aria-labelledby="titre-nuit">
      <h2 id="titre-nuit" className={styles.etiquette}>
        Cette nuit
      </h2>
      <form className={styles.saisie} onSubmit={enregistrer}>
        <label>
          <span className="sr-only">Heures dormies</span>
          <input
            inputMode="decimal"
            placeholder="7,5"
            value={heures}
            onChange={(e) => setHeures(e.target.value)}
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
      {erreur && <p className={styles.erreur}>{erreur}</p>}
      <p className={styles.phrase}>
        {s.moyenne_h !== null && s.moyenne_h !== undefined
          ? `Moyenne sur 7 jours : ${nombre(s.moyenne_h)} h (${s.nuits_comptees} nuit${s.nuits_comptees > 1 ? 's' : ''})`
          : 'Pas encore de nuit notée cette semaine.'}
      </p>
      <Link to="/vie-courante/sommeil" className={styles.lien}>
        Voir la tendance →
      </Link>
    </motion.section>
  )
}

function Poids({ etat, apresSaisie }: { etat: EtatDuJour; apresSaisie: () => void }) {
  const p = etat.poids
  const [valeur, setValeur] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault()
    const { error } = await api.POST('/api/vie-courante/pesees', {
      body: { date: aujourdhui(), poids_kg: Number(valeur.replace(',', '.')) },
    })
    if (error) setErreur(messageErreur(error, 'Pesée impossible.'))
    else {
      setErreur(null)
      setValeur('')
      apresSaisie()
    }
  }

  return (
    <motion.section className={styles.carte} {...apparaitre(3)} aria-labelledby="titre-poids">
      <h2 id="titre-poids" className={styles.etiquette}>
        Poids du corps
      </h2>
      <p className={styles.moyen}>{p ? kg(p.kg, 1) : '—'}</p>
      <p className={styles.phrase}>
        {p
          ? p.a_jour
            ? 'Moyenne des pesées des trois dernières semaines.'
            : 'Dernière pesée de plus de trois semaines : non mise à jour.'
          : 'Le 1RM et les charges en ont besoin : une pesée par semaine, le lundi matin à jeun.'}
      </p>
      <form className={styles.saisie} onSubmit={enregistrer}>
        <label>
          <span className="sr-only">Poids du jour en kg</span>
          <input
            inputMode="decimal"
            placeholder="75,0"
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            required
          />
          <span>kg</span>
        </label>
        <button type="submit" className={styles.bouton}>
          Peser
        </button>
      </form>
      {erreur && <p className={styles.erreur}>{erreur}</p>}
    </motion.section>
  )
}
