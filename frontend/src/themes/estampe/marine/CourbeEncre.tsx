import { useId } from 'react'

import { nombre } from '../../../commun/format'
import { useLargeur } from '../../../commun/useLargeur'
import { heureCourte } from '../../../espaces/marine/titre'
import type { PropsGraphiqueMaree } from '../../ConditionsThemee'

const MARGES = { haut: 26, droite: 16, bas: 28, gauche: 16 }
const HAUTEUR = 250

/**
 * La marée dessinée comme une courbe de marégraphe : un trait d'encre fin, des
 * hachures dessous, les marées extrêmes en petites capitales, et un repère
 * vertical à l'heure choisie.
 */
export function CourbeEncre({ hauteur, heures, marees, instant, danger }: PropsGraphiqueMaree) {
  const [cadre, largeur] = useLargeur<HTMLDivElement>()
  const motif = `hachures${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const points = heures
    .filter((h) => h.hauteur_eau_m !== null && h.hauteur_eau_m !== undefined)
    .map((h) => ({ t: new Date(h.instant).getTime(), v: h.hauteur_eau_m as number }))

  return (
    <div ref={cadre} style={{ width: '100%', height: HAUTEUR }}>
      {largeur > 0 && points.length > 1 && (
        <Trace
          largeur={largeur}
          points={points}
          hauteur={hauteur}
          instant={instant}
          marees={marees}
          motif={motif}
          danger={danger}
        />
      )}
    </div>
  )
}

function Trace({
  largeur,
  points,
  hauteur,
  instant,
  marees,
  motif,
  danger,
}: {
  largeur: number
  points: { t: number; v: number }[]
  hauteur: number
  instant: number
  marees: PropsGraphiqueMaree['marees']
  motif: string
  danger: PropsGraphiqueMaree['danger']
}) {
  const l = largeur - MARGES.gauche - MARGES.droite
  const h = HAUTEUR - MARGES.haut - MARGES.bas
  const [t0, t1] = [points[0]!.t, points.at(-1)!.t]
  const vs = points.map((p) => p.v)
  const [vmin, vmax] = [Math.min(...vs) - 0.3, Math.max(...vs) + 0.3]
  const x = (t: number) => MARGES.gauche + ((t - t0) / (t1 - t0)) * l
  const y = (v: number) => MARGES.haut + h - ((v - vmin) / (vmax - vmin)) * h

  const chemin = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(' ')
  const aire = `${chemin} L${x(t1).toFixed(1)},${(MARGES.haut + h).toFixed(1)} L${x(t0).toFixed(1)},${(MARGES.haut + h).toFixed(1)} Z`
  const xi = Math.min(x(t1), Math.max(x(t0), x(instant)))

  // Un repère toutes les six heures, aux heures rondes.
  const reperes: number[] = []
  const premiere = new Date(t0)
  premiere.setMinutes(0, 0, 0)
  for (let t = premiere.getTime(); t <= t1; t += 6 * 3_600_000) if (t >= t0) reperes.push(t)

  return (
    <svg
      width={largeur}
      height={HAUTEUR}
      role="img"
      aria-label={`Marée : ${nombre(Number(hauteur.toFixed(1)))} m à l’heure choisie`}
    >
      <defs>
        <pattern id={motif} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
        </pattern>
      </defs>
      <path d={aire} fill={`url(#${motif})`} />
      <path d={chemin} fill="none" stroke="var(--texte)" strokeWidth="1.4" strokeLinejoin="round" />

      {reperes.map((t) => (
        <g key={t}>
          <line
            x1={x(t)}
            x2={x(t)}
            y1={MARGES.haut + h}
            y2={MARGES.haut + h + 5}
            stroke="var(--texte-doux)"
          />
          <text
            x={x(t)}
            y={MARGES.haut + h + 18}
            textAnchor="middle"
            fontSize="10"
            fill="var(--texte-doux)"
            fontFamily="var(--police-chiffres)"
          >
            {heureCourte(new Date(t).toISOString())}
          </text>
        </g>
      ))}

      {marees.map((m) => {
        const t = new Date(m.instant).getTime()
        if (t < t0 || t > t1 || m.hauteur_m == null) return null
        const haute = m.type === 'PM'
        return (
          <g key={m.instant}>
            <circle cx={x(t)} cy={y(m.hauteur_m)} r="2.6" fill="var(--fond)" stroke="var(--texte)" />
            <text
              x={x(t)}
              y={y(m.hauteur_m) + (haute ? -9 : 17)}
              textAnchor="middle"
              fontSize="10"
              fill="var(--texte-doux)"
              fontFamily="var(--police-chiffres)"
              letterSpacing="0.06em"
            >
              {haute ? 'PM' : 'BM'} {heureCourte(m.instant)} · {nombre(m.hauteur_m)} m
            </text>
          </g>
        )
      })}

      <line
        x1={xi}
        x2={xi}
        y1={MARGES.haut - 8}
        y2={MARGES.haut + h}
        stroke={danger === 'vert' ? 'var(--accent)' : danger === 'rouge' ? '#e5484d' : 'var(--texte)'}
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <circle cx={xi} cy={y(hauteur)} r="4.5" fill="var(--accent)" stroke="var(--fond)" strokeWidth="2" />
    </svg>
  )
}
