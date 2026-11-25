import { type KeyboardEvent, type PointerEvent, useId, useState } from 'react'

import { dateCourte, nombre } from '../../../commun/format'
import { useLargeur } from '../../../commun/useLargeur'
import type { Point } from '../../../espaces/streetlifting/chronologie'
import styles from './GraphiqueSerie.module.css'
import { indexLePlusProche, miseEnPageSerie } from './modele'
import { useTraceDuJour } from './trace'

interface Props {
  points: readonly Point[]
  unite: string
  libelle: string
  /** Des barres graphite (tonnage) plutôt qu'un trait. */
  barres: boolean
  /** Le RPE moyen de chaque date, imprimé au-dessus des barres. */
  rpeParDate?: ReadonlyMap<string, number>
  nomTrace: string
}

const LARGEUR_PAR_DEFAUT = 720

/**
 * Une grandeur dans le temps, à la façon d'un procès-verbal : des barres pleines pour le tonnage
 * (avec le RPE moyen en chiffre au-dessus), un trait de plume et des points pour le reste.
 * Un repère vertical s'aimante aux mesures, à la souris comme au clavier ; la même lecture est
 * donnée en texte, et le tableau des valeurs est lisible par les lecteurs d'écran.
 */
export function GraphiqueSerie({ points, unite, libelle, barres, rpeParDate, nomTrace }: Props) {
  const [cadre, mesure] = useLargeur<HTMLDivElement>()
  const largeur = mesure > 0 ? mesure : LARGEUR_PAR_DEFAUT
  const hauteur = largeur < 480 ? 280 : 340
  const tracer = useTraceDuJour(nomTrace)
  const idLecture = useId()
  const [lu, setLu] = useState<number | null>(null)
  const [clavier, setClavier] = useState(false)

  const m = miseEnPageSerie({ largeur, hauteur, points, barres })
  const base = m.marges.haut + m.zone.hauteur
  const courant = lu === null ? undefined : m.elements[lu]
  const lecture = courant
    ? `${dateCourte(courant.point.date)} · ${nombre(courant.point.valeur)} ${unite}${
        courant.point.seances > 1 ? ` · ${courant.point.seances} séances` : ''
      }`
    : `${points.length} mesure${points.length > 1 ? 's' : ''}. Flèches gauche et droite pour lire une valeur.`

  function survoler(evenement: PointerEvent<HTMLDivElement>) {
    const boite = evenement.currentTarget.getBoundingClientRect()
    setClavier(false)
    setLu(indexLePlusProche(m.elements, evenement.clientX - boite.left))
  }

  function auClavier(evenement: KeyboardEvent<HTMLDivElement>) {
    if (evenement.key === 'Escape') return setLu(null)
    const pas = evenement.key === 'ArrowLeft' ? -1 : evenement.key === 'ArrowRight' ? 1 : 0
    if (pas === 0) return
    evenement.preventDefault()
    setClavier(true)
    setLu((i) => Math.min(points.length - 1, Math.max(0, (i ?? (pas > 0 ? -1 : points.length)) + pas)))
  }

  const trace = m.elements
    .map((el, i) => `${i === 0 ? 'M' : 'L'}${el.x.toFixed(1)},${el.y.toFixed(1)}`)
    .join(' ')

  return (
    <figure className={styles.graphique}>
      <figcaption className={styles.legende}>
        <span className={styles.reserve}>
          {libelle} · {unite}
        </span>
      </figcaption>
      <div
        ref={cadre}
        className={styles.zone}
        tabIndex={0}
        role="group"
        aria-label={`${libelle} dans le temps. Flèches gauche et droite pour lire une valeur.`}
        aria-describedby={idLecture}
        onPointerMove={survoler}
        onPointerLeave={() => setLu(null)}
        onKeyDown={auClavier}
        onBlur={() => setLu(null)}
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
            {m.reperesX.map((r) => (
              <text key={r.date} className={styles.chiffre} x={r.x} y={base + 22} textAnchor="middle">
                {dateCourte(r.date)}
              </text>
            ))}
          </g>
          <line
            className={styles.axe}
            x1={m.marges.gauche}
            x2={m.marges.gauche + m.zone.largeur}
            y1={base}
            y2={base}
          />

          {barres ? (
            m.elements.map((el, i) => (
              <g key={el.point.date} className={styles.barre} data-lu={lu === i || undefined}>
                <rect
                  x={el.x - m.largeurBarre / 2}
                  y={el.y}
                  width={m.largeurBarre}
                  height={Math.max(0, base - el.y)}
                />
                {rpeParDate?.get(el.point.date) !== undefined && (
                  <text x={el.x} y={el.y - 8} textAnchor="middle">
                    {nombre(rpeParDate.get(el.point.date) ?? 0)}
                  </text>
                )}
              </g>
            ))
          ) : (
            <>
              <path
                className={styles.plume}
                d={trace}
                pathLength={1}
                data-trace={tracer || undefined}
                fill="none"
              />
              {m.elements.map((el, i) => (
                <circle
                  key={el.point.date}
                  className={styles.point}
                  data-lu={lu === i || undefined}
                  cx={el.x}
                  cy={el.y}
                  r={lu === i ? 7 : 5}
                />
              ))}
            </>
          )}

          {courant && (
            <line className={styles.repere} x1={courant.x} x2={courant.x} y1={m.marges.haut} y2={base} />
          )}
        </svg>
      </div>
      <p id={idLecture} className={styles.lecture} aria-live={clavier ? 'polite' : 'off'}>
        {lecture}
      </p>
      <table className="sr-only">
        <caption>
          {libelle}, en {unite}
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Valeur</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{dateCourte(p.date)}</th>
              <td>
                {nombre(p.valeur)} {unite}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
