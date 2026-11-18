import { describe, expect, it } from 'vitest'

import { sensDuTrajet } from './directions'

describe('sensDuTrajet', () => {
  it.each([
    ['/', '/vie-courante', 'haut'],
    ['/', '/objectifs', 'bas'],
    ['/', '/streetlifting', 'gauche'],
    ['/', '/marine', 'droite'],
  ])('de %s vers %s : on part vers le %s', (depuis, vers, sens) => {
    expect(sensDuTrajet(depuis, vers)).toBe(sens)
  })

  it.each([
    ['/vie-courante', 'bas'],
    ['/objectifs', 'haut'],
    ['/streetlifting', 'droite'],
    ['/marine', 'gauche'],
  ])('de %s vers l’accueil : on revient vers le %s', (depuis, sens) => {
    expect(sensDuTrajet(depuis, '/')).toBe(sens)
  })

  it('une adresse inconnue donne un simple fondu', () => {
    expect(sensDuTrajet('/', '/inconnue')).toBeNull()
  })
})
