import { useEffect, useRef } from 'react'

import type { NiveauAnimation } from '../types'
import { dessiner } from './dessin'
import type { ParametresMatiere } from './modele'

const PIXELS_MAX = 1.5

interface Props {
  parametres: ParametresMatiere
  animation: NiveauAnimation
}

/**
 * Les quatre plaques de matière, dessinées en 2D (pas de WebGL). Seule la mer
 * bouge, doucement ; en mode immobile, on dessine une fois et on redessine
 * quand les données changent. Un onglet masqué ne travaille pas.
 */
export function Plaques({ parametres, animation }: Props) {
  const toile = useRef<HTMLCanvasElement>(null)
  const dernier = useRef(parametres)
  useEffect(() => {
    dernier.current = parametres
  })
  const redessiner = useRef<() => void>(() => undefined)

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

    const vitesse = animation === 'cinema' ? 1 : 0.35
    let temps = 0
    let precedent = 0
    let image = 0
    const tracer = () => dessiner(ctx, largeur, hauteur, dernier.current, temps)
    const boucle = (maintenant: number) => {
      const dt = precedent ? Math.min(0.1, (maintenant - precedent) / 1000) : 0
      precedent = maintenant
      temps += dt * vitesse
      tracer()
      image = requestAnimationFrame(boucle)
    }
    const demarrer = () => {
      cancelAnimationFrame(image)
      precedent = 0
      if (animation !== 'immobile' && !document.hidden) image = requestAnimationFrame(boucle)
      else tracer()
    }

    redessiner.current = tracer
    mesurer()
    demarrer()
    const observateur = new ResizeObserver(() => {
      mesurer()
      tracer()
    })
    observateur.observe(canvas)
    document.addEventListener('visibilitychange', demarrer)
    return () => {
      cancelAnimationFrame(image)
      observateur.disconnect()
      document.removeEventListener('visibilitychange', demarrer)
    }
  }, [animation])

  useEffect(() => {
    if (animation === 'immobile') redessiner.current()
  }, [animation, parametres])

  return (
    <canvas
      ref={toile}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
