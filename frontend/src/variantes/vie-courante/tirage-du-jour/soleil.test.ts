import { describe, expect, it } from 'vitest'

import { EDITIONS, heureCourte, jourDuSoleil, lumiere, palier, positionDuSoleil } from './soleil'

const minutesUtc = (d: Date | null) => (d ? d.getUTCHours() * 60 + d.getUTCMinutes() : Number.NaN)

describe('position du soleil à Ouistreham', () => {
  it('culmine à environ 22° au sud à midi solaire le 19 novembre', () => {
    const p = positionDuSoleil(new Date('2026-11-19T12:00:00Z'))
    expect(p.elevation).toBeGreaterThan(20)
    expect(p.elevation).toBeLessThan(24)
    expect(p.azimut).toBeGreaterThan(170)
    expect(p.azimut).toBeLessThan(190)
  })

  it('culmine à environ 64° le jour du solstice d’été', () => {
    const p = positionDuSoleil(new Date('2026-06-21T12:00:00Z'))
    expect(p.elevation).toBeGreaterThan(62)
    expect(p.elevation).toBeLessThan(66)
  })

  it('est sous l’horizon la nuit et à l’est le matin, à l’ouest le soir', () => {
    expect(positionDuSoleil(new Date('2026-11-19T01:00:00Z')).elevation).toBeLessThan(-20)
    expect(positionDuSoleil(new Date('2026-11-19T09:00:00Z')).azimut).toBeLessThan(180)
    expect(positionDuSoleil(new Date('2026-11-19T15:00:00Z')).azimut).toBeGreaterThan(180)
  })
})

describe('lever et coucher', () => {
  it('tombent à quelques minutes des horaires du 19 novembre (8 h 16 et 17 h 13 à Paris)', () => {
    const { lever, coucher } = jourDuSoleil(new Date('2026-11-19T10:00:00Z'))
    expect(Math.abs(minutesUtc(lever) - (7 * 60 + 16))).toBeLessThanOrEqual(8)
    expect(Math.abs(minutesUtc(coucher) - (16 * 60 + 13))).toBeLessThanOrEqual(8)
  })

  it('allongent le jour en été', () => {
    const hiver = jourDuSoleil(new Date('2026-12-21T10:00:00Z'))
    const ete = jourDuSoleil(new Date('2026-06-21T10:00:00Z'))
    const duree = (j: { lever: Date | null; coucher: Date | null }) =>
      minutesUtc(j.coucher) - minutesUtc(j.lever)
    expect(duree(ete)).toBeGreaterThan(duree(hiver) + 6 * 60)
  })
})

describe('paliers de lumière', () => {
  const a = (iso: string) => palier(positionDuSoleil(new Date(iso)))

  it('suit la journée de novembre : nuit, aube, matin, midi, soir, nuit', () => {
    expect(a('2026-11-19T02:00:00Z')).toBe('nuit')
    expect(a('2026-11-19T07:00:00Z')).toBe('aube')
    expect(a('2026-11-19T09:00:00Z')).toBe('matin')
    expect(a('2026-11-19T12:00:00Z')).toBe('midi')
    expect(a('2026-11-19T15:00:00Z')).toBe('soir')
    expect(a('2026-11-19T20:00:00Z')).toBe('nuit')
  })

  it('a un nom d’édition pour chacun', () => {
    for (const nom of ['aube', 'matin', 'midi', 'soir', 'nuit'] as const)
      expect(EDITIONS[nom]).toMatch(/^édition /)
  })
})

describe('lumière rasante', () => {
  it('vient de la gauche le matin et de la droite le soir', () => {
    expect(lumiere(positionDuSoleil(new Date('2026-11-19T08:00:00Z'))).cote).toBe('gauche')
    expect(lumiere(positionDuSoleil(new Date('2026-11-19T15:00:00Z'))).cote).toBe('droite')
  })

  it('est plus rasante quand le soleil est bas et plate la nuit', () => {
    const bas = lumiere({ elevation: 3, azimut: 100 }).rasance
    const haut = lumiere({ elevation: 40, azimut: 180 }).rasance
    const nuit = lumiere({ elevation: -30, azimut: 0 }).rasance
    expect(bas).toBeGreaterThan(haut)
    expect(nuit).toBeLessThan(bas)
    for (const r of [bas, haut, nuit]) {
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(1)
    }
  })
})

describe('heureCourte', () => {
  it('écrit l’heure de Paris comme sur une affiche', () => {
    expect(heureCourte(new Date('2026-11-19T07:16:00Z'))).toBe('8 h 16')
    expect(heureCourte(new Date('2026-07-01T12:05:00Z'))).toBe('14 h 05')
  })
})
