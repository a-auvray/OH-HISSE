import { echeance } from '../../../espaces/objectifs/useObjectifs'
import { Badge } from './Badge'
import styles from './Archives.module.css'
import boutons from './Boutons.module.css'
import type { Planche } from './donnees'
import type { Gestes } from './Fiche'
import { dateCompacte, decimal, numeroPlanche } from './modele'

interface Props {
  /** Les planches atteintes ou abandonnées. */
  planches: readonly Planche[]
  /** Le rang de la première archive dans la liasse (les planches en cours viennent avant). */
  premierRang: number
  gestes: Pick<Gestes, 'changerStatut' | 'supprimer'>
  ouvrir: (id: number) => void
}

/**
 * Les archives : un tiroir dont on voit les tranches, les planches atteintes ou abandonnées
 * empilées. Une planche abandonnée a son titre biffé ; on peut toutes les rouvrir ou les supprimer.
 */
export function Archives({ planches, premierRang, gestes, ouvrir }: Props) {
  if (planches.length === 0) {
    return (
      <p className={styles.vide}>
        Le tiroir est vide : les planches atteintes ou abandonnées viendront s’y ranger.
      </p>
    )
  }

  return (
    <ul className={styles.tiroir} aria-label="Planches archivées">
      {planches.map(({ objectif, analyse: a }, i) => (
        <li key={objectif.id} className={styles.tranche} data-statut={a.statut}>
          <span className={styles.numero}>{numeroPlanche(premierRang + i)}</span>
          <div className={styles.titre}>
            <button type="button" className={styles.titreBouton} onClick={() => ouvrir(objectif.id)}>
              {objectif.titre}
            </button>
            <p className={styles.faits}>
              {objectif.exercice} ·{' '}
              {objectif.progression ? `+${decimal(objectif.progression.e1rm_lest_kg)}` : '—'} /{' '}
              {decimal(objectif.valeur_cible_kg)} kg · échéance {dateCompacte(objectif.date_cible)} ·{' '}
              {echeance(objectif.jours_restants)}
            </p>
          </div>
          <Badge statut={a.statut} />
          <div className={styles.actions}>
            <button
              type="button"
              className={boutons.bouton}
              onClick={() => void gestes.changerStatut(objectif, 'en_cours')}
            >
              Reprendre
            </button>
            <button type="button" className={boutons.discret} onClick={() => void gestes.supprimer(objectif)}>
              Supprimer
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
