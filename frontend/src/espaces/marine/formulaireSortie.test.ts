import { describe, expect, it } from 'vitest'

import type { Sortie } from '../../api/types'
import { decalageParis, depuisSortie, formulaireVierge, versEcriture } from './formulaireSortie'

describe('formulaire de sortie', () => {
  it('heure d’hiver et heure d’été à Paris', () => {
    expect(decalageParis('2026-11-20', '14:00')).toBe('+01:00')
    expect(decalageParis('2026-07-14', '14:00')).toBe('+02:00')
  })

  it('date et heure du jour, à l’heure de Paris', () => {
    const f = formulaireVierge(new Date('2026-11-20T22:30:00Z'), 2)

    expect(f.date).toBe('2026-11-20')
    expect(f.heure).toBe('23:30')
    expect(f.spot_id).toBe(2)
  })

  it('envoie une heure avec son fuseau et seulement les champs du mode', () => {
    const f = {
      ...formulaireVierge(new Date('2026-11-20T13:00:00Z'), 1),
      distance_m: '1200',
      profondeur_max_m: '9',
    }

    const corps = versEcriture(f)

    expect(Array.isArray(corps)).toBe(false)
    if (Array.isArray(corps)) return
    expect(corps.debut).toBe('2026-11-20T14:00:00+01:00')
    expect(corps.distance_m).toBe(1200)
    expect(corps.profondeur_max_m).toBeNull() // pas une plongée
    expect(corps.eau_c).toBeNull() // relevée automatiquement
  })

  it('accepte la virgule décimale et signale une durée absente', () => {
    const f = { ...formulaireVierge(new Date(), null), eau_c: '11,5', duree_min: '' }

    expect(versEcriture(f)).toEqual(['Durée : un nombre de minutes.'])
    const corps = versEcriture({ ...f, duree_min: '45' })
    expect(!Array.isArray(corps) && corps.eau_c).toBe(11.5)
  })

  it('ne reprend pas comme saisies les conditions relevées par l’appli', () => {
    const sortie = {
      id: 1,
      type: 'nage',
      debut: '2026-11-20T13:00:00Z',
      duree_min: 40,
      eau_c: 12.3,
      conditions_relevees: true,
      spot: 'Colleville-Montgomery',
      spot_id: 2,
    } as Sortie

    const f = depuisSortie(sortie)

    expect(f.heure).toBe('14:00')
    expect(f.eau_c).toBe('')
  })
})
