import { useEffect, useRef } from 'react'

import type { IdEspace } from '../../espaces/espaces'
import type { NiveauAnimation } from '../types'
import { dessiner, type Encres } from './dessin'
import type { ParametresFils } from './modele'

interface Props {
  parametres: ParametresFils
  /** Heure locale, 0 à 24 : le soleil penche les fibres. */
  heure: number
  animation: NiveauAnimation
  survol: IdEspace | null
  /** Change quand le ton change : les couleurs sont relues. */
  ton: string
}

const PIXELS_MAX = 1.5

/**
 * Les quatre faisceaux de fils d'encre, dessinés en 2D (pas de WebGL : le thème reste léger).
 * Quatre bords, quatre comportements ; les diagonales restent en papier nu.
 */
export function Fils({ parametres, heure, animation, survol, ton }: Props) {
  const toile = useRef<HTMLCanvasElement>(null)
  // Les paramètres changent sans relancer la boucle : elle lit toujours les derniers.
  const dernier = useRef({ parametres, heure, survol })
  useEffect(() => {
    dernier.current = { parametres, heure, survol }
  })
  const redessiner = useRef<() => void>(() => undefined)

  useEffect(() => {
    const canvas = toile.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const style = getComputedStyle(canvas)
    const lire = (nom: string, defaut: string) => style.getPropertyValue(nom).trim() || defaut
    const encres: Encres = {
      vie: lire('--fil-vie', '#4c6b4a'),
      street: lire('--fil-street', '#9c3d2a'),
      mer: lire('--fil-mer', '#1f4e6b'),
      objectif: lire('--fil-objectif', '#5b4a7a'),
      trait: lire('--fil-trait', 'rgba(20,20,20,0.22)'),
    }

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
    const tracer = () => {
      const { parametres: p, heure: h, survol: s } = dernier.current
      dessiner(ctx, largeur, hauteur, p, h, temps, encres, s)
    }
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
    // Un onglet masqué ne travaille pas.
    document.addEventListener('visibilitychange', demarrer)
    return () => {
      cancelAnimationFrame(image)
      observateur.disconnect()
      document.removeEventListener('visibilitychange', demarrer)
    }
  }, [animation, ton])

  // En mode immobile, rien ne tourne : on redessine quand les données ou le survol changent.
  useEffect(() => {
    if (animation === 'immobile') redessiner.current()
  }, [animation, parametres, survol])

  return (
    <canvas
      ref={toile}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
