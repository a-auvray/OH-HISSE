import { describe, expect, it } from 'vitest'

import type { SeanceDuJour, SeanceLue } from '../../api/types'
import { depuisSeance, depuisSeanceDuJour, formulaireVierge, versEcriture } from './formulaire'

const SEANCE_DU_JOUR: SeanceDuJour = {
  bloc: { id: 4, nom: 'Force', type: 'force', numero: 3, total: 18, rang_modele: 2 },
  nom: 'C — Singles',
  poids: { kg: 75, a_jour: true },
  propositions: [
    {
      exercice_id: 1,
      exercice: 'Tractions',
      series: 3,
      reps: 1,
      rpe_cible: 9,
      lest_kg: 45,
      justifications: [],
    },
    {
      exercice_id: 2,
      exercice: 'Dips',
      series: 2,
      reps: 1,
      rpe_cible: 9,
      lest_kg: null,
      justifications: [],
    },
  ],
}

describe('formulaire de séance', () => {
  it('reprend la séance du jour avec le prévu', () => {
    const f = depuisSeanceDuJour(SEANCE_DU_JOUR)

    expect(f.bloc_id).toBe(4)
    expect(f.rang_modele).toBe(2)
    expect(f.groupes.map((g) => g.series.length)).toEqual([3, 2])
    expect(f.groupes[0]?.series[0]).toMatchObject({ reps: '1', lest: '45', rpe: '' })
    expect(f.groupes[1]?.series[0]?.lest).toBe('') // charge à choisir
  })

  it('exige les répétitions avant l’envoi', () => {
    const f = formulaireVierge(1)

    expect(versEcriture(f)).toEqual(['Exercice 1, série 1 : nombre de répétitions manquant.'])
  })

  it('envoie prévu et réalisé, lest décimal à la française', () => {
    const f = depuisSeanceDuJour(SEANCE_DU_JOUR)
    for (const g of f.groupes) for (const s of g.series) Object.assign(s, { lest: '46,25', rpe: '9.5' })

    const corps = versEcriture(f)

    expect(Array.isArray(corps)).toBe(false)
    if (Array.isArray(corps)) return
    expect(corps.series).toHaveLength(5)
    expect(corps.series[0]).toMatchObject({
      exercice_id: 1,
      reps: 1,
      lest_kg: 46.25,
      rpe: 9.5,
      reps_prevues: 1,
      lest_prevu_kg: 45,
      rpe_cible: 9,
    })
    expect(corps.nom).toBe('C — Singles')
  })

  it('regroupe les séries consécutives d’un même exercice', () => {
    const seance = {
      id: 1,
      date: '2026-11-16',
      nom: null,
      ressenti: 7,
      note: null,
      bloc_id: null,
      rang_modele: null,
      poids_du_corps_kg: 75,
      poids_a_jour: true,
      records: [],
      series: [
        { id: 1, ordre: 0, exercice_id: 1, reps: 5, lest_kg: 20, rpe: 8, echec: false },
        { id: 2, ordre: 1, exercice_id: 1, reps: 5, lest_kg: 20, rpe: 8.5, echec: false },
        { id: 3, ordre: 2, exercice_id: 2, reps: 8, lest_kg: 30, rpe: null, echec: false },
      ],
    } as SeanceLue

    const f = depuisSeance(seance)

    expect(f.groupes.map((g) => [g.exercice_id, g.series.length])).toEqual([
      [1, 2],
      [2, 1],
    ])
    expect(f.groupes[1]?.series[0]?.rpe).toBe('')
  })
})
