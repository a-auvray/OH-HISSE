import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Sculpture } from './Sculpture'

/** Un contexte 2D muet qui compte les images dessinées (chaque image commence par un clearRect). */
function fauxContexte() {
  return {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    globalAlpha: 1,
  }
}

describe('Sculpture', () => {
  let ctx: ReturnType<typeof fauxContexte>
  let planifiees: Map<number, FrameRequestCallback>
  let prochain: number

  beforeEach(() => {
    ctx = fauxContexte()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    )
    planifiees = new Map()
    prochain = 1
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((rappel) => {
      planifiees.set(prochain, rappel)
      return prochain++
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => void planifiees.delete(id))
  })

  afterEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  const proprietes = { p: 0.64, verrouille: false, eteinte: false, ton: 'jour' } as const

  it('est un décor : caché des lecteurs d’écran', () => {
    const { container } = render(<Sculpture {...proprietes} animation="immobile" />)
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
  })

  it('en Immobile, dessine une image fixe et ne lance aucune boucle', () => {
    render(<Sculpture {...proprietes} animation="immobile" />)
    expect(ctx.clearRect).toHaveBeenCalledTimes(1)
    expect(planifiees.size).toBe(0)
  })

  it('en Cinéma, lance une boucle qu’elle annule au démontage', () => {
    const { unmount } = render(<Sculpture {...proprietes} animation="cinema" />)
    expect(planifiees.size).toBe(1)
    unmount()
    expect(planifiees.size).toBe(0)
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('arrête sa boucle une fois l’image posée', () => {
    render(<Sculpture {...proprietes} animation="cinema" />)
    // Les fils s'ouvrent d'une ligne vers leur largeur : la boucle tourne jusqu'à ce que tout soit posé.
    let t = 0
    for (let i = 0; i < 400 && planifiees.size > 0; i++) {
      const [[id, rappel]] = [...planifiees.entries()] as [[number, FrameRequestCallback]]
      planifiees.delete(id)
      t += 16
      rappel(t)
    }
    expect(planifiees.size).toBe(0)
    expect(ctx.clearRect.mock.calls.length).toBeGreaterThan(2)
  })

  it('se met en pause quand l’onglet est masqué, et reprend au retour', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    render(<Sculpture {...proprietes} animation="cinema" />)
    // Masquée : une seule image fixe, aucune boucle.
    expect(planifiees.size).toBe(0)

    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(planifiees.size).toBe(1)
  })

  it('se redessine quand le ton change, en relisant les couleurs', () => {
    const { rerender } = render(<Sculpture {...proprietes} animation="immobile" />)
    const avant = ctx.clearRect.mock.calls.length
    rerender(<Sculpture {...proprietes} ton="soir" animation="immobile" />)
    expect(ctx.clearRect.mock.calls.length).toBeGreaterThan(avant)
  })

  it('se redessine quand la progression change', () => {
    const { rerender } = render(<Sculpture {...proprietes} animation="immobile" />)
    const avant = ctx.clearRect.mock.calls.length
    rerender(<Sculpture {...proprietes} p={0.9} animation="immobile" />)
    expect(ctx.clearRect.mock.calls.length).toBeGreaterThan(avant)
  })

  it('ne plante pas sans canvas 2D', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(() => render(<Sculpture {...proprietes} animation="cinema" />)).not.toThrow()
  })
})
