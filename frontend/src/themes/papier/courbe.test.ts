import { describe, expect, it } from 'vitest'

import { cheminLisse, echelle, graduations } from './courbe'

describe('cheminLisse', () => {
  it('ne trace rien sans point, et un simple départ avec un seul point', () => {
    expect(cheminLisse([])).toBe('')
    expect(cheminLisse([{ x: 1, y: 2 }])).toBe('M1,2')
  })

  it('passe par chaque point, avec une courbe entre deux', () => {
    const chemin = cheminLisse([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ])

    expect(chemin.startsWith('M0.0,0.0')).toBe(true)
    expect(chemin.match(/C/g)).toHaveLength(2)
    expect(chemin.endsWith('20.0,0.0')).toBe(true)
  })
})

describe('echelle', () => {
  it('place une valeur dans la plage demandée, y compris à l’envers', () => {
    expect(echelle(5, 0, 10, 0, 100)).toBe(50)
    expect(echelle(0, 0, 10, 100, 0)).toBe(100)
  })

  it('donne le milieu quand la plage est nulle', () => {
    expect(echelle(3, 3, 3, 0, 100)).toBe(50)
  })
})

describe('graduations', () => {
  it('donne des valeurs rondes dans la plage', () => {
    expect(graduations(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10])
    expect(graduations(35.5, 41.5, 3)).toEqual([36, 38, 40])
    expect(graduations(0, 1000, 4)).toEqual([0, 250, 500, 750, 1000])
    expect(graduations(40.9, 49.1, 4)).toEqual([42.5, 45, 47.5])
  })

  it('se contente d’une valeur quand la plage est nulle', () => {
    expect(graduations(5, 5)).toEqual([5])
  })
})
