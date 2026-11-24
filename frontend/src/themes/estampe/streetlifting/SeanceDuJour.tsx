import { Link, useNavigate } from 'react-router'

import { kg, lest, nombre } from '../../../commun/format'
import { TYPES_BLOC } from '../../../espaces/streetlifting/chronologie'
import { PeseeRapide } from '../../../espaces/streetlifting/PeseeRapide'
import { useSeanceDuJour } from '../../../espaces/streetlifting/useSeanceDuJour'
import { Panneau } from '../../Panneau'
import styles from './SeanceDuJour.module.css'

/**
 * La séance du jour comme un relevé d'imprimeur : les strates du bloc (une par
 * séance, encrées jusqu'à la séance du jour), le titre, puis un tableau réglé,
 * un exercice par ligne, la charge en grand.
 */
export function SeanceDuJourEstampe() {
  const { donnees, recharger } = useSeanceDuJour()
  const naviguer = useNavigate()

  if (donnees.etat === 'chargement') return <p className={styles.attente}>Calcul de la séance…</p>
  if (donnees.etat === 'erreur') return <p className={styles.erreur}>{donnees.message}</p>

  const seance = donnees.valeur
  const { bloc } = seance

  if (!bloc) {
    return (
      <section className={styles.vide}>
        <h2>Pas de bloc en cours.</h2>
        <p>{seance.message}</p>
        <div className={styles.actions}>
          <Link className={styles.principal} to="/streetlifting/blocs">
            Importer un bloc
          </Link>
          <Link className={styles.lien} to="/streetlifting/saisie">
            Saisir une séance libre
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header className={styles.entete}>
        <p className={styles.releve}>
          Relevé · {TYPES_BLOC[bloc.type]} · {bloc.nom}
        </p>
        <div
          className={styles.strates}
          role="progressbar"
          aria-label="Avancement du bloc"
          aria-valuemin={1}
          aria-valuemax={bloc.total}
          aria-valuenow={bloc.numero}
          aria-valuetext={`Séance ${bloc.numero} sur ${bloc.total}`}
        >
          <ol style={{ gridTemplateColumns: `repeat(${bloc.total}, 1fr)` }}>
            {Array.from({ length: bloc.total }, (_, i) => (
              <li
                key={i}
                data-etat={i < bloc.numero - 1 ? 'fait' : i === bloc.numero - 1 ? 'courant' : 'a-venir'}
              />
            ))}
          </ol>
          <span>
            Séance {bloc.numero} / {bloc.total}
          </span>
        </div>
        {seance.poids && (
          <p className={styles.poids}>
            Poids du corps <strong>{kg(seance.poids.kg, 1)}</strong>
            {!seance.poids.a_jour && <em> · pesée à refaire</em>}
          </p>
        )}
      </header>

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

      <h2 className={styles.nom}>{seance.nom}</h2>

      {seance.forme && seance.forme.consignes.length > 0 && (
        <aside className={styles.forme} role="note">
          <p className={styles.etiquette}>Forme du jour</p>
          <ul>
            {seance.forme.consignes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Link to="/vie-courante" className={styles.lien}>
            Voir ma récupération →
          </Link>
        </aside>
      )}

      <ol className={styles.tableau}>
        {seance.propositions.map((p, i) => (
          <li key={`${p.exercice_id}-${i}`} className={styles.ligne}>
            <span className={styles.rang} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className={styles.programme}>
              <h3>{p.exercice}</h3>
              <p>
                {p.series} × {p.reps} · RPE {nombre(p.rpe_cible)}
              </p>
              <ul className={styles.cases} aria-label={`${p.series} séries à faire`}>
                {Array.from({ length: p.series }, (_, s) => (
                  <li key={s} />
                ))}
              </ul>
            </div>
            <p className={styles.charge}>
              {p.lest_kg === null ? (
                <span className={styles.aChoisir}>À choisir</span>
              ) : p.lest_kg === 0 ? (
                'PDC'
              ) : (
                lest(p.lest_kg)
              )}
            </p>
            {p.justifications.length > 0 && (
              <div className={styles.marge}>
                <Panneau
                  id="streetlifting-pourquoi"
                  titre="Pourquoi cette charge"
                  resume={`${p.justifications.length} raison${p.justifications.length > 1 ? 's' : ''}`}
                >
                  <ul className={styles.raisons}>
                    {p.justifications.map((j) => (
                      <li key={j}>{j}</li>
                    ))}
                  </ul>
                </Panneau>
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className={styles.lancer}>
        <button
          type="button"
          className={styles.principal}
          onClick={() => naviguer('/streetlifting/saisie', { state: { seanceDuJour: seance } })}
        >
          Commencer la séance →
        </button>
      </div>
    </section>
  )
}
