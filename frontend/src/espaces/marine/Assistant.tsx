import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'

import { api } from '../../api/client'
import { type Assistant as DonneesAssistant, messageErreur } from '../../api/types'
import { exiger, useDonnees } from '../../commun/useDonnees'
import styles from './Assistant.module.css'
import { BadgeDanger } from './BadgeDanger'
import { IconeMode } from './Carnet'
import { MODES, type TypeSortie } from './formulaireSortie'
import { heure, jourCourt } from './lecture'

const DUREES = [10, 20, 30, 45, 60, 90]

/** « Planifier une sortie » puis « Préparer ma sortie » (note 04). */
export function Assistant({ spotId }: { spotId: number | null }) {
  const [mode, setMode] = useState<TypeSortie>('nage')
  const [duree, setDuree] = useState(30)
  const [combinaison, setCombinaison] = useState(false)

  const [reponse, recharger] = useDonnees(
    async () =>
      spotId === null
        ? null
        : exiger(
            await api.GET('/api/marine/assistant', {
              params: { query: { spot_id: spotId, mode, duree_min: duree, combinaison } },
            }),
            (e) => messageErreur(e, 'Assistant indisponible.'),
          ),
    [spotId, mode, duree, combinaison],
  )

  return (
    <div className={styles.assistant}>
      <section className={styles.reglages} aria-label="Ma sortie">
        <div className={styles.modes} role="radiogroup" aria-label="Type de sortie">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => setMode(m.id)}
            >
              <IconeMode type={m.id} taille={22} />
              {m.libelle}
            </button>
          ))}
        </div>
        <div className={styles.durees} role="radiogroup" aria-label="Durée envisagée">
          {DUREES.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={duree === d} onClick={() => setDuree(d)}>
              {d} min
            </button>
          ))}
        </div>
        <label className={styles.interrupteur}>
          <input type="checkbox" checked={combinaison} onChange={(e) => setCombinaison(e.target.checked)} />
          <span aria-hidden="true" />
          Avec combinaison
        </label>
      </section>

      {reponse.etat === 'chargement' && <p className={styles.attente}>L’assistant lit la mer…</p>}
      {reponse.etat === 'erreur' && (
        <div className={styles.erreur} role="alert">
          {reponse.message}
          <button type="button" onClick={recharger}>
            Réessayer
          </button>
        </div>
      )}
      {reponse.etat === 'pret' && reponse.valeur && <Resultat donnees={reponse.valeur} />}
    </div>
  )
}

function Resultat({ donnees }: { donnees: DonneesAssistant }) {
  const r = donnees.recommandations
  return (
    <>
      <section aria-labelledby="titre-creneaux">
        <h2 id="titre-creneaux" className={styles.titre}>
          Meilleurs créneaux
        </h2>
        {donnees.creneaux.length === 0 ? (
          <p className={styles.aucun}>
            Aucun créneau de jour sans danger noir dans les 48 prochaines heures. La mer attendra.
          </p>
        ) : (
          <ol className={styles.creneaux}>
            {donnees.creneaux.map((c, i) => (
              <motion.li
                key={c.debut}
                className={styles.creneau}
                data-niveau={c.danger.niveau}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className={styles.jour}>{jourCourt(c.debut)}</p>
                <p className={styles.horaire}>
                  {heure(c.debut)} <span>→</span> {heure(c.fin)}
                </p>
                <BadgeDanger danger={c.danger} />
                {c.atouts.length > 0 && (
                  <ul className={styles.atouts}>
                    {c.atouts.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}
                {c.reserves.length > 0 && (
                  <ul className={styles.reserves}>
                    {c.reserves.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}
              </motion.li>
            ))}
          </ol>
        )}
      </section>

      {r && (
        <section className={styles.preparer} aria-labelledby="titre-preparer">
          <h2 id="titre-preparer" className={styles.titre}>
            Préparer ma sortie
          </h2>

          <AnimatePresence>
            {r.reprise && (
              <motion.div className={styles.reprise} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <strong>
                  {donnees.jours_depuis_derniere_sortie === null
                    ? 'Première sortie notée : on part prudent.'
                    : `Ta dernière sortie remonte à ${donnees.jours_depuis_derniere_sortie} jours.`}
                </strong>{' '}
                Le corps a perdu son habitude du froid : les durées sont divisées par deux.
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.grille}>
            <article className={styles.carte}>
              <p className={styles.etiquette}>Temps dans l’eau</p>
              {r.durees.conseille_min === null ? (
                <p className={styles.grand}>Libre</p>
              ) : (
                <p className={styles.grand}>
                  {r.durees.conseille_min}
                  <span> min</span>
                  <small> · {r.durees.maximum_min} au plus</small>
                </p>
              )}
              <p className={styles.detail}>{r.durees.texte}</p>
            </article>

            <article className={styles.carte}>
              <p className={styles.etiquette}>Sens de nage</p>
              <div className={styles.sens}>
                <svg viewBox="0 0 120 40" aria-hidden="true" data-sens={r.sens.sens ?? 'aucun'}>
                  <line x1="6" y1="30" x2="114" y2="30" className={styles.plage} />
                  {r.sens.sens && <path d="M20 16h80m-12-8 12 8-12 8" className={styles.fleche} />}
                </svg>
                <p className={styles.detail}>{r.sens.texte}</p>
              </div>
            </article>

            <article className={`${styles.carte} ${styles.tenue}`}>
              <p className={styles.etiquette}>À emporter</p>
              <ul>
                {r.tenue.map((t) => (
                  <li key={t}>
                    <label>
                      <input type="checkbox" />
                      <span>{t}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          {r.gestes.length > 0 && (
            <article className={styles.gestes}>
              <p className={styles.etiquette}>Gestes de sécurité</p>
              <ol>
                {r.gestes.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ol>
            </article>
          )}

          <p className={styles.mention}>
            L’appli aide à décider ; elle ne remplace pas le bon sens sur place. Au retour,{' '}
            <Link to="/marine/carnet">note ta sortie dans le carnet</Link>.
          </p>
        </section>
      )}
    </>
  )
}
