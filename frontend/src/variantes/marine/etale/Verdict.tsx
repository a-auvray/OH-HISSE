import { useState } from 'react'

import type { Conditions } from '../../../api/types'
import type { NiveauAnimation } from '../../../themes/types'
import { heureCourte } from '../../../espaces/marine/titre'
import { BadgeEtale } from './BadgeEtale'
import {
  type Lecture,
  type Verdict as DonneesVerdict,
  NOM_DANGER,
  PHRASE_DANGER,
  arrondi,
  jourDe,
  jourLong,
  phraseBascule,
  phraseDurees,
} from './lecture'
import { type Creneau, type Durees } from './hooks'
import { basculeDanger, estDeNuit, souplesse, souplesseRetenue } from './modele'
import styles from './Verdict.module.css'

interface Props {
  conditions: Conditions
  lecture: Lecture
  rang: number
  verdict: DonneesVerdict
  creneau: Creneau | null
  durees: Durees | null
  animation: NiveauAnimation
}

/**
 * Le verdict, dans l'air au-dessus de la dune : la réponse en une phrase, le créneau en grand, les durées,
 * puis le niveau de danger de l'heure choisie avec sa raison écrite en entier.
 * « Galet » : le titre s'émousse avec la houle (axe SOFT de la police, quand elle en a un). La valeur ne change
 * que si la donnée change, d'au moins 2 unités, et seulement en mode Cinéma.
 */
export function Verdict({ conditions, lecture, rang, verdict, creneau, durees, animation }: Props) {
  const cible = animation === 'cinema' ? souplesse(lecture.vaguesM) : 0
  const [soft, setSoft] = useState(cible)
  // Une valeur dérivée : on la réécrit pendant le rendu seulement si l'écart dépasse 2 unités.
  const retenue = souplesseRetenue(soft, cible)
  if (retenue !== soft) setSoft(retenue)

  const heures = conditions.heures
  const instantMs = new Date(lecture.instant).getTime()
  const nuit = estDeNuit(conditions.soleil, instantMs)
  const bascule = basculeDanger(heures, rang)
  const raisons = lecture.surMaintenant ? conditions.danger.raisons : []
  const ligneBascule = phraseBascule(conditions, rang)
  const autreJour = creneau && jourDe(creneau.debut) !== jourDe(conditions.maintenant.instant)
  const ligneDurees = phraseDurees(durees, lecture.eauC)

  return (
    <header className={styles.verdict} data-niveau={lecture.danger}>
      <p className={styles.surtitre}>
        {conditions.spot.nom} · {jourLong(lecture.instant)} ·{' '}
        {lecture.surMaintenant
          ? `à ${heureCourte(lecture.instant)}`
          : `prévision de ${heureCourte(lecture.instant)}`}
        {nuit && <span className={styles.nuit}> · nuit</span>}
        {conditions.perimees && ' · données en cache'}
      </p>

      <h2
        className={styles.titre}
        style={{ fontVariationSettings: `"SOFT" ${soft}, "WONK" 0` }}
        data-souplesse={soft}
      >
        {verdict.titre}
      </h2>

      {creneau && (
        <p
          className={styles.creneau}
          aria-label={`Créneau conseillé de ${heureCourte(creneau.debut)} à ${heureCourte(creneau.fin)}`}
        >
          <span className={styles.heros}>
            {heureCourte(creneau.debut)} <span aria-hidden="true">→</span> {heureCourte(creneau.fin)}
          </span>
          {autreJour && <span className={styles.jour}>{jourLong(creneau.debut)}</span>}
        </p>
      )}

      {ligneDurees && <p className={styles.durees}>{ligneDurees}</p>}
      {verdict.etale && (
        <p className={styles.etale}>
          étale vers {heureCourte(verdict.etale.instant)} : le courant tombe à{' '}
          {arrondi(verdict.etale.courant_kmh, 1)} km/h
        </p>
      )}
      <p className={styles.detail}>{verdict.detail}</p>

      <div
        className={styles.danger}
        role="group"
        aria-label={`Danger ${NOM_DANGER[lecture.danger]} à ${heureCourte(lecture.instant)}`}
      >
        <BadgeEtale niveau={lecture.danger} />
        <div className={styles.texte}>
          <p className={styles.niveau}>
            <strong>{NOM_DANGER[lecture.danger]}</strong>
            {bascule ? ` · jusqu’à ${heureCourte(bascule.heure.instant)}` : ' · sur toute la prévision'}
          </p>
          <p className={styles.phrase}>{PHRASE_DANGER[lecture.danger]}</p>
          {raisons.length > 0 && (
            <ul className={styles.raisons}>
              {raisons.map((r) => (
                <li key={r.texte} data-niveau={r.niveau}>
                  {r.texte}
                </li>
              ))}
            </ul>
          )}
          {ligneBascule && <p className={styles.bascule}>{ligneBascule}</p>}
        </div>
      </div>
    </header>
  )
}
