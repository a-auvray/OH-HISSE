import { type KeyboardEvent, useEffect } from 'react'
import { Link } from 'react-router'

import type { ObjectifLu } from '../../../api/types'
import { dateCourte, dateLongue, nombre } from '../../../commun/format'
import { echeance } from '../../../espaces/objectifs/useObjectifs'
import { Badge } from './Badge'
import boutons from './Boutons.module.css'
import { Compteur } from './Compteur'
import type { Planche } from './donnees'
import { Elevation } from './Elevation'
import styles from './Fiche.module.css'
import { dateCompacte, decimal, isoDe, numeroPlanche, raisonSansPlan, segmentsBandeau, signe } from './modele'
import type { SessionVisite } from './useVisite'

/** Les gestes communs à toutes les pages d'objectifs (changer le statut, mettre en avant, supprimer). */
export interface Gestes {
  changerStatut: (objectif: ObjectifLu, statut: ObjectifLu['statut']) => Promise<void>
  mettreEnAvant: (objectif: ObjectifLu) => Promise<void>
  supprimer: (objectif: ObjectifLu) => Promise<void>
}

/** Ce que dit le bandeau d'état d'une planche : le badge, puis tout le diagnostic en texte. */
export function BandeauFiche({ planche }: { planche: Planche }) {
  const { objectif, analyse: a } = planche
  return (
    <>
      <Badge statut={a.statut} jours={a.ecart?.jours} />
      <span>{segmentsBandeau(a, objectif, echeance(objectif.jours_restants)).join(' · ')}</span>
    </>
  )
}

interface Props {
  planche: Planche
  /** Position dans la liasse, de 0, et nombre de planches : « PL. 01 », « 1 sur 3 ». */
  rang: number
  total: number
  principal: boolean
  session: SessionVisite
  /** Le passage en tireuse en entier a-t-il encore lieu ? Seule la première planche vue le joue. */
  developper: boolean
  surDeveloppe: () => void
  gestes: Gestes
  /** Feuilleter : la planche d'avant (-1) ou d'après (+1). */
  feuilleter: (sens: -1 | 1) => void
}

/**
 * La fiche d'une planche : son identité à gauche, l'élévation (le tirage et le calque) au centre,
 * les gestes et le cartouche en bas. Le bandeau d'état, au-dessus, dit tout en texte.
 */
export function Fiche({
  planche,
  rang,
  total,
  principal,
  session,
  developper,
  surDeveloppe,
  gestes,
  feuilleter,
}: Props) {
  const { objectif, analyse: a } = planche
  const enCours = objectif.statut === 'en_cours'
  const progression = objectif.progression
  const premierReleve = a.points[0]
  const depart = session.precedente?.pourcentages[String(objectif.id)]

  useEffect(() => {
    surDeveloppe()
  }, [surDeveloppe])

  // ↑ et ↓ feuillettent les planches, sauf sur un champ de saisie ou sur le calque, qui les gardent.
  function toucher(evenement: KeyboardEvent<HTMLElement>) {
    if (evenement.key !== 'ArrowUp' && evenement.key !== 'ArrowDown') return
    if (evenement.defaultPrevented) return
    if (
      evenement.target instanceof Element &&
      evenement.target.closest('input, select, textarea, [role="slider"]')
    ) {
      return
    }
    evenement.preventDefault()
    feuilleter(evenement.key === 'ArrowUp' ? -1 : 1)
  }

  return (
    <section
      className={styles.fiche}
      aria-label={`Fiche, ${objectif.titre}`}
      tabIndex={-1}
      onKeyDown={toucher}
    >
      <div className={styles.corps}>
        <div className={styles.identite}>
          <p className={styles.numero}>
            {numeroPlanche(rang)} · {objectif.type === 'competition' ? 'compétition' : 'max'}
            {principal && enCours ? ' · principal' : ''}
          </p>
          <h2 className={styles.titre}>{objectif.titre}</h2>
          <p className={styles.hero}>
            <Compteur valeur={Math.round(a.pourcentage)} depart={depart ?? 0} /> %
          </p>
          <p className={styles.cote}>
            {progression ? `+${decimal(progression.e1rm_lest_kg)}` : '—'} /{' '}
            {decimal(objectif.valeur_cible_kg)} kg
          </p>
          <p className={styles.reste}>
            {a.reste === null
              ? 'pas encore estimé : saisis des séances avec RPE'
              : a.reste > 0
                ? `reste ${decimal(a.reste)} kg`
                : 'cible atteinte'}
          </p>
          {total > 1 && (
            <div className={styles.feuilletage} role="group" aria-label={`Planche ${rang + 1} sur ${total}`}>
              <button
                type="button"
                className={boutons.bouton}
                onClick={() => feuilleter(-1)}
                disabled={rang === 0}
                aria-label="Planche précédente"
              >
                ↑
              </button>
              <span aria-hidden="true">
                {rang + 1} / {total}
              </span>
              <button
                type="button"
                className={boutons.bouton}
                onClick={() => feuilleter(1)}
                disabled={rang === total - 1}
                aria-label="Planche suivante"
              >
                ↓
              </button>
            </div>
          )}
        </div>

        <div className={styles.dessin}>
          <Elevation
            key={objectif.id}
            planche={planche}
            complet={developper}
            visitePrecedente={session.precedente?.jour ?? null}
          />
          {!a.plan && <p className={styles.note}>{raisonSansPlan(a, planche.historique)}</p>}
        </div>
      </div>

      <div className={styles.bas}>
        <div className={styles.gestes}>
          <div className={styles.blocs}>
            <span className={styles.etiquette}>Blocs</span>
            {objectif.blocs.length ? (
              objectif.blocs.map((b) => (
                <Link key={b.id} to="/streetlifting/blocs" className={styles.puce}>
                  {b.nom}
                </Link>
              ))
            ) : (
              <Link to="/streetlifting/blocs" className={styles.lien}>
                Rattacher un bloc →
              </Link>
            )}
          </div>

          <div className={styles.actions}>
            {enCours && (
              <>
                <button
                  type="button"
                  className={boutons.plein}
                  onClick={() => void gestes.changerStatut(objectif, 'atteint')}
                >
                  Marquer atteint
                </button>
                <button
                  type="button"
                  className={boutons.bouton}
                  onClick={() => void gestes.changerStatut(objectif, 'abandonne')}
                >
                  Abandonner
                </button>
                {!principal && (
                  <button
                    type="button"
                    className={boutons.bouton}
                    onClick={() => void gestes.mettreEnAvant(objectif)}
                  >
                    Mettre en avant
                  </button>
                )}
              </>
            )}
            {!enCours && (
              <button
                type="button"
                className={boutons.bouton}
                onClick={() => void gestes.changerStatut(objectif, 'en_cours')}
              >
                Reprendre
              </button>
            )}
            <button type="button" className={boutons.discret} onClick={() => void gestes.supprimer(objectif)}>
              Supprimer
            </button>
          </div>
        </div>

        <dl className={styles.cartouche} aria-label="Cartouche">
          <div>
            <dt>Mouvement</dt>
            <dd>{objectif.exercice}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{objectif.type === 'competition' ? 'compétition' : 'max'}</dd>
          </div>
          <div>
            <dt>Premier relevé</dt>
            <dd>
              {premierReleve
                ? `${signe(premierReleve.e1rm)} kg · ${dateCompacte(isoDe(premierReleve.jour))}`
                : 'aucun relevé'}
            </dd>
          </div>
          <div>
            <dt>Cible</dt>
            <dd>+{nombre(objectif.valeur_cible_kg)} kg de lest</dd>
          </div>
          <div>
            <dt>Échéance</dt>
            <dd>
              {dateLongue(objectif.date_cible)} · <strong>{echeance(objectif.jours_restants)}</strong>
            </dd>
          </div>
          <div>
            <dt>1RM estimé</dt>
            <dd>
              {progression
                ? `+${nombre(progression.e1rm_lest_kg)} kg (le ${dateCourte(progression.le)})`
                : 'pas encore estimé : saisis des séances avec RPE'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
