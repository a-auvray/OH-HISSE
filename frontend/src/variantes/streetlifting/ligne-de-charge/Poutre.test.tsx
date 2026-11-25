import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useRessort } from './animation'
import { abscisseEtiquette } from './modele'
import { Poutre } from './Poutre'

function Sonde({ cible }: { cible: number }) {
  return <output>{useRessort(cible)}</output>
}

afterEach(() => {
  delete document.documentElement.dataset.animations
  vi.useRealTimers()
})

describe('La ligne de charge', () => {
  it('reste à plat quand la charge est inconnue', () => {
    document.documentElement.dataset.animations = 'immobile'
    const { container } = render(
      <Poutre largeur={600} amplitude={0} position={0.5} etiquette={null} teinte="var(--texte)" />,
    )

    const trace = container.querySelector('svg path[style]')?.getAttribute('d') ?? ''
    const ordonnees = [...trace.matchAll(/,([\d.]+)/g)].map((m) => m[1])
    expect(new Set(ordonnees).size).toBe(1)
    expect(container.querySelector('text')).toBeNull()
  })

  it('ploie et pose l’étiquette sous son point bas', () => {
    document.documentElement.dataset.animations = 'immobile'
    const { container } = render(
      <Poutre
        largeur={600}
        amplitude={40}
        position={0.5}
        etiquette="106,7 kg · 92 % du record"
        teinte="var(--texte)"
      />,
    )

    const trace = container.querySelector('svg path[style]')?.getAttribute('d') ?? ''
    const ordonnees = [...trace.matchAll(/,([\d.]+)/g)].map((m) => Number(m[1]))
    expect(Math.max(...ordonnees) - Math.min(...ordonnees)).toBeCloseTo(40, 0)
    expect(container.querySelector('text')).toHaveTextContent('106,7 kg · 92 % du record')
  })

  it('est un décor : cachée aux lecteurs d’écran', () => {
    const { container } = render(
      <Poutre largeur={600} amplitude={20} position={0.5} etiquette={null} teinte="var(--texte)" />,
    )
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('garde la valeur précédente en filigrane, un instant', () => {
    vi.useFakeTimers()
    document.documentElement.dataset.animations = 'immobile'
    const props = { largeur: 600, position: 0.5, etiquette: null, teinte: 'var(--texte)' }
    const { container, rerender } = render(<Poutre {...props} amplitude={20} />)
    expect(container.querySelectorAll('svg path')).toHaveLength(4)

    rerender(<Poutre {...props} amplitude={40} />)
    expect(container.querySelectorAll('svg path')).toHaveLength(5)

    act(() => {
      vi.advanceTimersByTime(1300)
    })
    expect(container.querySelectorAll('svg path')).toHaveLength(4)
  })

  it('ne dessine rien tant que sa largeur est inconnue', () => {
    const { container } = render(
      <Poutre largeur={0} amplitude={20} position={0.5} etiquette={null} teinte="var(--texte)" />,
    )
    expect(container.querySelector('svg')).toBeNull()
  })
})

describe("L'étiquette de la poutre", () => {
  const texte = '41,5 kg de lest · 100 % du record'

  it('reste dans le cadre aux deux extrémités', () => {
    const demi = (texte.length * 7.8) / 2 + 4
    expect(abscisseEtiquette(576, texte, 600)).toBeCloseTo(600 - demi)
    expect(abscisseEtiquette(0, texte, 600)).toBeCloseTo(demi)
    expect(abscisseEtiquette(300, texte, 600)).toBe(300)
  })

  it('se centre quand elle est plus large que le cadre', () => {
    expect(abscisseEtiquette(10, texte, 200)).toBe(100)
  })

  it('suit le point sans texte', () => {
    expect(abscisseEtiquette(300, null, 600)).toBe(300)
  })
})

describe('Le ressort', () => {
  it('donne tout de suite la cible hors du niveau « cinéma »', () => {
    document.documentElement.dataset.animations = 'sobre'
    const { container } = render(<Sonde cible={42} />)
    expect(container.querySelector('output')).toHaveTextContent('42')
  })

  it('part de zéro et rejoint sa cible en « cinéma »', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    const { container } = render(<Sonde cible={30} />)
    expect(container.querySelector('output')).toHaveTextContent('0')

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(container.querySelector('output')).toHaveTextContent('30')
  })
})
