import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CoupeReleve } from './CoupeReleve'

const PROFIL = [
  { distance: 0, hauteur: 6.9 },
  { distance: 40, hauteur: 3 },
  { distance: 100, hauteur: -0.5 },
]

const coupe = (hauteur: number) =>
  render(
    <CoupeReleve
      profil={PROFIL}
      hauteur={hauteur}
      vaguesM={0.5}
      periodeS={7}
      distanceM={20}
      noir={false}
      largeur={600}
      description="Coupe"
    />,
  ).container

const legendes = (c: HTMLElement) => [...c.querySelectorAll('text')].map((t) => t.textContent)

describe('CoupeReleve', () => {
  it('garde la même échelle quand le niveau animé dépasse la pleine mer', () => {
    const calme = coupe(6.9)
    const depasse = coupe(7.4)

    expect(legendes(calme)).toContain('7 m')
    expect(legendes(depasse)).not.toContain('8 m')
    // Le profil de sable ne bouge pas d'un pixel.
    expect(depasse.querySelector('path[fill="none"]')?.getAttribute('d')).toBe(
      calme.querySelector('path[fill="none"]')?.getAttribute('d'),
    )
    // Le libellé reste borné au haut de l'échelle.
    expect(legendes(depasse)).toContain('eau à 7 m')
  })
})
