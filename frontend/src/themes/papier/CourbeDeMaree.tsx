import { useId } from 'react'

import type { DonneesBriefing } from '../../accueil/useBriefing'
import { cheminLisse, echelle } from './courbe'
import styles from './CourbeDeMaree.module.css'

type Mer = NonNullable<DonneesBriefing['mer']>

const HEURE = 3_600_000
const LARGEUR = 400
const HAUTEUR_COURBE = 70
const BANDE_Y = 84

const hhmm = (d: Date) => `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`

/**
 * La marée des prochaines heures, avec le danger heure par heure sous la
 * courbe : on voit d'un coup d'œil quand la mer se ferme.
 */
export function CourbeDeMaree({ mer, maintenant }: { mer: Mer; maintenant: Date }) {
  const titre = useId()
  const debut = maintenant.getTime() - 3 * HEURE
  const fin = maintenant.getTime() + 21 * HEURE

  const heures = mer.heures
    .map((h) => ({ t: new Date(h.instant).getTime(), hauteur: h.hauteur_eau_m, danger: h.danger }))
    .filter((h) => h.t >= debut && h.t <= fin)
  const points = heures.flatMap((h) => (h.hauteur == null ? [] : [{ t: h.t, hauteur: h.hauteur }]))
  if (points.length < 3) return null

  const marees = mer.marees
    .map((m) => ({ ...m, t: new Date(m.instant).getTime() }))
    .filter((m) => m.t >= debut && m.t <= fin)
  const hauteurs = [...points.map((p) => p.hauteur), ...marees.map((m) => m.hauteur_m)]
  const min = Math.min(...hauteurs)
  const max = Math.max(...hauteurs)
  const x = (t: number) => echelle(t, debut, fin, 0, LARGEUR)
  const y = (h: number) => echelle(h, min, max, HAUTEUR_COURBE, 14)

  const chemin = cheminLisse(points.map((p) => ({ x: x(p.t), y: y(p.hauteur) })))
  const largeurHeure = LARGEUR / 24

  return (
    <svg className={styles.courbe} viewBox={`0 0 ${LARGEUR} 108`} role="img" aria-labelledby={titre}>
      <title id={titre}>
        Marée des prochaines heures
        {marees.length > 0 &&
          ` : ${marees.map((m) => `${m.type === 'PM' ? 'pleine' : 'basse'} mer à ${hhmm(new Date(m.t))}`).join(', ')}`}
      </title>
      <path d={chemin} className={styles.trait} fill="none" />
      {heures.map((h) => (
        <rect
          key={h.t}
          x={x(h.t) - largeurHeure / 2}
          y={BANDE_Y}
          width={largeurHeure}
          height={7}
          className={styles.bande}
          data-niveau={h.danger}
        />
      ))}
      {marees.map((m) => (
        <g key={m.t} transform={`translate(${x(m.t)} ${y(m.hauteur_m)})`}>
          <circle r={2.6} className={styles.repere} />
          <text y={m.type === 'PM' ? -7 : 14} textAnchor="middle" className={styles.libelle}>
            {m.type} {hhmm(new Date(m.t))}
          </text>
        </g>
      ))}
      <g transform={`translate(${x(maintenant.getTime())} 0)`}>
        <line y1={6} y2={96} className={styles.maintenant} />
        <text y={106} textAnchor="middle" className={styles.libelle}>
          maintenant
        </text>
      </g>
    </svg>
  )
}
