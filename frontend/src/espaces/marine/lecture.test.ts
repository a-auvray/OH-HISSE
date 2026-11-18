import { describe, expect, it } from 'vitest'

import { beaufort, duree, heure, lireCodeMeteo, pointCardinal } from './lecture'

describe('lecture des conditions', () => {
  it.each([
    [0, 'N'],
    [360, 'N'],
    [44, 'NE'],
    [191, 'S'],
    [225, 'SO'],
    [292, 'ONO'],
    [-90, 'O'],
  ])('%i° → %s', (degres, point) => {
    expect(pointCardinal(degres)).toBe(point)
  })

  it.each([
    [0, 'clair'],
    [2, 'voile'],
    [3, 'nuageux'],
    [45, 'brouillard'],
    [61, 'pluie'],
    [81, 'averses'],
    [95, 'orage'],
  ] as const)('code WMO %i → %s', (code, ciel) => {
    expect(lireCodeMeteo(code).ciel).toBe(ciel)
  })

  it.each([
    [0, 0],
    [15, 3],
    [35, 5],
    [88, 9],
    [95, 10],
    [130, 12],
  ])('%i km/h → force %i', (kmh, force) => {
    expect(beaufort(kmh)).toBe(force)
  })

  it('heure et durée à l’heure de la plage', () => {
    expect(heure('2026-11-20T13:25:00+01:00')).toBe('13:25')
    expect(duree('2026-11-20T08:21:00+01:00', '2026-11-20T17:13:00+01:00')).toBe('8 h 52')
  })
})
