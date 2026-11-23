import { describe, expect, it } from 'vitest'

import {
  altitudeDuSable,
  cheminDeLEau,
  cheminDeHoule,
  cheminDuSable,
  HAUT_DE_PLAGE_M,
  positionDeLEau,
  yDeHauteur,
} from './geometrieCoupe'

describe('altitudeDuSable', () => {
  it('descend du haut de plage jusqu’au large', () => {
    expect(altitudeDuSable(0)).toBeCloseTo(HAUT_DE_PLAGE_M)
    expect(altitudeDuSable(1)).toBeLessThan(0)
    let precedente = Infinity
    for (let u = 0; u <= 1; u += 0.05) {
      expect(altitudeDuSable(u)).toBeLessThan(precedente)
      precedente = altitudeDuSable(u)
    }
  })
})

describe('positionDeLEau', () => {
  it('recule vers le large à marée basse et monte vers la plage à marée haute', () => {
    const haute = positionDeLEau(6.9)
    const mediane = positionDeLEau(3.5)
    const basse = positionDeLEau(1)

    expect(haute).toBeLessThan(mediane)
    expect(mediane).toBeLessThan(basse)
  })

  it('retombe sur les bords : plage noyée ou eau au large', () => {
    expect(positionDeLEau(20)).toBe(0)
    expect(positionDeLEau(-5)).toBe(1)
  })

  it('place l’eau là où le sable est à la hauteur de la marée', () => {
    const u = positionDeLEau(4)

    expect(altitudeDuSable(u)).toBeCloseTo(4, 1)
  })
})

describe('chemins', () => {
  it('ferme le sable par le bas de la feuille', () => {
    expect(cheminDuSable()).toMatch(/^M0\.0,.*Z$/)
  })

  it('ne dessine pas d’eau quand elle est au-delà du cadre', () => {
    expect(cheminDeLEau(-5)).toBe('')
    expect(cheminDeLEau(4)).toMatch(/^M.*Z$/)
  })

  it('met la surface à la bonne hauteur de dessin', () => {
    expect(cheminDeLEau(4)).toContain(`,${yDeHauteur(4).toFixed(1)}`)
  })

  it('trace une houle qui oscille autour du niveau', () => {
    const d = cheminDeHoule(100, 6, 40, 0, 80)

    expect(d.startsWith('M0.0,100.0')).toBe(true)
    expect(d).toContain('10.0,94.0')
    expect(d).toContain('30.0,106.0')
  })
})
