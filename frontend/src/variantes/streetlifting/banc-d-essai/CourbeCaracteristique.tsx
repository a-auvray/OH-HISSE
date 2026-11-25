import { type KeyboardEvent, type PointerEvent, useId, useState } from 'react'

import { nombre } from '../../../commun/format'
import { useLargeur } from '../../../commun/useLargeur'
import styles from './CourbeCaracteristique.module.css'
import { chargeSurCourbe, lectureCourbe, miseEnPageCourbe, type PointDeSerie } from './modele'
import { useTraceDuJour } from './trace'

interface Props {
  /** Nom de l'exercice, pour la légende. */
  exercice: string
  /** Le 1RM estimé sur la charge totale : le sommet de la courbe. */
  e1rmTotal: number
  /** Le 1RM en lest, tel qu'on le lit partout ailleurs dans l'application. */
  e1rmLest: number
  /** Les séries prévues, déjà regroupées. */
  series: readonly PointDeSerie[]
  /** La charge totale de la limite visée, et sa valeur en lest, s'il y a un objectif. */
  limiteVisee: { charge: number; lest: number } | null
  /** Nom du drapeau « tracé aujourd'hui » : un par vue, pour que chacune se trace une fois. */
  nomTrace: string
}

const LARGEUR_PAR_DEFAUT = 640

/**
 * La courbe caractéristique de l'éprouvette : la table RPE ajustée sur le 1RM de l'exercice.
 * Chaque série prévue est un point (contour : prévue), la courbe monte jusqu'à sa limite à une
 * répétition, et une ligne pointillée marque la limite visée. Le décor est en SVG masqué
 * aux lecteurs d'écran ; la lecture (limite, reste à tirer, point survolé) est aussi en texte.
 */
export function CourbeCaracteristique({
  exercice,
  e1rmTotal,
  e1rmLest,
  series,
  limiteVisee,
  nomTrace,
}: Props) {
  const [cadre, mesure] = useLargeur<HTMLDivElement>()
  const largeur = mesure > 0 ? mesure : LARGEUR_PAR_DEFAUT
  const hauteur = largeur < 480 ? 300 : 360
  const tracer = useTraceDuJour(nomTrace)
  const idLecture = useId()
  const [effortLu, setEffortLu] = useState<number | null>(null)
  // La lecture n'est annoncée aux lecteurs d'écran que si l'on pilote la courbe au clavier.
  const [clavier, setClavier] = useState(false)

  const m = miseEnPageCourbe({
    largeur,
    hauteur,
    e1rmTotal,
    points: series.map((s) => ({ effort: s.effort, charge: s.charge })),
    limiteVisee: limiteVisee?.charge ?? null,
  })

  const lu = effortLu === null ? null : chargeSurCourbe(e1rmTotal, effortLu)
  const serieLue = effortLu === null ? undefined : series.find((s) => Math.abs(s.effort - effortLu) < 0.26)
  const lecture =
    effortLu !== null && lu !== null
      ? lectureCourbe(effortLu, serieLue?.charge ?? lu, serieLue)
      : `Limite : +${nombre(e1rmLest)} kg en lest (${nombre(Math.round(e1rmTotal * 10) / 10)} kg au total).`

  function survoler(evenement: PointerEvent<HTMLDivElement>) {
    const cadreSvg = evenement.currentTarget.getBoundingClientRect()
    setClavier(false)
    setEffortLu(m.effortA(evenement.clientX - cadreSvg.left))
  }

  function auClavier(evenement: KeyboardEvent<HTMLDivElement>) {
    const pas = evenement.key === 'ArrowLeft' ? 0.5 : evenement.key === 'ArrowRight' ? -0.5 : 0
    if (pas === 0) {
      if (evenement.key === 'Escape') setEffortLu(null)
      return
    }
    evenement.preventDefault()
    setClavier(true)
    setEffortLu((courant) => Math.min(m.effortMax, Math.max(1, (courant ?? m.effortMax) + pas)))
  }

  return (
    <figure className={styles.courbe}>
      <figcaption className={styles.legende}>
        <span className={styles.reserve}>Courbe caractéristique · {exercice}</span>
      </figcaption>
      <div
        ref={cadre}
        className={styles.zone}
        tabIndex={0}
        role="group"
        aria-label={`Courbe caractéristique de ${exercice}. Flèches gauche et droite pour lire une valeur.`}
        aria-describedby={idLecture}
        onPointerMove={survoler}
        onPointerLeave={() => setEffortLu(null)}
        onKeyDown={auClavier}
        onBlur={() => setEffortLu(null)}
      >
        <svg width={largeur} height={hauteur} viewBox={`0 0 ${largeur} ${hauteur}`} aria-hidden="true">
          <g className={styles.grille}>
            {m.graduationsY.map((v) => (
              <g key={v}>
                <line x1={m.marges.gauche} x2={m.marges.gauche + m.zone.largeur} y1={m.y(v)} y2={m.y(v)} />
                <text
                  className={styles.chiffre}
                  x={m.marges.gauche - 8}
                  y={m.y(v)}
                  textAnchor="end"
                  dy="0.32em"
                >
                  {nombre(v)}
                </text>
              </g>
            ))}
            {m.graduationsX.map((v) => (
              <text
                key={v}
                className={styles.chiffre}
                x={m.x(v)}
                y={m.marges.haut + m.zone.hauteur + 20}
                textAnchor="middle"
              >
                {v}
              </text>
            ))}
          </g>
          <line
            className={styles.axe}
            x1={m.marges.gauche}
            x2={m.marges.gauche + m.zone.largeur}
            y1={m.marges.haut + m.zone.hauteur}
            y2={m.marges.haut + m.zone.hauteur}
          />
          <text
            className={styles.titreAxe}
            x={m.marges.gauche + m.zone.largeur / 2}
            y={hauteur - 8}
            textAnchor="middle"
          >
            EFFORT ÉQUIVALENT (reps + RIR)
          </text>
          <text
            className={styles.titreAxe}
            transform={`translate(14 ${m.marges.haut + m.zone.hauteur / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            CHARGE TOTALE (kg)
          </text>

          {limiteVisee && (
            <g className={styles.visee}>
              <line
                x1={m.marges.gauche}
                x2={m.marges.gauche + m.zone.largeur}
                y1={m.y(limiteVisee.charge)}
                y2={m.y(limiteVisee.charge)}
              />
              <text x={m.marges.gauche + 8} y={m.y(limiteVisee.charge) - 8}>
                LIMITE VISÉE +{nombre(limiteVisee.lest)} kg
              </text>
            </g>
          )}

          <path
            className={styles.plume}
            d={m.chemin}
            pathLength={1}
            data-trace={tracer || undefined}
            fill="none"
          />

          {series.map((s) => (
            <g key={`${s.effort}-${s.charge}`} className={styles.serie}>
              <circle cx={m.x(s.effort)} cy={m.y(s.charge)} r={6} />
              {s.nombre > 1 && (
                <text x={m.x(s.effort) + 10} y={m.y(s.charge) - 8}>
                  ×{s.nombre}
                </text>
              )}
            </g>
          ))}

          <g className={styles.limite}>
            <circle cx={m.limite.x} cy={m.limite.y} r={7} />
            <text x={m.limite.x - 12} y={m.limite.y - 14} textAnchor="end">
              +{nombre(e1rmLest)} kg
            </text>
          </g>

          {effortLu !== null && (
            <line
              className={styles.repere}
              x1={m.x(effortLu)}
              x2={m.x(effortLu)}
              y1={m.marges.haut}
              y2={m.marges.haut + m.zone.hauteur}
            />
          )}
        </svg>
      </div>
      <p id={idLecture} className={styles.lecture} aria-live={clavier ? 'polite' : 'off'}>
        {lecture}
      </p>
    </figure>
  )
}
