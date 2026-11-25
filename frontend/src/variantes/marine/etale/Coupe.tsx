import { useContext, useEffect, useMemo, useRef } from 'react'

import { nombre } from '../../../commun/format'
import { useLargeur } from '../../../commun/useLargeur'
import { ContexteTheme } from '../../../themes/contexte'
import { useTon } from '../../../themes/ton'
import { CIBLE_TURBIDITE, dessiner, type EtatScene, type Fondu, glisser, lireEncres } from './dessin'
import { useLisse, useNiveauAnimation } from './hooks'
import { phraseDistance, phraseMarche } from './lecture'
import {
  type Niveau,
  type ProfilEstran,
  aleatoire,
  avancer,
  creerParticules,
  estEtale,
  geometrie,
  houleVisuelle,
  reperesDistance,
  vitesseProfondeur,
} from './modele'
import styles from './Coupe.module.css'

const HAUTEUR = 330

export interface PropsCoupe {
  profil: ProfilEstran | null
  /** Toutes les hauteurs d'eau des heures prévues : elles fixent l'échelle verticale. */
  niveaux: readonly number[]
  /** Hauteur d'eau à l'heure choisie, ou null si on ne la connaît pas. */
  hauteurM: number | null
  /** Distance de sable jusqu'à l'eau à l'heure choisie, ou null. */
  distanceM: number | null
  /** Le sable que la mer vient de laisser, en mètres depuis la digue. */
  mouille: { de: number; a: number } | null
  /** La prochaine pleine mer : un trait d'eau fantôme et sa distance. */
  fantome: { hauteurM: number; distanceM: number; heure: string } | null
  vaguesM: number | null
  periodeS: number | null
  /** Vent vers le large en km/h : positif quand le vent de terre pousse vers la droite. */
  ventVersLargeKmh: number
  /** Courant le long de la côte, vers l'est, en km/h. */
  courantEstKmh: number | null
  danger: Niveau
  nuit: boolean
  /** Le vent nommé par rapport à la plage (« vent de terre · pousse au large »), écrit au-dessus de la surface. */
  libelleVent: string
  /** Le résumé lu par les lecteurs d'écran : la coupe elle-même est un dessin. */
  resume: string
}

const NOMBRE_PARTICULES = (largeur: number) => Math.round(Math.min(140, Math.max(40, largeur / 8)))

/**
 * La plage en coupe : la dune à gauche, le profil réel du sable, l'eau qui s'ouvre vers le large à droite.
 * Le niveau d'eau, la surface (houle, risées) et les particules du courant sont dessinés dans un canvas 2D ;
 * les repères (graduation, accolade, trait d'eau fantôme) sont en SVG, et les mots en HTML.
 * L'axe horizontal est une distance en mètres : la coupe montre le rivage à l'heure choisie, pas une frise du temps.
 */
export function Coupe(props: PropsCoupe) {
  const { profil, niveaux, hauteurM, distanceM, mouille, fantome, danger, nuit } = props
  const animation = useNiveauAnimation()
  const [ton] = useTon()
  const themeId = useContext(ContexteTheme)?.id
  const [cadre, largeur] = useLargeur<HTMLDivElement>()
  const toile = useRef<HTMLCanvasElement>(null)

  const niveauLisse = useLisse(hauteurM ?? 0, animation)
  const distanceLisse = useLisse(distanceM ?? 0, animation)
  const hauteur = largeur > 0 && largeur < 520 ? 270 : HAUTEUR

  const geo = useMemo(
    () => (largeur > 0 ? geometrie({ largeur, hauteur, profil, niveaux }) : null),
    [largeur, hauteur, profil, niveaux],
  )

  const etale = estEtale(props.courantEstKmh === null ? null : Math.abs(props.courantEstKmh))
  const scene: EtatScene | null = geo && {
    geo,
    profil,
    niveau: hauteurM === null ? -Infinity : niveauLisse,
    mouille,
    houle: houleVisuelle(props.vaguesM, props.periodeS),
    risees: props.ventVersLargeKmh * 2.4,
    vz: vitesseProfondeur(props.courantEstKmh ?? 0),
    danger,
    nuit,
  }

  // La boucle de dessin lit toujours la dernière scène, sans être relancée à chaque image du glissement.
  const dernier = useRef({ scene, etale })
  useEffect(() => {
    dernier.current = { scene, etale }
  })
  const redessiner = useRef<() => void>(() => undefined)

  useEffect(() => {
    const canvas = toile.current
    const ctx = canvas?.getContext?.('2d')
    if (!canvas || !ctx || largeur === 0) return

    const echelle = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.max(1, Math.round(largeur * echelle))
    canvas.height = Math.max(1, Math.round(hauteur * echelle))
    ctx.setTransform(echelle, 0, 0, echelle, 0, 0)

    // Les couleurs sont lues ici, à chaque (re)lancement : un changement de ton ou de thème les relit.
    const encres = lireEncres(canvas, { clair: ton === 'jour' })
    const hasard = aleatoire(11)
    let particules = creerParticules(NOMBRE_PARTICULES(largeur))
    const vitesse = animation === 'cinema' ? 1 : 0.3
    const fondu: Fondu = { turbidite: 0, nuit: 0 }
    let temps = 0
    let precedent = 0
    let reste = 0
    let image = 0

    const tracer = () => {
      const { scene: s } = dernier.current
      if (!s) return
      dessiner(ctx, s, temps, encres, particules, fondu)
    }
    // En « immobile », une image fixe : le fondu est posé d'un coup sur sa valeur finale.
    const poserFondu = () => {
      const s = dernier.current.scene
      if (!s) return
      fondu.turbidite = CIBLE_TURBIDITE[s.danger]
      fondu.nuit = s.nuit ? 1 : 0
    }
    const boucle = (maintenant: number) => {
      image = requestAnimationFrame(boucle)
      const dt = precedent ? Math.min(0.1, (maintenant - precedent) / 1000) : 0
      precedent = maintenant
      reste += dt
      // À l'étale presque tout est immobile : 30 images par seconde suffisent.
      if (dernier.current.etale && reste < 1 / 30) return
      const pas = reste * vitesse
      reste = 0
      temps += pas
      const s = dernier.current.scene
      if (s) {
        particules = particules.map((p) => avancer(p, s.vz, pas, hasard))
        fondu.turbidite = glisser(fondu.turbidite, CIBLE_TURBIDITE[s.danger], pas / vitesse)
        fondu.nuit = glisser(fondu.nuit, s.nuit ? 1 : 0, pas / vitesse)
      }
      tracer()
    }
    const demarrer = () => {
      cancelAnimationFrame(image)
      precedent = 0
      if (animation !== 'immobile' && !document.hidden) image = requestAnimationFrame(boucle)
      else {
        poserFondu()
        tracer()
      }
    }

    redessiner.current = () => {
      poserFondu()
      tracer()
    }
    demarrer()
    // Un onglet masqué ne travaille pas.
    document.addEventListener('visibilitychange', demarrer)
    return () => {
      cancelAnimationFrame(image)
      document.removeEventListener('visibilitychange', demarrer)
      redessiner.current = () => undefined
    }
  }, [largeur, hauteur, animation, ton, themeId])

  // En « immobile » rien ne tourne : on redessine quand la scène change.
  useEffect(() => {
    if (animation === 'immobile') redessiner.current()
  })

  const xFoot = geo ? geo.x(0) : 0
  const haut = geo ? geo.haut : 0
  const piedY = geo && profil ? geo.y(profil.points[0]!.h) : 0
  const yPont = geo ? Math.max(haut + 16, piedY - 22) : 0
  const xEau = geo && distanceM !== null ? geo.x(distanceLisse) : null
  const ySurface = geo && hauteurM !== null ? geo.y(niveauLisse) : null
  const yFantome = geo && fantome ? geo.y(fantome.hauteurM) : null
  const centre = xEau !== null ? (xFoot + xEau) / 2 : 0
  const aMarcher = distanceM !== null && distanceM >= 1

  return (
    <div
      ref={cadre}
      className={styles.coupe}
      style={{ height: hauteur }}
      role="img"
      aria-label={props.resume}
      data-nuit={nuit || undefined}
    >
      <canvas ref={toile} className={styles.toile} aria-hidden="true" />
      {geo && (
        <svg
          className={styles.reperes}
          width={geo.largeur}
          height={geo.hauteur}
          viewBox={`0 0 ${geo.largeur} ${geo.hauteur}`}
          aria-hidden="true"
        >
          {/* La graduation en mètres, le long de la base : l'axe est une distance. */}
          <line
            x1={geo.gauche}
            x2={geo.droite}
            y1={geo.bas + 0.5}
            y2={geo.bas + 0.5}
            className={styles.axe}
          />
          {reperesDistance(geo.dMax).map((d) => (
            <g key={d}>
              <line x1={geo.x(d)} x2={geo.x(d)} y1={geo.bas} y2={geo.bas + 5} className={styles.axe} />
              <text x={geo.x(d)} y={geo.bas + 19} textAnchor="middle" className={styles.graduation}>
                {d === 0 ? '0' : `${nombre(d)} m`}
              </text>
            </g>
          ))}

          {/* Le trait d'eau fantôme : où sera l'eau à la prochaine pleine mer. */}
          {fantome && yFantome !== null && (
            <g>
              <line
                x1={geo.x(fantome.distanceM)}
                x2={geo.droite}
                y1={yFantome}
                y2={yFantome}
                className={styles.fantome}
              />
              <circle cx={geo.x(fantome.distanceM)} cy={yFantome} r="3" className={styles.pointFantome} />
            </g>
          )}

          {/* L'accolade : du pied de la digue au trait d'eau, la distance à marcher. */}
          {xEau !== null && aMarcher && ySurface !== null && (
            <g className={styles.accolade}>
              <path
                d={`M${xFoot},${yPont + 8} V${yPont} H${xEau} V${Math.min(ySurface, yPont + 8)}`}
                fill="none"
              />
            </g>
          )}
          {xEau !== null && ySurface !== null && (
            <circle cx={xEau} cy={ySurface} r="4" className={styles.pointEau} />
          )}
        </svg>
      )}

      {geo && xEau !== null && distanceM !== null && (
        <div
          className={styles.distance}
          style={{ left: Math.min(Math.max(centre, 110), geo.largeur - 110), top: yPont - 6 }}
        >
          <span className={styles.mesure}>
            {aMarcher ? (
              <>
                <strong>{nombre(Math.round(distanceLisse))}</strong> m à marcher
              </>
            ) : (
              phraseDistance(0)
            )}
          </span>
          {aMarcher && (
            <span className={styles.sousTitre}>
              {phraseMarche(distanceM)}
              {mouille && ` · sable mouillé sur ${nombre(Math.round(mouille.a - mouille.de))} m`}
            </span>
          )}
        </div>
      )}
      {geo && xEau !== null && ySurface !== null && props.libelleVent && (
        <span
          className={styles.etiquetteVent}
          style={{
            left: Math.min(xEau + 12, Math.max(0, geo.largeur - 260)),
            top: Math.max(2, ySurface - 24),
          }}
        >
          {props.libelleVent}
        </span>
      )}
      {geo && fantome && yFantome !== null && (
        <span
          className={styles.etiquetteFantome}
          style={{ top: yFantome - 4, right: geo.largeur - geo.droite + 4 }}
        >
          {fantome.distanceM < 1
            ? `pleine mer à ${fantome.heure} : au pied de la digue`
            : `pleine mer : ${nombre(Math.round(fantome.distanceM))} m à ${fantome.heure}`}
        </span>
      )}
      {geo && profil && (
        <span className={styles.pied} style={{ left: xFoot + 6, top: piedY + 6 }}>
          pied de digue
        </span>
      )}
      {geo && (
        <span className={styles.echelle}>
          {profil
            ? `exagération verticale ×${geo.exageration} · profil d’après les relevés heure par heure`
            : 'profil de la plage indisponible : seul le niveau d’eau est dessiné'}
        </span>
      )}
    </div>
  )
}
