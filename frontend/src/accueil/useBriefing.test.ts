import { describe, expect, it } from 'vitest'

import { type DonneesBriefing, indicateursDuBriefing, salutation } from './useBriefing'

// Seuls les champs lus par le briefing sont renseignés.
const donnees = {
  seance: { nom: 'Force · S3', bloc: { numero: 3, total: 4 }, propositions: [{}, {}, {}] },
  objectifs: [
    { principal: false, statut: 'en_cours', titre: 'Dips +70 kg', valeur_cible_kg: 70, progression: null },
    {
      principal: true,
      statut: 'en_cours',
      titre: 'Traction +50 kg',
      valeur_cible_kg: 50,
      progression: { e1rm_lest_kg: 41.5, pourcentage: 64 },
    },
  ],
  mer: {
    spot: { nom: 'Ouistreham' },
    danger: { niveau: 'rouge', raisons: [{ texte: 'Vent de sud-ouest' }] },
    maintenant: { eau_c: 12.4 },
  },
  vie: { recuperation: { recupere: false, restant_h: 5.6 }, cheat_meal: { verdict: 'oui' } },
} as unknown as DonneesBriefing

const par = (liste: ReturnType<typeof indicateursDuBriefing>) =>
  Object.fromEntries(liste.map((i) => [i.espace, i]))

describe('indicateursDuBriefing', () => {
  it('résume chaque espace, l’objectif principal en premier', () => {
    const i = par(indicateursDuBriefing(donnees))

    expect(i.streetlifting).toMatchObject({ valeur: 'Force · S3', detail: 'Séance 3 / 4 · 3 exercices' })
    expect(i['vie-courante']).toMatchObject({
      valeur: 'Encore 6 h',
      detail: 'Écart : ce soir, t’as le droit',
    })
    expect(i.marine).toMatchObject({ valeur: 'Rouge · eau 12 °C', detail: 'Vent de sud-ouest' })
    expect(i.objectifs).toMatchObject({ valeur: '+41,5 / 50 kg', detail: 'Traction +50 kg · 64 %' })
  })

  it('reste lisible sans aucune donnée : un tiret, et de quoi commencer', () => {
    const liste = indicateursDuBriefing(null)

    expect(liste).toHaveLength(4)
    expect(liste.every((i) => i.valeur === null && i.detail !== '')).toBe(true)
  })

  it('indique que la récupération est complète', () => {
    const vie = { recuperation: { recupere: true, restant_h: 0 }, cheat_meal: { verdict: 'non' } }
    const i = par(indicateursDuBriefing({ ...donnees, vie } as unknown as DonneesBriefing))

    expect(i['vie-courante']).toMatchObject({ valeur: 'Récupéré', detail: 'Écart : pas cette fois' })
  })
})

describe('salutation', () => {
  it.each([
    [3, 'Bonsoir'],
    [9, 'Bonjour'],
    [17, 'Bonjour'],
    [18, 'Bonsoir'],
  ])('à %i h : %s', (heure, attendu) => {
    expect(salutation(heure)).toBe(attendu)
  })
})
