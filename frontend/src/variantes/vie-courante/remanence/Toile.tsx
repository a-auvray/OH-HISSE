import { useEffect, useRef } from 'react'

import type { NiveauAnimation } from '../../../themes/types'

/** Ce que le dessin reçoit à chaque image. */
export interface Instant {
  /** Secondes d'ambiance (souffle), déjà ralenties en mode sobre, figées en immobile. */
  temps: number
  /** Secondes réelles depuis l'apparition : pilote l'allumage d'entrée. Infini en immobile. */
  ecoule: number
  /** Secondes depuis l'image précédente, pour les lissages. */
  dt: number
}

export type Dessin = (
  ctx: CanvasRenderingContext2D,
  largeur: number,
  hauteur: number,
  instant: Instant,
) => void

interface Props {
  animation: NiveauAnimation
  /** Change quand les encres changent (ton, thème) : le dessin est refait avec les couleurs du moment. */
  cle: string
  dessiner: Dessin
  className?: string
}

const PIXELS_MAX = 1.5
/** Hors entrée, seuls le souffle et l'ambiance bougent, très lentement : 30 images par seconde suffisent. */
const INTERVALLE_MS = 33
/** Après ce délai, l'entrée est finie : plus rien n'est animé que le souffle. */
const FIN_ENTREE_S = 1.6

/**
 * Un canvas 2D qui se redessine à la demande. En cinéma et en sobre, une boucle tourne (à 30 images par
 * seconde, en pause quand l'onglet est masqué, annulée au démontage). En immobile, il n'y a aucune boucle :
 * on dessine une image fixe, et de nouveau quand les données (donc le rendu du parent) ou la taille changent.
 */
export function Toile({ animation, cle, dessiner, className }: Props) {
  const toile = useRef<HTMLCanvasElement>(null)
  // Le dessin change à chaque rendu (il lit les dernières données) sans relancer la boucle.
  const dessin = useRef(dessiner)
  const tracerUneFois = useRef<() => void>(() => undefined)
  useEffect(() => {
    dessin.current = dessiner
  })

  useEffect(() => {
    const canvas = toile.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

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

    const vitesse = animation === 'cinema' ? 1 : 0.3
    let temps = 0
    let ecoule = 0
    let precedent = 0
    let depuisDernier = 0
    let dernierDessin = 0
    let image = 0

    const tracer = (dt: number) => {
      ctx.clearRect(0, 0, largeur, hauteur)
      const fixe = animation === 'immobile'
      dessin.current(ctx, largeur, hauteur, {
        temps: fixe ? 0 : temps,
        ecoule: fixe ? Number.POSITIVE_INFINITY : ecoule,
        dt,
      })
    }

    const boucle = (maintenant: number) => {
      const dt = precedent ? Math.min(0.1, (maintenant - precedent) / 1000) : 0
      precedent = maintenant
      temps += dt * vitesse
      ecoule += dt
      // Pendant l'entrée on dessine à chaque image ; ensuite seulement à 30 par seconde.
      depuisDernier += dt
      if (ecoule < FIN_ENTREE_S || maintenant - dernierDessin >= INTERVALLE_MS) {
        tracer(depuisDernier)
        depuisDernier = 0
        dernierDessin = maintenant
      }
      image = requestAnimationFrame(boucle)
    }

    const demarrer = () => {
      cancelAnimationFrame(image)
      precedent = 0
      if (animation !== 'immobile' && !document.hidden) image = requestAnimationFrame(boucle)
      else tracer(0)
    }

    tracerUneFois.current = () => tracer(0)
    mesurer()
    demarrer()
    const observateur = new ResizeObserver(() => {
      mesurer()
      tracer(0)
    })
    observateur.observe(canvas)
    // Un onglet masqué ne travaille pas.
    document.addEventListener('visibilitychange', demarrer)
    return () => {
      cancelAnimationFrame(image)
      observateur.disconnect()
      document.removeEventListener('visibilitychange', demarrer)
      tracerUneFois.current = () => undefined
    }
  }, [animation, cle])

  // En immobile rien ne tourne : chaque rendu du parent (nouvelles données, survol) redessine l'image fixe.
  useEffect(() => {
    if (animation === 'immobile') tracerUneFois.current()
  })

  return <canvas ref={toile} aria-hidden="true" className={className} />
}
