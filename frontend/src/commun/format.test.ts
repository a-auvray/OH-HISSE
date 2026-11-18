import { describe, expect, it } from 'vitest'

import { couleurRessenti, isoLocal, kg, lest, nombre } from './format'

describe('format', () => {
  it('écrit les charges à la française', () => {
    expect(kg(22.5)).toBe('22,5 kg')
    expect(kg(20)).toBe('20 kg')
    expect(kg(42.14, 1)).toBe('42,1 kg')
    expect(lest(22.5)).toBe('+22,5 kg')
    expect(lest(0)).toBe('PDC')
    expect(nombre(8.5)).toBe('8,5')
  })

  it('donne la date locale au format ISO', () => {
    expect(isoLocal(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })

  it.each([
    [1, 'rouge'],
    [4, 'rouge'],
    [5, 'orange'],
    [6, 'orange'],
    [7, 'vert'],
    [10, 'vert'],
  ] as const)('ressenti %i → %s', (ressenti, couleur) => {
    expect(couleurRessenti(ressenti)).toBe(couleur)
  })
})
