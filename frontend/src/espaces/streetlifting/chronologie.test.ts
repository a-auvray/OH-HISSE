import { describe, expect, it } from 'vitest'

import type { BlocLu, PointEvolution } from '../../api/types'
import { agreger, blocDuJour, grilleDuMois } from './chronologie'

describe('grilleDuMois', () => {
  it('novembre 2026 commence un dimanche : la grille part du lundi 26 octobre', () => {
    const grille = grilleDuMois(2026, 10)

    expect(grille[0]?.[0]).toBe('2026-10-26')
    expect(grille[0]?.[6]).toBe('2026-11-01')
    expect(grille.at(-1)?.at(-1)).toBe('2026-12-06')
    expect(grille.every((s) => s.length === 7)).toBe(true)
  })

  it('un mois qui commence un lundi ne déborde pas avant', () => {
    expect(grilleDuMois(2026, 5)[0]?.[0]).toBe('2026-06-01')
  })
})

const bloc = (id: number, debut: string, fin: string | null, actif: boolean) =>
  ({ id, debut, fin, actif, nom: `B${id}` }) as BlocLu

describe('blocDuJour', () => {
  const blocs = [bloc(1, '2026-10-01', '2026-10-31', false), bloc(2, '2026-11-02', null, true)]

  it('trouve le bloc qui couvre le jour', () => {
    expect(blocDuJour(blocs, '2026-10-15', '2026-11-18')?.id).toBe(1)
    expect(blocDuJour(blocs, '2026-11-10', '2026-11-18')?.id).toBe(2)
  })

  it('un bloc actif sans fin s’arrête à aujourd’hui', () => {
    expect(blocDuJour(blocs, '2026-11-25', '2026-11-18')).toBeUndefined()
    expect(blocDuJour(blocs, '2026-11-01', '2026-11-18')).toBeUndefined()
  })
})

describe('agreger', () => {
  const point = (date: string, e1rm: number | null, tonnage: number, rpe: number | null) =>
    ({
      date,
      e1rm_lest_kg: e1rm,
      tonnage_kg: tonnage,
      rpe_moyen: rpe,
      series: 4,
      reps: 20,
    }) as PointEvolution

  const points = [
    point('2026-11-02', 40, 1000, 8), // lundi
    point('2026-11-05', 42.5, 1200, 7), // même semaine
    point('2026-11-12', null, 800, null),
  ]

  it('par séance : un point par séance qui a une valeur', () => {
    expect(agreger(points, 'e1rm_lest_kg', 'seance').map((p) => p.valeur)).toEqual([40, 42.5])
  })

  it('par semaine : meilleur 1RM, somme du tonnage, moyenne du RPE', () => {
    expect(agreger(points, 'e1rm_lest_kg', 'semaine')).toEqual([
      { date: '2026-11-02', valeur: 42.5, seances: 2 },
    ])
    expect(agreger(points, 'tonnage_kg', 'semaine').map((p) => p.valeur)).toEqual([2200, 800])
    expect(agreger(points, 'rpe_moyen', 'semaine')[0]?.valeur).toBe(7.5)
  })

  it('par mois', () => {
    expect(agreger(points, 'series', 'mois')).toEqual([{ date: '2026-11-01', valeur: 12, seances: 3 }])
  })
})
