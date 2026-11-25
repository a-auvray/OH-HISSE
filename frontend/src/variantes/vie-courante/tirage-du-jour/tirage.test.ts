import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { choisirEntree, dureeEntree, niveauAnimation, useEntree } from './tirage'

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

describe('dureeEntree', () => {
  it('couvre l’animation la plus longue de chaque entrée', () => {
    // Tirage : le rose s'encre à 1220 ms pendant 600 ms.
    expect(dureeEntree('tirage')).toBeGreaterThanOrEqual(1220 + 600)
    expect(dureeEntree('glisse')).toBeGreaterThanOrEqual(700)
    expect(dureeEntree('fondu')).toBeGreaterThanOrEqual(250)
    expect(dureeEntree('fixe')).toBe(0)
  })
})

describe('useEntree', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete document.documentElement.dataset.animations
  })

  it('garde l’entrée tout le temps de ses animations, puis passe à fixe', () => {
    const { result } = renderHook(() => useEntree())
    expect(result.current).toBe('tirage')
    act(() => vi.advanceTimersByTime(dureeEntree('tirage') - 1))
    expect(result.current).toBe('tirage')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('fixe')
  })

  it('ne programme rien en Immobile', () => {
    document.documentElement.dataset.animations = 'immobile'
    const { result } = renderHook(() => useEntree())
    expect(result.current).toBe('fixe')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('annule son minuteur quand la feuille disparaît', () => {
    const { unmount } = renderHook(() => useEntree())
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
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
