import { type CSSProperties, useId, useMemo } from 'react'

import { nombre } from '../../../commun/format'
import styles from './CoupeReleve.module.css'
import {
  altitudeADistance,
  amplitudeDeFrange,
  cheminDeFrange,
  distanceAuNiveau,
  dureeDeFrange,
  echelle,
  isolignes,
  phraseDeDistance,
  type PointDeProfil,
} from './modele'

const GAUCHE = 46
const DROITE = 16
const HAUT = 40
const BAS = 22
const HAUTEUR_UTILE = 190
export const HAUTEUR_COUPE = HAUT + HAUTEUR_UTILE + BAS
/** Longueur d'onde de la frange, en pixels : fixe, c'est l'amplitude et le rythme qui disent la houle. */
const ONDE = 96

interface Props {
  profil: readonly PointDeProfil[]
  /** Le niveau de l'eau, en mètres : il glisse d'une heure à l'autre. */
  hauteur: number
  vaguesM: number | null | undefined
  periodeS: number | null | undefined
  /** Distance du sable à l'eau à l'heure choisie, quand l'API la donne. */
  distanceM: number | null | undefined
  /** Mer noire : le relevé est barré, il n'est pas fait pour y aller. */
  noir: boolean
  largeur: number
  description: string
}

/**
 * La plage en coupe, à l'échelle : du pied de la digue (à gauche) vers le large (à droite). Le sable est
 * le profil relevé dans les prévisions, l'eau le recouvre jusqu'au niveau de la marée. Deux réseaux de
 * lignes : des repères d'altitude fixes et pâles, et les isolignes de hauteur d'eau, tous les demi-mètres,
 * qui glissent avec la marée. La frange de la ligne d'eau suit la houle : son amplitude dit la hauteur
 * des vagues, son rythme leur période.
 */
export function CoupeReleve({
  profil,
  hauteur,
  vaguesM,
  periodeS,
  distanceM,
  noir,
  largeur,
  description,
}: Props) {
  const id = `frange${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const amplitude = amplitudeDeFrange(vaguesM)
  const duree = dureeDeFrange(periodeS)
  const premier = profil[0]
  const dernier = profil.at(-1)

  const utile = Math.max(40, largeur - GAUCHE - DROITE)
  const dMax = Math.max(50, dernier?.distance ?? 0)
  /* L'échelle ne dépend que du profil : le niveau animé (qui dépasse un peu) ne la fait pas sauter. */
  const haut = Math.ceil(premier?.hauteur ?? 0)
  const bas = Math.min(0, Math.floor(dernier?.hauteur ?? 0))
  const niveau = Math.min(haut, Math.max(bas, hauteur))
  const x = echelle(0, dMax, GAUCHE, GAUCHE + utile)
  const y = echelle(bas, haut, HAUT + HAUTEUR_UTILE, HAUT)
  const yFond = HAUT + HAUTEUR_UTILE

  const dEau = distanceAuNiveau(profil, niveau)
  const xEau = x(dEau)
  const yEau = y(niveau)
  const xFin = x(dMax)
  const longueur = Math.max(0, xFin - xEau)

  const chemin = useMemo(
    () => cheminDeFrange(Math.round(longueur / 8) * 8 + 8, amplitude, ONDE),
    [longueur, amplitude],
  )

  if (!premier || !dernier) return null

  const pointsSable = profil.map((p) => `${x(p.distance).toFixed(1)},${y(p.hauteur).toFixed(1)}`)
  const sable = `M${pointsSable.join(' L')} L${x(dernier.distance).toFixed(1)},${yFond} L${x(premier.distance).toFixed(1)},${yFond} Z`
  const trait = `M${pointsSable.join(' L')}`

  const sousLEau = profil.filter((p) => p.distance > dEau).reverse()
  const eau =
    dEau < dernier.distance
      ? `M${xEau.toFixed(1)},${yEau.toFixed(1)} L${xFin.toFixed(1)},${yEau.toFixed(1)} ${sousLEau
          .map((p) => `L${x(p.distance).toFixed(1)},${y(p.hauteur).toFixed(1)}`)
          .join(' ')} L${xEau.toFixed(1)},${y(altitudeADistance(profil, dEau)).toFixed(1)} Z`
      : ''

  const lignes = isolignes(profil, niveau)
  const metres = Array.from({ length: haut - bas + 1 }, (_, k) => bas + k)
  const phrase = phraseDeDistance(distanceM)
  const coteCourte = xEau - x(0) < 120

  return (
    <svg
      className={styles.coupe}
      width={largeur}
      height={HAUTEUR_COUPE}
      viewBox={`0 0 ${largeur} ${HAUTEUR_COUPE}`}
      role="img"
      aria-label={description}
    >
      <defs>
        <clipPath id={id}>
          <rect x={0} y={-amplitude - 4} width={longueur} height={amplitude * 2 + 8} />
        </clipPath>
      </defs>

      {/* Le fond fixe : les altitudes du sable, en mètres au-dessus du zéro des cartes. */}
      {metres.map((m) => (
        <g key={m}>
          <line x1={GAUCHE} x2={GAUCHE + utile} y1={y(m)} y2={y(m)} className={styles.repereFixe} />
          <text x={GAUCHE - 8} y={y(m) + 4} textAnchor="end" className={styles.legende}>
            {m} m
          </text>
        </g>
      ))}

      <g className={styles.mise} style={{ transformOrigin: `0px ${yFond}px` }}>
        {eau && <path d={eau} className={styles.eau} />}
      </g>
      <path d={sable} className={styles.sable} />
      <path d={trait} className={styles.profil} fill="none" />

      {/* Les isolignes de hauteur d'eau : elles glissent avec la marée, les repères d'altitude non. */}
      {lignes.map((l) => {
        const lx = x(l.distance)
        const ly = y(altitudeADistance(profil, l.distance))
        const entiere = Number.isInteger(l.profondeurM)
        return (
          <g key={l.profondeurM}>
            <line
              x1={lx}
              x2={lx}
              y1={yEau}
              y2={ly}
              className={entiere ? styles.isoligne : styles.isoligneFine}
            />
            {entiere && (
              <text x={lx} y={Math.min(yFond - 4, ly + 16)} textAnchor="middle" className={styles.etiquette}>
                {l.profondeurM} m
              </text>
            )}
          </g>
        )
      })}

      {/* La ligne d'eau et sa frange : amplitude = hauteur des vagues, rythme = leur période. */}
      {eau && (
        <g transform={`translate(${xEau.toFixed(1)} ${yEau.toFixed(1)})`}>
          <g clipPath={`url(#${id})`}>
            <g
              className={styles.derive}
              style={{ ['--periode']: `${ONDE}px`, ['--duree']: `${duree}s` } as CSSProperties}
            >
              <path d={chemin} className={styles.frange} fill="none" />
            </g>
          </g>
        </g>
      )}
      <line x1={xEau} x2={xEau} y1={yEau - 8} y2={yEau + 14} className={styles.rivage} />
      <text x={xFin - 4} y={yEau - amplitude - 8} textAnchor="end" className={styles.niveau}>
        eau à {nombre(Number(niveau.toFixed(1)))} m
      </text>

      {/* La cote d'ingénieur : de la digue à l'eau, arrondie à 10 m. */}
      {phrase && (
        <g className={styles.cote}>
          <line x1={x(0)} x2={xEau} y1={18} y2={18} />
          <line x1={x(0)} x2={x(0)} y1={12} y2={24} />
          <line x1={xEau} x2={xEau} y1={12} y2={24} />
          <path
            d={`M${x(0) + 7},14 L${x(0)},18 L${x(0) + 7},22 M${xEau - 7},14 L${xEau},18 L${xEau - 7},22`}
            fill="none"
          />
          <text
            x={coteCourte ? xEau + 10 : (x(0) + xEau) / 2}
            y={coteCourte ? 22 : 12}
            textAnchor={coteCourte ? 'start' : 'middle'}
            className={styles.texteCote}
          >
            {phrase}
          </text>
        </g>
      )}

      {noir && (
        <g className={styles.barre}>
          <line x1={GAUCHE} y1={HAUT} x2={GAUCHE + utile} y2={yFond} />
          <line x1={GAUCHE} y1={yFond} x2={GAUCHE + utile} y2={HAUT} />
        </g>
      )}
    </svg>
  )
}
