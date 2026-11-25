import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { brancherFauxContexte } from './faussesToiles'
import { type Dessin, Toile } from './Toile'

describe('la toile', () => {
  let rappels: Map<number, FrameRequestCallback>
  let suivant: number
  let masque: boolean
  let annulees: number[]

  beforeEach(() => {
    rappels = new Map()
    suivant = 1
    masque = false
    annulees = []
    brancherFauxContexte()
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => masque)
    vi.stubGlobal('requestAnimationFrame', (rappel: FrameRequestCallback) => {
      rappels.set(suivant, rappel)
      return suivant++
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      annulees.push(id)
      rappels.delete(id)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** Joue l'image planifiée, à l'instant `t` (ms). */
  function jouer(t: number) {
    const [id, rappel] = [...rappels.entries()][0] ?? []
    if (id === undefined || !rappel) throw new Error('aucune image planifiée')
    rappels.delete(id)
    act(() => rappel(t))
  }

  it('anime en cinéma : une image après l’autre, avec le temps écoulé', () => {
    const dessiner = vi.fn<Dessin>()
    render(<Toile animation="cinema" cle="a" dessiner={dessiner} />)

    expect(rappels.size).toBe(1)
    jouer(1000)
    jouer(1016)
    const dernier = dessiner.mock.calls.at(-1)?.[3]
    expect(dernier?.ecoule).toBeGreaterThan(0)
    expect(Number.isFinite(dernier?.ecoule)).toBe(true)
    expect(rappels.size).toBe(1)
  })

  it('ralentit le souffle en sobre', () => {
    const cinema = vi.fn<Dessin>()
    const { unmount } = render(<Toile animation="cinema" cle="a" dessiner={cinema} />)
    jouer(1000)
    jouer(1100)
    unmount()
    rappels.clear()

    const sobre = vi.fn<Dessin>()
    render(<Toile animation="sobre" cle="a" dessiner={sobre} />)
    jouer(1000)
    jouer(1100)

    const tempsDe = (f: typeof cinema) => f.mock.calls.at(-1)?.[3].temps ?? 0
    expect(tempsDe(sobre)).toBeGreaterThan(0)
    expect(tempsDe(sobre)).toBeLessThan(tempsDe(cinema))
  })

  it('ne lance aucune boucle en immobile : une image fixe, entrée déjà jouée', () => {
    const dessiner = vi.fn<Dessin>()
    render(<Toile animation="immobile" cle="a" dessiner={dessiner} />)

    expect(rappels.size).toBe(0)
    expect(dessiner).toHaveBeenCalled()
    expect(dessiner.mock.calls.at(-1)?.[3]).toMatchObject({ temps: 0, ecoule: Number.POSITIVE_INFINITY })
  })

  it('annule sa boucle au démontage', () => {
    const { unmount } = render(<Toile animation="cinema" cle="a" dessiner={vi.fn()} />)
    const planifiee = [...rappels.keys()][0]
    unmount()

    expect(annulees).toContain(planifiee)
    expect(rappels.size).toBe(0)
  })

  it('se met en pause quand l’onglet est masqué et reprend à son retour', () => {
    render(<Toile animation="cinema" cle="a" dessiner={vi.fn()} />)
    expect(rappels.size).toBe(1)

    masque = true
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(rappels.size).toBe(0)

    masque = false
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(rappels.size).toBe(1)
  })

  it('se redessine avec les nouvelles couleurs quand la clé (thème, ton) change', () => {
    const dessiner = vi.fn<Dessin>()
    const { rerender } = render(<Toile animation="immobile" cle="papier|jour" dessiner={dessiner} />)
    const avant = dessiner.mock.calls.length

    rerender(<Toile animation="immobile" cle="papier|soir" dessiner={dessiner} />)

    expect(dessiner.mock.calls.length).toBeGreaterThan(avant)
  })

  it('est décorative pour les lecteurs d’écran', () => {
    const { container } = render(<Toile animation="immobile" cle="a" dessiner={vi.fn()} />)
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
  })
})
