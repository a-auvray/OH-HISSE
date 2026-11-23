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
  it('annonce la bascule de la mer et motive la une par elle', () => {
    const p = phraseDuJour(donnees(), MAINTENANT)

    expect(p.lignes).toEqual(['Force d’abord,', 'la mer avant 17h.'])
    expect(p.pourquoi).toEqual({ espace: 'marine', texte: 'passage au rouge à 17h' })
    expect(p.resume).toBe(
      'Séance 3 sur 4 du bloc Force : traction lestée 4×3 à +32,5 kg, RPE 8. En mer, prochaine pleine mer à 14h52, vent 26 km/h.',
    )
  })

  it('met le repos avant tout quand la récupération n’est pas finie', () => {
    const vie = { recuperation: { recupere: false, restant_h: 5.6 }, cheat_meal: { verdict: 'non' } }
    const p = phraseDuJour(donnees({ vie, mer: mer({ heures: [h(14, 'vert')] }) }), MAINTENANT)

    expect(p.lignes).toEqual(['Repos d’abord,', 'la mer est ouverte.'])
    expect(p.pourquoi).toEqual({ espace: 'vie-courante', texte: 'encore 6 h de récupération' })
  })

  it.each([
    ['rouge', 'la mer est fermée.'],
    ['noir', 'la mer est interdite.'],
  ])('dit la mer %s tout de suite', (niveau, attendu) => {
    const d = donnees({ mer: mer({ danger: { niveau, raisons: [] } }) })

    expect(phraseDuJour(d, MAINTENANT).lignes[1]).toBe(attendu)
  })

  it('reste dicible sans aucune donnée', () => {
    const p = phraseDuJour(null, MAINTENANT)

    expect(p.lignes).toEqual(['Journée libre,', 'le reste suit.'])
    expect(p.pourquoi.espace).toBe('streetlifting')
    expect(p.resume).toBe('')
  })

  it('ignore les heures déjà passées', () => {
    const d = donnees({ mer: mer({ heures: [h(9, 'rouge'), h(14, 'vert')] }) })

    expect(phraseDuJour(d, MAINTENANT).lignes[1]).toBe('la mer est ouverte.')
  })
})
