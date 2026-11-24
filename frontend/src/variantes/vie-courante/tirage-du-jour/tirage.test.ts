import { afterEach, describe, expect, it } from 'vitest'

import { choisirEntree, niveauAnimation } from './tirage'

describe('choisirEntree', () => {
  it('tire la feuille à la première ouverture du jour, puis la laisse sèche', () => {
    expect(choisirEntree('cinema', null, '2026-11-19')).toBe('tirage')
    expect(choisirEntree('cinema', '2026-11-18', '2026-11-19')).toBe('tirage')
    expect(choisirEntree('cinema', '2026-11-19', '2026-11-19')).toBe('glisse')
  })

  it('se réduit en Sobre et s’arrête en Immobile', () => {
    expect(choisirEntree('sobre', null, '2026-11-19')).toBe('fondu')
    expect(choisirEntree('sobre', '2026-11-19', '2026-11-19')).toBe('fondu')
    expect(choisirEntree('immobile', null, '2026-11-19')).toBe('fixe')
  })
})

describe('niveauAnimation', () => {
  afterEach(() => {
    delete document.documentElement.dataset.animations
  })

  it('lit le réglage posé sur <html>, Cinéma par défaut', () => {
    expect(niveauAnimation()).toBe('cinema')
    document.documentElement.dataset.animations = 'sobre'
    expect(niveauAnimation()).toBe('sobre')
    document.documentElement.dataset.animations = 'immobile'
    expect(niveauAnimation()).toBe('immobile')
    document.documentElement.dataset.animations = 'inconnu'
    expect(niveauAnimation()).toBe('cinema')
  })
})
