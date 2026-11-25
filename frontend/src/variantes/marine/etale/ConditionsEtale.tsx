import { useMemo, useState } from 'react'

import type { Conditions } from '../../../api/types'
import { nombre } from '../../../commun/format'
import { jourCourt } from '../../../espaces/marine/lecture'
import { heureCourte } from '../../../espaces/marine/titre'
import { Coupe } from './Coupe'
import styles from './ConditionsEtale.module.css'
import { Frise } from './Frise'
import { useAssistantEtale, useNiveauAnimation } from './hooks'
import {
  annonce,
  arrondi,
  distanceChoisie,
  indexJour,
  joursDesHeures,
  lectureA,
  nomDeJour,
  phraseDistance,
  phraseVent,
  rangPourJour,
  verdict as calculerVerdict,
} from './lecture'
import { Releves } from './Releves'
import { TableauHeures } from './TableauHeures'
import { Verdict } from './Verdict'
import {
  type Heure,
  courantVersEst,
  distanceA,
  estDeNuit,
  pleineMerSuivante,
  profilEstran,
  sableMouille,
  tendanceA,
  ventVersLarge,
} from './modele'

const TENDANCE = {
  montante: 'la mer monte · flot',
  descendante: 'la mer descend · jusant',
  etale: 'étale',
} as const

interface Props {
  conditions: Conditions
  spotId: number | null
}

/**
 * Les conditions de la mer, en coupe : la plage vue de profil (dune à gauche, large à droite), le niveau d'eau
 * de l'heure choisie, la distance à marcher, puis les relevés et la frise des heures, seul plan où l'axe est le temps.
 * Le verdict (« Vas-y à l'étale. ») est lu dans l'air au-dessus de la dune. Tout suit le curseur de la frise.
 * Toutes les fonctions de la page commune sont là : danger et raisons, hauteur et tendance de la marée, distance
 * à l'eau, instruments, ciel, soleil, prévisions heure par heure, source et mention des données en cache.
 */
export function ConditionsEtale({ conditions, spotId }: Props) {
  const animation = useNiveauAnimation()
  const { creneau, durees } = useAssistantEtale(spotId)
  const heures = conditions.heures

  // Le curseur est propre à la plage : en changeant de plage, on repart de « maintenant ».
  const [choix, setChoix] = useState({ spot: conditions.spot.id, rang: 0 })
  const rang = choix.spot === conditions.spot.id ? Math.min(choix.rang, Math.max(0, heures.length - 1)) : 0
  const placer = (r: number) =>
    setChoix({ spot: conditions.spot.id, rang: Math.max(0, Math.min(heures.length - 1, r)) })

  const profil = useMemo(() => profilEstran(heures), [heures])
  const niveaux = useMemo(
    () => [
      ...heures.flatMap((h) => (typeof h.hauteur_eau_m === 'number' ? [h.hauteur_eau_m] : [])),
      ...conditions.marees.map((m) => m.hauteur_m),
    ],
    [heures, conditions.marees],
  )

  const lecture = lectureA(conditions, rang)
  const instantMs = new Date(lecture.instant).getTime()
  const distance = distanceChoisie(lecture, profil)
  const mouille = sableMouille(heures, rang)
  const nuit = estDeNuit(conditions.soleil, instantMs)
  const verdict = calculerVerdict(conditions, creneau)

  // Le trait d'eau fantôme : la prochaine pleine mer, où l'eau montera le plus haut. On ne le montre que s'il diffère de l'eau actuelle.
  const pleine = pleineMerSuivante(conditions.marees, instantMs)
  const fantome =
    pleine && profil && lecture.hauteurM !== null && Math.abs(pleine.hauteur_m - lecture.hauteurM) > 0.15
      ? {
          hauteurM: pleine.hauteur_m,
          distanceM: distanceA(profil, pleine.hauteur_m),
          heure: heureCourte(pleine.instant),
        }
      : null

  const ventLarge =
    lecture.ventKmh !== null && lecture.ventDeg !== null ? ventVersLarge(lecture.ventKmh, lecture.ventDeg) : 0
  const courantEst =
    lecture.courantKmh !== null && lecture.courantDeg !== null
      ? courantVersEst(lecture.courantKmh, lecture.courantDeg)
      : null
  const libelleVent = phraseVent(lecture.ventKmh, lecture.ventDeg)

  const jours = joursDesHeures(heures)
  const jourActuel = indexJour(heures, rang)
  const allerAuJour = (index: number) => placer(rangPourJour(heures, index, rang))
  const pasDeJour = (sens: -1 | 1) => {
    const cible = jourActuel + sens
    if (cible >= 0 && cible < jours.length) allerAuJour(cible)
  }

  const phraseAnnonce = annonce(lecture, distance)
  const tendance = tendanceA(heures as readonly Heure[], rang) ?? conditions.maintenant.tendance
  const resume = [
    `Coupe de la plage de ${conditions.spot.nom} à ${heureCourte(lecture.instant)}`,
    lecture.hauteurM !== null ? `eau à ${arrondi(lecture.hauteurM, 1)} m` : null,
    distance !== null ? phraseDistance(distance) : null,
    `danger ${lecture.danger}`,
  ]
    .filter(Boolean)
    .join(', ')

  if (heures.length === 0) {
    return (
      <div className={styles.page}>
        <Verdict
          conditions={conditions}
          lecture={lecture}
          rang={0}
          verdict={verdict}
          creneau={creneau}
          durees={durees}
          animation={animation}
        />
        <p className={styles.vide} role="status">
          Aucune prévision heure par heure pour cette plage : la coupe et la frise ne peuvent pas être
          tracées.
        </p>
        <Releves conditions={conditions} lecture={lecture} rang={0} />
        <p className={styles.source}>{conditions.source}</p>
      </div>
    )
  }

  return (
    <div className={styles.page} data-nuit={nuit || undefined} data-niveau={lecture.danger}>
      <Verdict
        conditions={conditions}
        lecture={lecture}
        rang={rang}
        verdict={verdict}
        creneau={creneau}
        durees={durees}
        animation={animation}
      />

      <figure className={styles.coupe}>
        <Coupe
          profil={profil}
          niveaux={niveaux}
          hauteurM={lecture.hauteurM}
          distanceM={distance}
          mouille={mouille}
          fantome={fantome}
          vaguesM={lecture.vaguesM}
          periodeS={lecture.periodeS}
          ventVersLargeKmh={ventLarge}
          courantEstKmh={courantEst}
          danger={lecture.danger}
          nuit={nuit}
          libelleVent={libelleVent}
          resume={resume}
        />
        <figcaption className={styles.legende}>
          {lecture.hauteurM !== null && (
            <strong>{nombre(Number(lecture.hauteurM.toFixed(1)))} m d’eau</strong>
          )}
          {tendance && <span>{TENDANCE[tendance]}</span>}
          {distance !== null && <span>{phraseDistance(distance)}</span>}
          <span>
            {lecture.surMaintenant
              ? 'maintenant'
              : `${jourCourt(lecture.instant)} à ${heureCourte(lecture.instant)}`}
          </span>
        </figcaption>
      </figure>

      <Releves conditions={conditions} lecture={lecture} rang={rang} />

      <section className={styles.temps} aria-label="Frise des heures">
        <div className={styles.commandes}>
          <div className={styles.jours} role="group" aria-label="Jour de la prévision">
            {jours.map((j, i) => (
              <button
                key={j.jour}
                type="button"
                onClick={() => allerAuJour(i)}
                aria-pressed={i === jourActuel}
                aria-label={`${nomDeJour(i)}, ${jourCourt(j.instant)}`}
                title={jourCourt(j.instant)}
              >
                {nomDeJour(i)}
              </button>
            ))}
          </div>
          <button type="button" className={styles.maintenant} onClick={() => placer(0)} disabled={rang === 0}>
            Revenir à maintenant
          </button>
          <p className={styles.aide}>
            Flèches : une heure · Maj + flèches : six heures · <kbd>N</kbd> maintenant · <kbd>[</kbd>{' '}
            <kbd>]</kbd> jour
          </p>
        </div>
        <Frise
          heures={heures}
          marees={conditions.marees}
          soleil={conditions.soleil}
          maintenant={new Date(conditions.maintenant.instant).getTime()}
          creneau={creneau}
          rang={rang}
          onRang={placer}
          onJour={pasDeJour}
          etale={
            verdict.etale ? { instant: verdict.etale.instant, courantKmh: verdict.etale.courant_kmh } : null
          }
          texteValeur={phraseAnnonce}
        />
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {phraseAnnonce}
        </p>
        <TableauHeures heures={heures} rang={rang} onRang={placer} />
      </section>

      <p className={styles.source}>
        {conditions.perimees && <strong>Données en cache : Open-Meteo ne répond pas. </strong>}
        {conditions.source}. Horaires de marée arrondis : estimation, pas un document de navigation.
      </p>
    </div>
  )
}
