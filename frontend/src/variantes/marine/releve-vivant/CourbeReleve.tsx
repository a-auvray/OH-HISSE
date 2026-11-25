import { type PointerEvent, useId, useState } from 'react'

import { nombre } from '../../../commun/format'
import { jourCourt } from '../../../espaces/marine/lecture'
import { heureCourte } from '../../../espaces/marine/titre'
import styles from './CourbeReleve.module.css'
import {
  cheminMonotone,
  echelle,
  graduationsHoraires,
  type Heure,
  type Maree,
  NOM_DANGER,
  PALIERS_M,
  pasDeGraduation,
  plafondDeHauteur,
  plagesDeDanger,
  rangLePlusProche,
} from './modele'

const GAUCHE = 46
const DROITE = 16
const HAUT = 30
const BANDE = 196
const ECART_RUBAN = 8
const RUBAN = 18
const BAS = 6
export const HAUTEUR_COURBE = HAUT + BANDE + ECART_RUBAN + RUBAN + BAS

interface Props {
  heures: readonly Heure[]
  marees: readonly Maree[]
  /** L'heure choisie (0 : maintenant). */
  rang: number
  onRang: (rang: number) => void
  /** Le meilleur créneau, hachuré sur la courbe ; absent quand la mer est noire. */
  creneau: { debut: string; fin: string } | null
  /** L'instant présent, repéré sur la courbe quand on a voyagé ailleurs. */
  maintenantMs: number
  largeur: number
  description: string
}

/**
 * La colonne vertébrale de la page : la hauteur d'eau sur toutes les heures prévues, en trois paliers de
 * teinte (0–2 m, 2–5 m, au-delà), la règle de l'heure qu'on fait glisser, et dessous le ruban du danger.
 * Les heures sont en haut et les mètres à gauche : c'est le seul endroit où la page a un cadre gradué.
 * Le ruban porte un motif en plus de la couleur (plein, hachuré, noir à liseré) : le danger ne dépend pas de la teinte.
 */
export function CourbeReleve({
  heures,
  marees,
  rang,
  onRang,
  creneau,
  maintenantMs,
  largeur,
  description,
}: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [glisse, setGlisse] = useState(false)
  const [xLibre, setXLibre] = useState<number | null>(null)

  const utile = Math.max(40, largeur - GAUCHE - DROITE)
  const instants = heures.map((h) => Date.parse(h.instant))
  const t0 = instants[0] ?? 0
  const t1 = instants.at(-1) ?? t0 + 1
  const x = echelle(t0, t1, GAUCHE, GAUCHE + utile)
  const plafond = plafondDeHauteur(heures)
  const y = echelle(0, plafond, HAUT + BANDE, HAUT)
  const yBase = HAUT + BANDE

  const points = heures.flatMap((h, i) =>
    typeof h.hauteur_eau_m === 'number' ? [{ x: x(instants[i]!), y: y(h.hauteur_eau_m) }] : [],
  )
  const courbe = cheminMonotone(points)
  const premier = points[0]
  const dernier = points.at(-1)
  const aire =
    premier && dernier
      ? `${courbe} L${dernier.x.toFixed(1)},${yBase} L${premier.x.toFixed(1)},${yBase} Z`
      : ''

  const choisie = heures[rang]
  const xChoisie = choisie ? x(instants[rang]!) : GAUCHE
  const xRegle = xLibre ?? xChoisie
  const hauteurChoisie = choisie?.hauteur_eau_m
  const pas = pasDeGraduation(utile, heures.length)
  const graduations = graduationsHoraires(heures, pas)
  const plages = plagesDeDanger(heures)
  const pasMetres = plafond > 9 ? 2 : 1
  const niveaux = Array.from({ length: Math.floor(plafond / pasMetres) + 1 }, (_, k) => k * pasMetres)

  const viser = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = Math.min(GAUCHE + utile, Math.max(GAUCHE, e.clientX - rect.left))
    setXLibre(px)
    const cible = t0 + ((px - GAUCHE) / utile) * (t1 - t0)
    const suivant = rangLePlusProche(instants, cible)
    if (suivant !== rang) onRang(suivant)
  }
  const lacher = () => {
    setGlisse(false)
    setXLibre(null)
  }

  const xCreneau0 = creneau ? Math.max(GAUCHE, x(Date.parse(creneau.debut))) : 0
  const xCreneau1 = creneau ? Math.min(GAUCHE + utile, x(Date.parse(creneau.fin))) : 0
  const maintenantX = x(maintenantMs)
  const maintenantVisible = maintenantMs >= t0 && maintenantMs <= t1 && Math.abs(maintenantX - xRegle) > 70
  const etiquetteRegle = choisie ? heureCourte(choisie.instant) : ''
  const largeurEtiquette = Math.max(40, etiquetteRegle.length * 8 + 14)
  const xEtiquette = Math.min(largeur - largeurEtiquette - 2, Math.max(2, xRegle - largeurEtiquette / 2))

  return (
    <svg
      className={styles.courbe}
      width={largeur}
      height={HAUTEUR_COURBE}
      viewBox={`0 0 ${largeur} ${HAUTEUR_COURBE}`}
      role="img"
      aria-label={description}
      data-glisse={glisse || undefined}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        setGlisse(true)
        viser(e)
      }}
      onPointerMove={(e) => glisse && viser(e)}
      onPointerUp={lacher}
      onPointerCancel={lacher}
    >
      <defs>
        {PALIERS_M.map((m) => (
          <clipPath key={m} id={`${id}palier${m}`}>
            <rect x={GAUCHE} y={HAUT} width={utile} height={Math.max(0, y(m) - HAUT)} />
          </clipPath>
        ))}
        <clipPath id={`${id}cadre`}>
          <rect x={GAUCHE} y={HAUT - 2} width={utile} height={BANDE + 4} />
        </clipPath>
        <pattern
          id={`${id}creneau`}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" className={styles.hachureCreneau} />
        </pattern>
        <pattern
          id={`${id}rouge`}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" className={styles.hachureRouge} />
        </pattern>
      </defs>

      {/* Les mètres à gauche : des repères fixes, pâles, toujours chiffrés. */}
      {niveaux.map((m) => (
        <g key={m}>
          <line x1={GAUCHE} x2={GAUCHE + utile} y1={y(m)} y2={y(m)} className={styles.repereFixe} />
          <text x={GAUCHE - 8} y={y(m) + 4} textAnchor="end" className={styles.legende}>
            {m} m
          </text>
        </g>
      ))}

      {/* Les heures en haut ; le minuit porte le nom du jour. */}
      {graduations.map((g) => {
        const gx = x(Date.parse(g.instant))
        return (
          <g key={g.instant}>
            <line
              x1={gx}
              x2={gx}
              y1={g.minuit ? HAUT - 8 : HAUT - 4}
              y2={g.minuit ? HAUT + BANDE : HAUT}
              className={g.minuit ? styles.minuit : styles.graduation}
            />
            <text x={gx} y={HAUT - 12} textAnchor="middle" className={styles.legende}>
              {g.minuit ? jourCourt(g.instant) : g.etiquette}
            </text>
          </g>
        )
      })}

      {/* La mise en eau : trois paliers de teinte, dans l'ordre où l'eau les recouvre. */}
      <g className={styles.eau} style={{ transformOrigin: `0px ${yBase}px` }}>
        <path d={aire} className={styles.palier1} />
        {PALIERS_M.map((m, i) => (
          <path
            key={m}
            d={aire}
            className={i === 0 ? styles.palier2 : styles.palier3}
            clipPath={`url(#${id}palier${m})`}
          />
        ))}
        <path d={courbe} className={styles.trait} fill="none" />
      </g>

      {creneau && xCreneau1 > xCreneau0 && (
        <g clipPath={`url(#${id}cadre)`}>
          <rect
            x={xCreneau0}
            y={HAUT}
            width={xCreneau1 - xCreneau0}
            height={BANDE}
            fill={`url(#${id}creneau)`}
          />
          <line x1={xCreneau0} x2={xCreneau0} y1={HAUT} y2={yBase} className={styles.borneCreneau} />
          <line x1={xCreneau1} x2={xCreneau1} y1={HAUT} y2={yBase} className={styles.borneCreneau} />
        </g>
      )}

      {/* Les marées extrêmes : la pleine mer s'écrit sous son point, la basse mer au-dessus. */}
      {marees
        .filter((m) => Date.parse(m.instant) >= t0 && Date.parse(m.instant) <= t1)
        .map((m) => {
          const mx = x(Date.parse(m.instant))
          const my = y(m.hauteur_m)
          const pleine = m.type === 'PM'
          const ancre = mx > GAUCHE + utile - 90 ? 'end' : mx < GAUCHE + 90 ? 'start' : 'middle'
          return (
            <g key={m.instant}>
              <circle cx={mx} cy={my} r={3.5} className={styles.pointMaree} />
              <text x={mx} y={pleine ? my + 20 : my - 12} textAnchor={ancre} className={styles.maree}>
                {m.type} {heureCourte(m.instant)} · {nombre(m.hauteur_m)} m
              </text>
            </g>
          )
        })}

      {maintenantVisible && (
        <g>
          <line x1={maintenantX} x2={maintenantX} y1={HAUT} y2={yBase} className={styles.maintenant} />
          <text x={maintenantX + 5} y={yBase - 6} className={styles.legende}>
            maintenant
          </text>
        </g>
      )}

      {/* Le ruban du danger, aligné sur la courbe : plein, hachuré ou noir cerclé de blanc. */}
      <g className={styles.ruban} transform={`translate(0 ${yBase + ECART_RUBAN})`}>
        {plages.map((p) => {
          const px0 = Math.max(GAUCHE, x(p.debutMs))
          const px1 = Math.min(GAUCHE + utile, x(p.finMs))
          const largeurPlage = px1 - px0
          if (largeurPlage <= 0) return null
          return (
            <g key={p.debutMs}>
              <rect
                x={px0}
                y={0}
                width={largeurPlage}
                height={RUBAN}
                className={styles.plage}
                data-niveau={p.niveau}
              />
              {p.niveau === 'rouge' && (
                <rect x={px0} y={0} width={largeurPlage} height={RUBAN} fill={`url(#${id}rouge)`} />
              )}
              <rect
                x={px0}
                y={0}
                width={largeurPlage}
                height={RUBAN}
                className={styles.contourPlage}
                data-niveau={p.niveau}
              />
              {largeurPlage > 56 && (
                <text
                  x={px0 + largeurPlage / 2}
                  y={13}
                  textAnchor="middle"
                  className={styles.libellePlage}
                  data-niveau={p.niveau}
                >
                  {NOM_DANGER[p.niveau]}
                </text>
              )}
            </g>
          )
        })}
      </g>

      {/* La règle : elle suit le doigt au pixel près, la mer suit avec un léger retard. */}
      <g className={styles.regle}>
        <line
          x1={xRegle}
          x2={xRegle}
          y1={HAUT - 2}
          y2={yBase + ECART_RUBAN + RUBAN}
          className={styles.halo}
        />
        <line
          x1={xRegle}
          x2={xRegle}
          y1={HAUT - 2}
          y2={yBase + ECART_RUBAN + RUBAN}
          className={styles.filRegle}
        />
        {typeof hauteurChoisie === 'number' && (
          <circle cx={xChoisie} cy={y(hauteurChoisie)} r={5} className={styles.pointRegle} />
        )}
        <rect x={xEtiquette} y={2} width={largeurEtiquette} height={19} className={styles.etiquetteRegle} />
        <text x={xEtiquette + largeurEtiquette / 2} y={16} textAnchor="middle" className={styles.texteRegle}>
          {etiquetteRegle}
        </text>
      </g>
    </svg>
  )
}
