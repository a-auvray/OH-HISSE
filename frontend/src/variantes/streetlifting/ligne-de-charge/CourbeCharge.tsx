import { type KeyboardEvent, type PointerEvent, useId } from 'react'

import { dateCourte, nombre } from '../../../commun/format'
import styles from './CourbeCharge.module.css'
import {
  geometrieCourbe,
  MARGES_COURBE as MARGES,
  type PointCourbe,
  pointLePlusProche,
  reperesDates,
} from './modele'

interface Props {
  points: readonly PointCourbe[]
  largeur: number
  hauteur: number
  unite: string
  libelle: string
  /** Le point lu (survolé ou choisi au clavier), ou null. */
  actif: number | null
  onActif: (indice: number | null) => void
}

/**
 * La courbe d'évolution, tracée comme sur un banc d'essai : un filet continu, un repère carré à chaque
 * séance, la dernière en couleur d'accent, un fil vertical sous le doigt. Le tracé est décoratif pour
 * les lecteurs d'écran : un tableau caché porte les mêmes valeurs, et la lecture du point actif est
 * annoncée par la page. Les flèches ← → Début Fin parcourent les points au clavier.
 */
export function CourbeCharge({ points, largeur, hauteur, unite, libelle, actif, onActif }: Props) {
  const degrade = `degrade${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const l = Math.max(0, largeur - MARGES.gauche - MARGES.droite)
  const h = Math.max(0, hauteur - MARGES.haut - MARGES.bas)
  const g = geometrieCourbe(points, l, h)
  const dernier = points.length - 1

  const chemin = g.xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${(g.ys[i] ?? 0).toFixed(1)}`)
    .join(' ')
  const aire = g.xs.length
    ? `${chemin} L${(g.xs[dernier] ?? 0).toFixed(1)},${g.base} L${(g.xs[0] ?? 0).toFixed(1)},${g.base} Z`
    : ''

  function suivre(evenement: PointerEvent<SVGRectElement>) {
    const cadre = evenement.currentTarget.getBoundingClientRect()
    onActif(pointLePlusProche(g.xs, evenement.clientX - cadre.left))
  }

  function auClavier(evenement: KeyboardEvent<HTMLDivElement>) {
    const courant = actif ?? dernier
    const cibles: Record<string, number | null> = {
      ArrowLeft: Math.max(0, courant - 1),
      ArrowRight: Math.min(dernier, courant + 1),
      Home: 0,
      End: dernier,
      Escape: null,
    }
    if (!(evenement.key in cibles)) return
    evenement.preventDefault()
    onActif(cibles[evenement.key] ?? null)
  }

  const reperes = reperesDates(points.length)

  return (
    <div
      className={styles.courbe}
      role="group"
      aria-label={`Courbe : ${libelle}. Les flèches gauche et droite parcourent les points.`}
      tabIndex={0}
      onKeyDown={auClavier}
      onBlur={() => onActif(null)}
    >
      <svg
        width={largeur}
        height={hauteur}
        viewBox={`0 0 ${largeur} ${hauteur}`}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={degrade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0.12 }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <g transform={`translate(${MARGES.gauche} ${MARGES.haut})`}>
          {g.graduations.map((t) => (
            <g key={t.valeur}>
              <line className={styles.grille} x1={0} x2={l} y1={t.y} y2={t.y} />
              <text className={styles.graduation} x={-10} y={t.y} textAnchor="end" dominantBaseline="middle">
                {nombre(t.valeur)}
              </text>
            </g>
          ))}
          {aire && <path className={styles.aire} d={aire} fill={`url(#${degrade})`} />}
          <path className={styles.trace} d={chemin} pathLength={1} />
          {g.xs.map((x, i) => {
            const taille = i === dernier ? 8 : 4
            return (
              <rect
                key={points[i]?.date}
                className={styles.repere}
                data-dernier={i === dernier || undefined}
                data-actif={i === actif || undefined}
                x={x - taille / 2}
                y={(g.ys[i] ?? 0) - taille / 2}
                width={taille}
                height={taille}
              />
            )
          })}
          {actif !== null && g.xs[actif] !== undefined && (
            <line className={styles.fil} x1={g.xs[actif]} x2={g.xs[actif]} y1={0} y2={h} />
          )}
          {reperes.map((i) => (
            <text
              key={points[i]?.date}
              className={styles.graduation}
              x={g.xs[i] ?? 0}
              y={h + 22}
              textAnchor={
                i === 0 && points.length > 1 ? 'start' : i === dernier && points.length > 1 ? 'end' : 'middle'
              }
            >
              {dateCourte(points[i]?.date ?? '')}
            </text>
          ))}
          <rect
            className={styles.zone}
            width={l}
            height={h}
            onPointerMove={suivre}
            onPointerLeave={() => onActif(null)}
          />
        </g>
      </svg>

      <table className="sr-only">
        <caption>
          {libelle} ({unite})
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Valeur</th>
            <th scope="col">Séances</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{dateCourte(p.date)}</th>
              <td>{nombre(p.valeur)}</td>
              <td>{p.seances}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
