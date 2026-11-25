import { Link } from 'react-router'

import type { ObjectifLu, PointEvolution } from '../../../api/types'
import { dateCourte, dateLongue, nombre } from '../../../commun/format'
import { echeance } from '../../../espaces/objectifs/useObjectifs'
import { Badge } from './Badge'
import commun from './commun.module.css'
import { Courbe } from './Courbe'
import styles from './Fiche.module.css'
import { avancement, phraseEcart, phrasePente, type Rythme, semaines, signe, statut } from './modele'

export interface ActionsFiche {
  changerStatut: (o: ObjectifLu, statut: ObjectifLu['statut']) => void
  mettreEnAvant: (o: ObjectifLu) => void
  supprimer: (o: ObjectifLu) => void
}

interface Props extends ActionsFiche {
  objectif: ObjectifLu
  rythme: Rythme | null
  chargement: boolean
  /** C'est l'objectif mis en avant (celui de l'accueil) : les autres peuvent l'être à leur tour. */
  principal: boolean
  points: readonly PointEvolution[]
  aujourdhui: string
}

/**
 * La lecture d'un objectif : le héros n'est pas le pourcentage mais la décision du jour, la pente qu'il faut
 * tenir face à celle qu'on tient. Dessous, les faits de la fiche, les blocs liés et les gestes
 * (marquer atteint, abandonner, mettre en avant, reprendre, supprimer).
 */
export function Fiche({
  objectif: o,
  rythme,
  chargement,
  principal,
  points,
  aujourdhui,
  changerStatut,
  mettreEnAvant,
  supprimer,
}: Props) {
  const etat = statut(o, rythme)
  const enCours = o.statut === 'en_cours'
  // Cible déjà atteinte : plus de pente à tenir, la décision du jour est de marquer l'objectif atteint.
  const atteinte = enCours && o.progression?.cible_atteinte === true
  const necessaire = enCours && !atteinte ? (rythme?.necessaire ?? null) : null
  const reel = enCours ? (rythme?.reel ?? null) : null
  const pente = phrasePente(o, rythme, chargement)
  const ecart = phraseEcart(o, rythme)

  return (
    <section className={styles.fiche} aria-label={principal ? 'Objectif principal' : 'Objectif'}>
      <p className={styles.etiquette}>
        {principal ? 'Objectif principal' : 'Objectif'} · {o.type === 'competition' ? 'compétition' : 'max'}
      </p>
      <h2 className={styles.titre}>{o.titre}</h2>
      <p className={styles.cible}>
        <span>cible</span> <strong>+{nombre(o.valeur_cible_kg)} kg</strong>
      </p>
      {etat && (
        <div className={styles.statut}>
          <Badge statut={etat} />
        </div>
      )}

      <div className={styles.heros}>
        {necessaire !== null && reel !== null ? (
          <>
            <p className={styles.pentes}>
              <span className={styles.pente}>
                <span className={styles.legende}>il faut</span>
                <strong>{signe(necessaire)}</strong>
                <span className={styles.unite}>kg/sem</span>
              </span>
              <span className={styles.pente} data-retard={etat === 'retard' || undefined}>
                <span className={styles.legende}>tu fais</span>
                <strong>{signe(reel)}</strong>
                <span className={styles.unite}>kg/sem</span>
              </span>
            </p>
            {ecart && <p className={styles.ecart}>{ecart}</p>}
          </>
        ) : (
          pente && <p className={styles.sansPente}>{pente}</p>
        )}
      </div>

      <p className={styles.progres}>
        <strong>{o.progression ? `${Math.round(avancement(o) * 100)} %` : '—'}</strong>
        <span>
          {o.progression ? signe(o.progression.e1rm_lest_kg, 1) : '—'} / {nombre(o.valeur_cible_kg)} kg
        </span>
        {enCours && (
          <span>
            {echeance(o.jours_restants)}
            {o.jours_restants > 0 && ` · ${semaines(o.jours_restants)}`}
          </span>
        )}
      </p>

      <dl className={styles.faits}>
        <div>
          <dt>Mouvement</dt>
          <dd>{o.exercice}</dd>
        </div>
        <div>
          <dt>Cible</dt>
          <dd>+{nombre(o.valeur_cible_kg)} kg de lest</dd>
        </div>
        <div>
          <dt>Échéance</dt>
          <dd>
            {dateLongue(o.date_cible)}
            {enCours && (
              <>
                {' '}
                · <strong>{echeance(o.jours_restants)}</strong>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>1RM estimé</dt>
          <dd>
            {o.progression
              ? `+${nombre(o.progression.e1rm_lest_kg)} kg (le ${dateCourte(o.progression.le)})`
              : 'pas encore estimé : saisis des séances avec RPE'}
          </dd>
        </div>
      </dl>

      <Courbe objectif={o} points={points} rythme={rythme} aujourdhui={aujourdhui} />

      <div className={styles.blocs}>
        <span className={styles.etiquette}>Blocs</span>
        {o.blocs.length ? (
          o.blocs.map((b) => (
            <Link key={b.id} to="/streetlifting/blocs" className={styles.puce}>
              {b.nom}
            </Link>
          ))
        ) : (
          <Link to="/streetlifting/blocs" className={styles.lien}>
            Aucun bloc lié · Rattacher un bloc →
          </Link>
        )}
      </div>

      <div className={styles.actions}>
        {enCours ? (
          <>
            <button type="button" className={commun.plein} onClick={() => changerStatut(o, 'atteint')}>
              Marquer atteint
            </button>
            <button type="button" className={commun.bouton} onClick={() => changerStatut(o, 'abandonne')}>
              Abandonner
            </button>
            {!principal && (
              <>
                <button type="button" className={commun.bouton} onClick={() => mettreEnAvant(o)}>
                  Mettre en avant
                </button>
                <button type="button" className={commun.discret} onClick={() => supprimer(o)}>
                  Supprimer
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button type="button" className={commun.bouton} onClick={() => changerStatut(o, 'en_cours')}>
              Reprendre
            </button>
            <button type="button" className={commun.discret} onClick={() => supprimer(o)}>
              Supprimer
            </button>
          </>
        )}
      </div>
    </section>
  )
}
