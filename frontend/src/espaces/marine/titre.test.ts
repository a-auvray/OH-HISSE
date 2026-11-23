import { describe, expect, it } from 'vitest'

import type { Conditions } from '../../api/types'
import { heureCourte, titreMarine } from './titre'

const h = (heure: number, danger: string) => ({
  instant: `2026-11-23T${String(heure).padStart(2, '0')}:00:00+01:00`,
  danger,
})

function conditions(niveau: string, heures: ReturnType<typeof h>[], raisons: string[] = []): Conditions {
  return {
    maintenant: { instant: '2026-11-23T13:05:00+01:00' },
    danger: { niveau, raisons: raisons.map((texte) => ({ niveau, texte })) },
    heures,
  } as unknown as Conditions
}

const CRENEAU = { debut: '2026-11-23T13:30:00+01:00', fin: '2026-11-23T15:30:00+01:00' }

describe('heureCourte', () => {
  it('écrit les heures pleines et les demi-heures comme on les dit', () => {
    expect(heureCourte('2026-11-23T17:00:00+01:00')).toBe('17h')
    expect(heureCourte('2026-11-23T13:30:00+01:00')).toBe('13h30')
    expect(heureCourte('2026-11-23T09:05:00+01:00')).toBe('9h05')
  })
})

describe('titreMarine', () => {
  const jour = [h(14, 'vert'), h(16, 'vert'), h(17, 'rouge')]

  it('donne le créneau quand la mer est ouverte', () => {
    expect(titreMarine(conditions('vert', jour), CRENEAU).titre).toBe('Vas-y entre 13h30 et 15h30.')
  })

  it('annonce la bascule quand il n’y a pas de créneau', () => {
    const t = titreMarine(conditions('vert', jour), null)

    expect(t.titre).toBe('Vas-y avant 17h.')
    expect(t.detail).toContain('rouge')
  })

  it('dit « à toi » quand rien ne menace', () => {
    expect(titreMarine(conditions('vert', [h(14, 'vert')]), null).titre).toBe('La mer est à toi.')
  })

  it('dit quand revenir si la mer est rouge', () => {
    const t = titreMarine(conditions('rouge', [h(14, 'rouge'), h(20, 'vert')], ['Vent fort']), null)

    expect(t).toEqual({ titre: 'Pas avant 20h.', detail: 'Vent fort' })
  })

  it('dit « pas aujourd’hui » si elle ne rouvre pas', () => {
    expect(titreMarine(conditions('rouge', [h(14, 'rouge')]), null).titre).toBe('Pas aujourd’hui.')
  })

  it('interdit quand le danger est noir', () => {
    expect(titreMarine(conditions('noir', [h(14, 'noir')]), CRENEAU).titre).toBe('Mer interdite.')
  })
})
