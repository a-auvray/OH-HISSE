import { useEffect, useRef } from 'react'

import type { NiveauAnimation } from '../../../themes/types'
import { dessinerSculpture, type EtatSculpture, lireEncres } from './dessin'

const PIXELS_MAX = 1.5
/** Vitesse de rapprochement vers la cible (par seconde) : Cinéma s'étire, Sobre est bref. */
const RAIDEUR = { cinema: 4.2, sobre: 14, immobile: 0 } as const

interface Props {
  /** Progression de 0 à 1. */
  p: number
  /** Objectif atteint : la torsion tombe à 0 puis le ruban plan est vu par la tranche. */
  verrouille: boolean
  /** Objectif détendu : la sculpture reste, éteinte. */
  eteinte: boolean
  animation: NiveauAnimation
  /** Change quand le ton change : les couleurs sont relues et l'image redessinée. */
  ton: string
}

const cibleDe = ({ p, verrouille, eteinte }: Pick<Props, 'p' | 'verrouille' | 'eteinte'>) => ({
  p: verrouille ? 1 : p,
  verrou: verrouille ? 1 : 0,
  luminosite: eteinte ? 0.4 : 1,
})

/**
 * La sculpture : un canvas 2D (pas de WebGL), presque immobile. Elle ne bouge que pour changer d'état :
 * elle s'ouvre à l'entrée, se resserre quand la progression monte, se range en une ligne au verrouillage.
 * La boucle s'arrête dès que l'image est posée, se met en pause quand l'onglet est masqué et s'annule au démontage.
 */
export function Sculpture({ p, verrouille, eteinte, animation, ton }: Props) {
  const toile = useRef<HTMLCanvasElement>(null)
  const cible = useRef(cibleDe({ p, verrouille, eteinte }))
  const courant = useRef<EtatSculpture>({
    ...cibleDe({ p, verrouille, eteinte }),
    ouverture: animation === 'cinema' ? 0 : 1,
    pince: !verrouille && !eteinte,
  })
  const reveiller = useRef<() => void>(() => undefined)

  // Les cibles changent sans relancer l'installation : la boucle lit toujours les dernières.
  useEffect(() => {
    cible.current = cibleDe({ p, verrouille, eteinte })
    courant.current.pince = !verrouille && !eteinte
    reveiller.current()
  }, [p, verrouille, eteinte])

  useEffect(() => {
    const canvas = toile.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const encres = lireEncres(canvas)
    let largeur = 0
    let hauteur = 0
    const mesurer = () => {
      const echelle = Math.min(window.devicePixelRatio || 1, PIXELS_MAX)
      largeur = canvas.clientWidth
      hauteur = canvas.clientHeight
      canvas.width = Math.max(1, Math.round(largeur * echelle))
      canvas.height = Math.max(1, Math.round(hauteur * echelle))
      ctx.setTransform(echelle, 0, 0, echelle, 0, 0)
    }
    const tracer = () => dessinerSculpture(ctx, largeur, hauteur, courant.current, encres)

    /** Un pas vers la cible ; vrai quand tout est posé. */
    const avancer = (dt: number) => {
      const c = courant.current
      const t = cible.current
      const f = 1 - Math.exp(-RAIDEUR[animation] * dt)
      let pose = true
      for (const cle of ['p', 'verrou', 'luminosite', 'ouverture'] as const) {
        const but = cle === 'ouverture' ? 1 : t[cle]
        const ecart = but - c[cle]
        if (Math.abs(ecart) < 0.002) c[cle] = but
        else {
          c[cle] += ecart * f
          pose = false
        }
      }
      return pose
    }
    const poser = () => {
      Object.assign(courant.current, cible.current, { ouverture: 1 })
    }

    let image = 0
    let precedent = 0
    const boucle = (maintenant: number) => {
      const dt = precedent ? Math.min(0.1, (maintenant - precedent) / 1000) : 0
      precedent = maintenant
      const pose = avancer(dt)
      tracer()
      image = pose ? 0 : requestAnimationFrame(boucle)
    }
    const demarrer = () => {
      cancelAnimationFrame(image)
      image = 0
      precedent = 0
      if (animation === 'immobile' || document.hidden) {
        // Une image fixe : l'état final, sans trajet.
        poser()
        tracer()
        return
      }
      image = requestAnimationFrame(boucle)
    }

    reveiller.current = demarrer
    mesurer()
    demarrer()
    const observateur = new ResizeObserver(() => {
      mesurer()
      tracer()
    })
    observateur.observe(canvas)
    // Un onglet masqué ne travaille pas ; au retour, on reprend là où l'on en était.
    document.addEventListener('visibilitychange', demarrer)
    return () => {
      cancelAnimationFrame(image)
      observateur.disconnect()
      document.removeEventListener('visibilitychange', demarrer)
      reveiller.current = () => undefined
    }
  }, [animation, ton])

  return <canvas ref={toile} aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }} />
}
