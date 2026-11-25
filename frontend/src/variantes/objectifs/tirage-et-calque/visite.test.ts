import { afterEach, describe, expect, it } from 'vitest'

import {
  CLE_VISITE,
  developpementComplet,
  ecrireVisite,
  joursDepuis,
  lireVisite,
  type Visite,
} from './visite'

const visite: Visite = { jour: '2026-11-20', empreinte: 'abc', pourcentages: { '1': 77 } }

afterEach(() => localStorage.clear())

describe('la dernière visite', () => {
  it('se relit telle qu’on l’a écrite', () => {
    expect(lireVisite()).toBeNull()
    ecrireVisite(visite)
    expect(lireVisite()).toEqual(visite)
  })

  it('ignore un contenu abîmé ou d’une autre forme', () => {
    localStorage.setItem(CLE_VISITE, '{pas du json')
    expect(lireVisite()).toBeNull()
    localStorage.setItem(CLE_VISITE, JSON.stringify({ jour: 3 }))
    expect(lireVisite()).toBeNull()
    localStorage.setItem(CLE_VISITE, 'null')
    expect(lireVisite()).toBeNull()
  })

  it('ne casse rien quand le stockage est refusé', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('quota')
    }
    try {
      expect(() => ecrireVisite(visite)).not.toThrow()
    } finally {
      Storage.prototype.setItem = original
    }
  })

  it('développe la planche en entier à la première visite, un nouveau jour, ou quand une donnée change', () => {
    expect(developpementComplet(null, '2026-11-20', 'abc')).toBe(true)
    expect(developpementComplet(visite, '2026-11-21', 'abc')).toBe(true)
    expect(developpementComplet(visite, '2026-11-20', 'autre')).toBe(true)
    expect(developpementComplet(visite, '2026-11-20', 'abc')).toBe(false)
  })

  it('compte les jours depuis la dernière visite', () => {
    expect(joursDepuis(visite, '2026-11-25')).toBe(5)
    expect(joursDepuis(null, '2026-11-25')).toBeNull()
  })
})
