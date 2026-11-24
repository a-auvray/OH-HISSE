import { describe, expect, it } from 'vitest'

import type { DonneesBriefing } from '../../accueil/useBriefing'
import { agitation, mouDesCables, parametresFils, pasDesStrates } from './modele'

function donnees(surcharge: Record<string, unknown> = {}): DonneesBriefing {
  return {
    seance: { bloc: { numero: 3, total: 4 }, propositions: [{ rpe_cible: 8 }] },
    objectifs: [{ principal: true, statut: 'en_cours', progression: { pourcentage: 64 } }],
    mer: {
      danger: { niveau: 'rouge' },
      maintenant: { vent_kmh: 26, rafales_kmh: 44, vent_direction_deg: 225 },
    },
    vie: { recuperation: { progression: 0.82 } },
    ...surcharge,
  } as unknown as DonneesBriefing
}

describe('parametresFils', () => {
  it('traduit chaque donnée du briefing en un paramètre de faisceau', () => {
    expect(parametresFils(donnees())).toEqual({
      recuperation: 0.82,
      bandes: { total: 4, faites: 3, rpe: 8 },
      mer: { niveau: 'rouge', ventKmh: 26, rafalesKmh: 44, directionDeg: 225 },
      objectif: 0.64,
    })
  })

  it('reste dessinable sans aucune donnée', () => {
    const p = parametresFils(null)

    expect(p.recuperation).toBe(0)
    expect(p.bandes.total).toBe(0)
    expect(p.mer.niveau).toBeNull()
    expect(p.objectif).toBe(0)
  })

  it('borne les pourcentages', () => {
    const vie = { recuperation: { progression: 1.4 } }
    const objectifs = [{ principal: true, statut: 'en_cours', progression: { pourcentage: 140 } }]

    const p = parametresFils(donnees({ vie, objectifs }))

    expect(p.recuperation).toBe(1)
    expect(p.objectif).toBe(1)
  })
})

describe('le comportement des faisceaux', () => {
  it('fige le courant au noir et le trouble au rouge', () => {
    const base = { ventKmh: 20, rafalesKmh: 20, directionDeg: 0 }

    expect(agitation({ ...base, niveau: 'noir' })).toBe(0)
    expect(agitation({ ...base, niveau: 'rouge' })).toBeGreaterThan(agitation({ ...base, niveau: 'vert' }))
    expect(agitation({ ...base, niveau: 'vert', rafalesKmh: 50 })).toBeGreaterThan(
      agitation({ ...base, niveau: 'vert' }),
    )
  })

  it('resserre les strates quand le RPE monte', () => {
    expect(pasDesStrates(9)).toBeLessThan(pasDesStrates(6))
    expect(pasDesStrates(20)).toBeGreaterThanOrEqual(4)
  })

  it('tend les câbles à 100 %', () => {
    expect(mouDesCables(0)).toBe(1)
    expect(mouDesCables(1)).toBe(0)
    expect(mouDesCables(2)).toBe(0)
  })
})
