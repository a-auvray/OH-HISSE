import { describe, expect, it } from 'vitest'

import { deplacer, distance, formaterDistance, longueur, type Point } from './geo'

const OUISTREHAM: Point = [-0.26, 49.291]
const HERMANVILLE: Point = [-0.314, 49.299]

describe('géographie', () => {
  it('de Riva-Bella à Hermanville : environ 4 km le long de la côte', () => {
    expect(distance(OUISTREHAM, HERMANVILLE)).toBeGreaterThan(3900)
    expect(distance(OUISTREHAM, HERMANVILLE)).toBeLessThan(4100)
  })

  it('un aller-retour fait deux fois la distance', () => {
    expect(longueur([OUISTREHAM, HERMANVILLE, OUISTREHAM])).toBeCloseTo(
      2 * distance(OUISTREHAM, HERMANVILLE),
      3,
    )
    expect(longueur([OUISTREHAM])).toBe(0)
  })

  it('se déplacer de 500 m vers le nord', () => {
    const arrivee = deplacer(OUISTREHAM, 0, 500)
    expect(distance(OUISTREHAM, arrivee)).toBeCloseTo(500, 0)
    expect(arrivee[1]).toBeGreaterThan(OUISTREHAM[1])
  })

  it('distances lisibles', () => {
    expect(formaterDistance(846)).toBe('850 m')
    expect(formaterDistance(1234)).toBe('1,2 km')
  })
})
