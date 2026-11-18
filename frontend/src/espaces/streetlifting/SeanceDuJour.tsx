import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'

import { api } from '../../api/client'
import { messageErreur, type SeanceDuJour as Seance } from '../../api/types'
import { kg, nombre } from '../../commun/format'
import { exiger, useDonnees } from '../../commun/useDonnees'
import { PeseeRapide } from './PeseeRapide'
import styles from './SeanceDuJour.module.css'
import ui from './ui.module.css'

const TYPES: Record<string, string> = {
  force: 'Force',
  volume: 'Volume',
  deload: 'Deload',
  specifique: 'Spécifique',
}

async function charger(): Promise<Seance> {
  return exiger(await api.GET('/api/streetlifting/seance-du-jour'), (e) => messageErreur(e))
}

/** La séance calculée par l'auto-régulation, prête à être lancée. */
export function SeanceDuJour() {
  const [donnees, recharger] = useDonnees(charger, [])
  const naviguer = useNavigate()

  if (donnees.etat === 'chargement') return <p className={ui.etiquette}>Calcul de la séance…</p>
  if (donnees.etat === 'erreur') return <p className={ui.erreur}>{donnees.message}</p>

  const seance = donnees.valeur
  if (!seance.bloc) {
    return (
      <section className={`${ui.carte} ${ui.vide}`}>
        <p className={ui.etiquette}>Séance du jour</p>
        <h2>Pas de bloc en cours</h2>
        <p>{seance.message}</p>
        <div className={styles.actionsVide}>
          <Link className={ui.principal} to="/streetlifting/blocs">
            Importer un bloc
          </Link>
          <Link className={ui.bouton} to="/streetlifting/saisie">
            Saisir une séance libre
          </Link>
        </div>
      </section>
    )
  }

  const { bloc } = seance
  return (
    <section className={styles.page}>
      <div className={styles.bandeau}>
        <div className={styles.bloc}>
          <span className={styles.type}>{TYPES[bloc.type] ?? bloc.type}</span>
          <span>{bloc.nom}</span>
        </div>
        <div className={styles.avancement} aria-label={`Séance ${bloc.numero} sur ${bloc.total}`}>
          <span className={ui.etiquette}>
            Séance {bloc.numero} / {bloc.total}
          </span>
          <div className={styles.crans} style={{ gridTemplateColumns: `repeat(${bloc.total}, 1fr)` }}>
            {Array.from({ length: bloc.total }, (_, i) => (
              <span
                key={i}
                data-etat={i < bloc.numero - 1 ? 'fait' : i === bloc.numero - 1 ? 'courant' : 'a-venir'}
              />
            ))}
          </div>
        </div>
        <div className={styles.poids}>
          {seance.poids ? (
            <>
              <span className={ui.etiquette}>Poids du corps</span>
              <strong>{kg(seance.poids.kg, 1)}</strong>
              {!seance.poids.a_jour && <span className={styles.alerte}>pesée à refaire</span>}
            </>
          ) : null}
        </div>
      </div>

      {(!seance.poids || !seance.poids.a_jour) && (
        <PeseeRapide
          apresPesee={recharger}
          raison={
            seance.poids
              ? 'Ta dernière pesée date de plus de trois semaines.'
              : 'Sans ton poids, les charges ne peuvent pas être calculées.'
          }
        />
      )}

      <h1 className={`${ui.titre} ${styles.nom}`}>{seance.nom}</h1>

      <ol className={styles.exercices}>
        {seance.propositions.map((p, i) => (
          <motion.li
            key={`${p.exercice_id}-${i}`}
            className={`${ui.carte} ${styles.exercice}`}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.programme}>
              <h2 className={ui.titre}>{p.exercice}</h2>
              <p className={styles.format}>
                {p.series} × {p.reps} <span>· RPE {nombre(p.rpe_cible)}</span>
              </p>
            </div>
            <div className={styles.charge}>
              {p.lest_kg === null ? (
                <span className={styles.aChoisir}>À choisir</span>
              ) : p.lest_kg === 0 ? (
                <span className={ui.chiffre}>PDC</span>
              ) : (
                <>
                  <span className={ui.chiffre}>+{nombre(p.lest_kg)}</span>
                  <span className={styles.unite}>kg</span>
                </>
              )}
            </div>
            {p.justifications.length > 0 && (
              <ul className={styles.raisons}>
                {p.justifications.map((j) => (
                  <li key={j}>{j}</li>
                ))}
              </ul>
            )}
          </motion.li>
        ))}
      </ol>

      <div className={styles.lancer}>
        <button
          type="button"
          className={ui.principal}
          onClick={() => naviguer('/streetlifting/saisie', { state: { seanceDuJour: seance } })}
        >
          Commencer la séance →
        </button>
      </div>
    </section>
  )
}
