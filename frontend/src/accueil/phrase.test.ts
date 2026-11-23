import { describe, expect, it } from 'vitest'

import { phraseDuJour } from './phrase'
import type { DonneesBriefing } from './useBriefing'

const MAINTENANT = new Date('2026-11-23T13:05:00')
const h = (heure: number, danger: string) => ({
  instant: `2026-11-23T${String(heure).padStart(2, '0')}:00:00`,
  danger,
})

function mer(surcharge: Record<string, unknown> = {}) {
  return {
    spot: { nom: 'Ouistreham' },
    danger: { niveau: 'vert', raisons: [] },
    maintenant: { vent_kmh: 26.4, eau_c: 12 },
    heures: [h(12, 'vert'), h(14, 'vert'), h(16, 'vert'), h(17, 'rouge'), h(18, 'rouge')],
    marees: [
      { type: 'PM', instant: '2026-11-23T05:10:00', hauteur_m: 6.8, coefficient: 87 },
      { type: 'PM', instant: '2026-11-23T14:52:00', hauteur_m: 6.9, coefficient: 87 },
    ],
    ...surcharge,
  }
}

function donnees(surcharge: Record<string, unknown> = {}): DonneesBriefing {
  return {
    seance: {
      nom: 'Force · S3',
      bloc: { numero: 3, total: 4, nom: 'Force', type: 'force' },
      propositions: [{ exercice: 'Traction lestée', series: 4, reps: 3, rpe_cible: 8, lest_kg: 32.5 }],
    },
    objectifs: [],
    mer: mer(),
    vie: { recuperation: { recupere: true, restant_h: 0 }, cheat_meal: { verdict: 'oui' } },
    ...surcharge,
  } as unknown as DonneesBriefing
}

describe('phraseDuJour', () => {
  it('dit la séance du jour d’abord, puis annonce la bascule de la mer', () => {
    const p = phraseDuJour(donnees(), MAINTENANT)

    expect(p.lignes).toEqual(['Force · séance 3/4', 'Traction lestée 4×3 à +32,5 kg'])
    expect(p.pourquoi).toEqual({ espace: 'marine', texte: 'passage au rouge à 17h' })
    expect(p.resume).toBe(
      'Bloc Force, cible RPE 8. Récupération complète. Mer verte jusqu’à 17h, vent 26 km/h, puis danger rouge. Prochaine pleine mer à 14h52.',
    )
  })

  it('garde la séance en tête et signale la récupération qui n’est pas finie', () => {
    const vie = { recuperation: { recupere: false, restant_h: 5.6 }, cheat_meal: { verdict: 'non' } }
    const p = phraseDuJour(donnees({ vie, mer: mer({ heures: [h(14, 'vert')] }) }), MAINTENANT)

    expect(p.lignes[0]).toBe('Force · séance 3/4')
    expect(p.pourquoi).toEqual({ espace: 'vie-courante', texte: 'encore 6 h de récupération' })
    expect(p.resume).toContain('Récupération incomplète : encore 6 h.')
    expect(p.resume).toContain('Mer verte toute la journée')
  })

  it.each(['rouge', 'noir'])('dit clairement la mer %s, sans « fermée » ni « ouverte »', (niveau) => {
    const d = donnees({ mer: mer({ danger: { niveau, raisons: [] } }) })

    const p = phraseDuJour(d, MAINTENANT)

    expect(p.resume).toContain(`Mer : danger ${niveau}, vent 26 km/h. Pas de sortie conseillée.`)
    expect(p.pourquoi).toEqual({ espace: 'marine', texte: `danger ${niveau} en ce moment` })
  })

  it('reste dicible sans aucune donnée', () => {
    const p = phraseDuJour(null, MAINTENANT)

    expect(p.lignes).toEqual(['Pas de séance prévue,', 'journée libre.'])
    expect(p.pourquoi.espace).toBe('streetlifting')
    expect(p.resume).toBe('')
  })

  it('ignore les heures déjà passées', () => {
    const d = donnees({ mer: mer({ heures: [h(9, 'rouge'), h(14, 'vert')] }) })

    expect(phraseDuJour(d, MAINTENANT).resume).toContain('Mer verte toute la journée')
  })
})
