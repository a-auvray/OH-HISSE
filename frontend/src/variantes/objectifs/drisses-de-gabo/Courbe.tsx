import type { ObjectifLu, PointEvolution } from '../../../api/types'
import { nombre } from '../../../commun/format'
import styles from './Courbe.module.css'
import { geometrieCourbe, type Rythme } from './modele'

const L = 320
const H = 120

const tracer = (points: readonly (readonly [number, number])[]) =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')

interface Props {
  objectif: ObjectifLu
  points: readonly PointEvolution[]
  rythme: Rythme | null
  aujourdhui: string
}

/**
 * L'historique de l'e1RM : le temps en x, le lest en y, et son bord droit est la drisse, posée au jour de
 * l'échéance, si bien que la courbe monte vers le mât. Deux segments partent du point actuel : la trajectoire
 * nécessaire, tendue et droite, et la tendance réelle, en pointillé. Axes réduits à deux graduations.
 * Dessin décoratif : tout ce qu'il dit est aussi écrit dans la fiche.
 */
export function Courbe({ objectif, points, rythme, aujourdhui }: Props) {
  const g = geometrieCourbe(objectif, points, rythme, aujourdhui, L, H)
  if (!g) return null
  const [xCible, yCible] = g.cible

  return (
    <figure className={styles.courbe}>
      <svg viewBox={`0 0 ${L} ${H}`} aria-hidden="true">
        <line className={styles.axe} x1="0" x2={L} y1={g.base} y2={g.base} />
        <line className={styles.drisse} x1={xCible} x2={xCible} y1={g.base} y2={yCible} />
        <line className={styles.axe} x1="0" x2={xCible} y1={yCible} y2={yCible} />
        {g.necessaire && <path className={styles.necessaire} d={tracer(g.necessaire)} />}
        {g.tendance && <path className={styles.tendance} d={tracer(g.tendance)} />}
        <path className={styles.historique} d={tracer(g.historique)} />
        {g.actuel && <circle className={styles.point} cx={g.actuel[0]} cy={g.actuel[1]} r="3" />}
        <text className={styles.graduation} x="0" y={g.base - 4}>
          0 kg
        </text>
        <text className={styles.graduation} x="0" y={yCible - 4}>
          +{nombre(objectif.valeur_cible_kg)} kg
        </text>
      </svg>
      <figcaption>Ton e1RM séance après séance, jusqu’à l’échéance.</figcaption>
    </figure>
  )
}
