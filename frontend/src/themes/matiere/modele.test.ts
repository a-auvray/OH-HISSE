import { describe, expect, it } from 'vitest'

import type { DonneesBriefing } from '../../accueil/useBriefing'
import {
  chaleurDeLaBande,
  couleurDeRevenu,
  niveauDeMaree,
  nombreDeFranges,
  parametresMatiere,
} from './modele'

const MAREES = [
  { type: 'BM', instant: '2026-11-24T04:00:00' },
  { type: 'PM', instant: '2026-11-24T10:00:00' },
  { type: 'BM', instant: '2026-11-24T16:00:00' },
]

describe('niveauDeMaree', () => {
  it('vaut 0 à marée basse et 1 à pleine mer, à mi-chemin à mi-marée', () => {
    expect(niveauDeMaree(MAREES, new Date('2026-11-24T04:00:01'))).toBeCloseTo(0, 1)
    expect(niveauDeMaree(MAREES, new Date('2026-11-24T07:00:00'))).toBeCloseTo(0.5, 2)
    expect(niveauDeMaree(MAREES, new Date('2026-11-24T09:59:59'))).toBeCloseTo(1, 1)
  })

  it('redescend après la pleine mer', () => {
    expect(niveauDeMaree(MAREES, new Date('2026-11-24T13:00:00'))).toBeCloseTo(0.5, 2)
  })

  it('ne devine rien hors des marées connues', () => {
    expect(niveauDeMaree(MAREES, new Date('2026-11-24T02:00:00'))).toBeNull()
    expect(niveauDeMaree(MAREES, new Date('2026-11-24T20:00:00'))).toBeNull()
    expect(niveauDeMaree([], new Date())).toBeNull()
  })
})

describe('parametresMatiere', () => {
  const donnees = {
    seance: { bloc: { numero: 3, total: 4 }, propositions: [{ rpe_cible: 8 }] },
    objectifs: [
      { statut: 'en_cours', principal: false, progression: { pourcentage: 30 } },
      { statut: 'atteint', principal: false, progression: { pourcentage: 100 } },
      { statut: 'en_cours', principal: true, progression: { pourcentage: 88 } },
    ],
    mer: {
      danger: { niveau: 'rouge' },
      maintenant: { vent_kmh: 15, vent_direction_deg: 200 },
      marees: MAREES,
    },
    vie: { recuperation: { progression: 0.37 } },
  } as unknown as DonneesBriefing

  it('range les objectifs en cours, le principal d’abord', () => {
    const p = parametresMatiere(donnees, new Date('2026-11-24T07:00:00'))

    expect(p.objectifs).toEqual([0.88, 0.3])
    expect(p.recuperation).toBe(0.37)
    expect(p.mer.niveau).toBe('rouge')
    expect(p.mer.maree).toBeCloseTo(0.5, 2)
  })

  it('reste dessinable sans aucune donnée', () => {
    const p = parametresMatiere(null, new Date())

    expect(p.objectifs).toEqual([])
    expect(p.mer.maree).toBeNull()
    expect(p.bandes.total).toBe(0)
  })
})

describe('la matière', () => {
  it('chauffe l’acier avec l’effort et l’avancement du bloc', () => {
    expect(chaleurDeLaBande(9, 3, 4)).toBeGreaterThan(chaleurDeLaBande(6, 0, 4))
    expect(chaleurDeLaBande(20, 5, 4)).toBeLessThanOrEqual(1)
  })

  it('donne une couleur de revenu valide sur toute l’échelle', () => {
    for (const x of [-1, 0, 0.4, 1, 2]) expect(couleurDeRevenu(x)).toMatch(/^rgb\(\d+ \d+ \d+\)$/)
  })

  it('compte une frange de plus à mesure que la cible approche', () => {
    expect(nombreDeFranges(0)).toBe(1)
    expect(nombreDeFranges(1)).toBe(9)
    expect(nombreDeFranges(0.5)).toBeGreaterThan(nombreDeFranges(0.1))
  })
})
