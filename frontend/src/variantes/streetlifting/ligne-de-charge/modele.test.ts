import { describe, expect, it } from 'vitest'

import type { ObjectifLu } from '../../../api/types'
import {
  amplitudeFleche,
  auRepos,
  avancerRessort,
  chaleur,
  chargeTotale,
  cheminPoutre,
  echelleProfondeur,
  etiquetteCourbe,
  etiquetteFleche,
  geometrieCourbe,
  graduationsNettes,
  masse,
  phraseCible,
  phraseFleche,
  phraseProfondeur,
  plaqueInitiale,
  plaquesDuJour,
  pointLePlusProche,
  pourcentage,
  pourcentageCible,
  profilPoutre,
  profondeur,
  rapport,
  rapportAuMeilleur,
  recordTotal,
  RESSORT_LOURD,
  reperesDates,
  retardInertie,
  teinteChaleur,
  teinteLigne,
} from './modele'
import { objectifDeLaSeance } from './useReferences'

describe('la charge et le record', () => {
  it('additionne le poids du corps et le lest, et dit quand il manque', () => {
    expect(chargeTotale(74.2, 32.5)).toBeCloseTo(106.7)
    expect(chargeTotale(74.2, 0)).toBe(74.2)
    expect(chargeTotale(null, 10)).toBeNull()
    expect(chargeTotale(74.2, null)).toBeNull()
  })

  it('prend le meilleur e1RM total de l’historique, sans compter les séances sans estimation', () => {
    expect(recordTotal([{ e1rm_total_kg: 110 }, { e1rm_total_kg: null }, { e1rm_total_kg: 115.7 }])).toBe(
      115.7,
    )
    expect(recordTotal([{ e1rm_total_kg: null }])).toBeNull()
    expect(recordTotal([])).toBeNull()
  })

  it('compare une charge à son record', () => {
    expect(pourcentage(rapport(106.7, 115.7) ?? 0)).toBe(92)
    expect(rapport(null, 100)).toBeNull()
    expect(rapport(100, null)).toBeNull()
    expect(rapport(100, 0)).toBeNull()
  })
})

describe('la flèche', () => {
  it('vaut 12 px pour une charge légère et 48 px au record dépassé', () => {
    expect(amplitudeFleche(0.5)).toBe(12)
    expect(amplitudeFleche(0.6)).toBe(12)
    expect(amplitudeFleche(1.05)).toBe(48)
    expect(amplitudeFleche(1.3)).toBe(48)
  })

  it('suit 12 + 36 × (r − 0,6) / 0,45 entre les deux', () => {
    expect(amplitudeFleche(0.98)).toBeCloseTo(42.4, 1)
    expect(amplitudeFleche(0.825)).toBeCloseTo(30, 5)
  })

  it('laisse la ligne à plat quand la charge est inconnue', () => {
    expect(amplitudeFleche(null)).toBe(0)
  })
})

describe('la masse des plaques', () => {
  it('croît avec le lest, à 1 pour le poids du corps', () => {
    expect(masse(null)).toBe(1)
    expect(masse(0)).toBe(1)
    expect(masse(32.5)).toBeCloseTo(1.8125)
    expect(masse(40)).toBe(2)
  })

  it('retarde la plus lourde sans jamais dépasser 60 ms', () => {
    expect(retardInertie(1)).toBe(0)
    expect(retardInertie(1.5)).toBeCloseTo(30)
    expect(retardInertie(5)).toBe(60)
  })
})

describe('la déformée', () => {
  it('est nulle aux appuis et vaut 1 à son maximum', () => {
    const profil = profilPoutre(100, 0.5)
    expect(profil[0]).toBe(0)
    expect(profil[100]).toBeCloseTo(0, 10)
    expect(Math.max(...profil)).toBeCloseTo(1, 10)
    expect(profil.indexOf(Math.max(...profil))).toBe(50)
  })

  it('est symétrique quand la charge est au milieu', () => {
    const profil = profilPoutre(100, 0.5)
    for (let i = 0; i <= 100; i += 10) expect(profil[i]).toBeCloseTo(profil[100 - i] ?? NaN, 10)
  })

  it('penche du côté de la charge, et son maximum n’est pas au point de charge', () => {
    const profil = profilPoutre(200, 0.25)
    const sommet = profil.indexOf(Math.max(...profil))
    // Pour une charge à 25 %, le point le plus bas se décale vers le milieu de la poutre.
    expect(sommet).toBeGreaterThan(50)
    expect(sommet).toBeLessThan(100)
    expect(profil.every((v) => v >= 0 && v <= 1)).toBe(true)
  })

  it('reste valide quand la charge est au bord', () => {
    expect(profilPoutre(50, 0).every(Number.isFinite)).toBe(true)
    expect(profilPoutre(50, 1).every(Number.isFinite)).toBe(true)
  })

  it('trace un chemin de repos à plat et un chemin fléchi', () => {
    expect(cheminPoutre(0, 18, 40, 0.5)).toBe('')
    const plat = cheminPoutre(400, 18, 0, 0.5, 4)
    expect(plat).toBe('M0.0,18.0 L100.0,18.0 L200.0,18.0 L300.0,18.0 L400.0,18.0')
    const flechi = cheminPoutre(400, 18, 40, 0.5, 4)
    expect(flechi.startsWith('M0.0,18.0')).toBe(true)
    expect(flechi).toContain('L200.0,58.0')
  })
})

describe('l’échelle de chauffe', () => {
  it('va de 0 à 1 entre le RPE 6 et le RPE 10', () => {
    expect(chaleur(6)).toBe(0)
    expect(chaleur(8)).toBe(0.5)
    expect(chaleur(10)).toBe(1)
    expect(chaleur(4)).toBe(0)
    expect(chaleur(11)).toBe(1)
  })

  it('n’utilise que des jetons de couleur', () => {
    expect(teinteChaleur(8)).toBe('color-mix(in srgb, var(--texte) 50%, var(--accent))')
    expect(teinteLigne(null)).toBe('var(--texte)')
    expect(teinteLigne(6)).toBe('color-mix(in srgb, var(--texte) 60%, var(--accent))')
    expect(teinteLigne(10)).toBe('color-mix(in srgb, var(--texte) 100%, var(--accent))')
    for (const rpe of [6, 6.5, 7, 8, 9.5, 10]) expect(teinteChaleur(rpe)).not.toMatch(/#|rgb\(/)
  })
})

describe('l’échelle de profondeur', () => {
  it('va de 60 à 110 % par pas de 10', () => {
    const e = echelleProfondeur([92, 90, 86, 100])
    expect(e.min).toBe(60)
    expect(e.max).toBe(110)
    expect(e.graduations).toEqual([60, 70, 80, 90, 100, 110])
  })

  it('s’élargit quand une valeur sort de l’intervalle', () => {
    expect(echelleProfondeur([125]).max).toBe(130)
    expect(echelleProfondeur([52]).min).toBe(50)
    expect(echelleProfondeur([]).graduations).toEqual([60, 70, 80, 90, 100, 110])
  })

  it('range le haut de l’échelle sous la ligne et le bas à la hauteur donnée', () => {
    const e = echelleProfondeur([])
    expect(profondeur(60, e, 500)).toBe(0)
    expect(profondeur(110, e, 500)).toBe(500)
    expect(profondeur(85, e, 500)).toBe(250)
  })
})

describe('le ressort', () => {
  it('rejoint sa cible et s’y pose', () => {
    let etat = { x: 0, v: 0 }
    for (let i = 0; i < 240; i += 1) etat = avancerRessort(etat, 40, RESSORT_LOURD, 1 / 60)
    expect(auRepos(etat, 40)).toBe(true)
  })

  it('dépasse peu sa cible : un seul léger rebond', () => {
    let etat = { x: 0, v: 0 }
    let max = 0
    for (let i = 0; i < 240; i += 1) {
      etat = avancerRessort(etat, 40, RESSORT_LOURD, 1 / 60)
      max = Math.max(max, etat.x)
    }
    expect(max).toBeGreaterThan(40)
    expect(max).toBeLessThan(44)
  })

  it('reste stable même quand une image dure longtemps', () => {
    let etat = { x: 0, v: 0 }
    for (let i = 0; i < 60; i += 1) etat = avancerRessort(etat, 40, RESSORT_LOURD, 0.05)
    expect(Number.isFinite(etat.x)).toBe(true)
    expect(Math.abs(etat.x - 40)).toBeLessThan(1)
  })

  it('n’est pas au repos tant qu’il bouge', () => {
    expect(auRepos({ x: 40, v: 5 }, 40)).toBe(false)
    expect(auRepos({ x: 38, v: 0 }, 40)).toBe(false)
  })
})

describe('les plaques du jour', () => {
  const propositions = [
    {
      exercice_id: 1,
      exercice: 'Traction',
      series: 4,
      reps: 3,
      rpe_cible: 8,
      lest_kg: 32.5,
      justifications: ['a'],
    },
    { exercice_id: 2, exercice: 'Dips', series: 4, reps: 5, rpe_cible: 8, lest_kg: null, justifications: [] },
    {
      exercice_id: 3,
      exercice: 'Muscle-up',
      series: 5,
      reps: 2,
      rpe_cible: 7,
      lest_kg: 0,
      justifications: [],
    },
  ]
  const records = new Map<number, number | null>([
    [1, 115.7],
    [2, 126.7],
    [3, null],
  ])

  it('calcule la charge totale, le pourcentage et la flèche de chaque exercice', () => {
    const [traction, dips, mu] = plaquesDuJour(propositions, 74.2, records)
    expect(traction?.total).toBeCloseTo(106.7)
    expect(traction?.pct).toBe(92)
    expect(traction?.amplitude).toBeCloseTo(amplitudeFleche(106.7 / 115.7), 5)
    expect(traction?.amplitude).toBeGreaterThan(30)
    expect(traction?.raisons).toEqual(['a'])
    expect(dips?.total).toBeNull()
    expect(dips?.pct).toBeNull()
    expect(dips?.amplitude).toBe(0)
    expect(mu?.total).toBe(74.2)
    expect(mu?.pct).toBeNull()
  })

  it('ne devine rien sans poids du corps', () => {
    const [traction] = plaquesDuJour(propositions, null, records)
    expect(traction?.total).toBeNull()
    expect(traction?.pct).toBeNull()
  })

  it('met en avant la première plaque dont la charge est connue', () => {
    const plaques = plaquesDuJour(propositions, 74.2, records)
    expect(plaqueInitiale(plaques)).toBe('1-0')
    expect(plaqueInitiale(plaquesDuJour([propositions[1]!], 74.2, records))).toBe('2-0')
    expect(plaqueInitiale([])).toBeNull()
  })

  it('place la cible en pourcentage de l’e1RM de l’exercice', () => {
    expect(pourcentageCible(74.2, 50, 115.7)).toBeCloseTo(107.3, 1)
    expect(pourcentageCible(null, 50, 115.7)).toBeNull()
    expect(pourcentageCible(74.2, 50, null)).toBeNull()
  })
})

describe('les phrases', () => {
  it('dit la flèche en texte', () => {
    expect(etiquetteFleche(106.7, 98)).toBe('106,7 kg · 98 % du record')
    expect(phraseFleche('Traction', 106.7, 92)).toBe(
      'Traction : charge totale 106,7 kg, 92 % de ton record estimé.',
    )
    expect(phraseFleche('Traction', 106.7, null)).toBe(
      'Traction : charge totale 106,7 kg, sans record pour la comparer.',
    )
    expect(phraseFleche('Dips', null, null)).toBe('Dips : charge totale inconnue, la ligne reste à plat.')
  })

  it('dit la profondeur de chaque plaque, ou pourquoi on ne peut pas', () => {
    const [a, b, c, d] = plaquesDuJour(
      [
        { exercice_id: 1, exercice: 'A', series: 1, reps: 1, rpe_cible: 8, lest_kg: 30, justifications: [] },
        {
          exercice_id: 2,
          exercice: 'B',
          series: 1,
          reps: 1,
          rpe_cible: 8,
          lest_kg: null,
          justifications: [],
        },
        { exercice_id: 3, exercice: 'C', series: 1, reps: 1, rpe_cible: 8, lest_kg: 10, justifications: [] },
        { exercice_id: 4, exercice: 'D', series: 1, reps: 1, rpe_cible: 8, lest_kg: 10, justifications: [] },
      ],
      80,
      new Map([
        [1, 120],
        [4, null],
      ]),
    )
    expect(phraseProfondeur(a!)).toBe('92 % de l’e1RM')
    expect(phraseProfondeur(b!)).toBe('charge à choisir')
    expect(phraseProfondeur(c!)).toBe('pas encore d’e1RM')
    expect(phraseProfondeur(d!)).toBe('pas encore d’e1RM')
    const [sansPoids] = plaquesDuJour(
      [{ exercice_id: 1, exercice: 'A', series: 1, reps: 1, rpe_cible: 8, lest_kg: 30, justifications: [] }],
      null,
      new Map(),
    )
    expect(phraseProfondeur(sansPoids!)).toBe('poids du corps inconnu')
  })

  it('dit où en est la cible', () => {
    expect(phraseCible(63.6, 'J−112')).toBe('64 % du chemin · J−112')
    expect(phraseCible(null, 'J−112')).toBe('J−112')
  })

  it('compare le point lu au meilleur de la courbe', () => {
    expect(etiquetteCourbe(40, 'kg de lest', 96, true)).toBe('40 kg de lest · 96 % du record')
    expect(etiquetteCourbe(2100, 'kg', 95, false)).toBe(
      `${new Intl.NumberFormat('fr-FR').format(2100)} kg · 95 % du maximum`,
    )
    const points = [
      { date: '2026-11-04', valeur: 35.5, seances: 1 },
      { date: '2026-11-21', valeur: 41.5, seances: 1 },
    ]
    expect(rapportAuMeilleur(41.5, points)).toBe(1)
    expect(rapportAuMeilleur(35.5, points)).toBeCloseTo(0.855, 3)
    expect(rapportAuMeilleur(0, [{ date: '2026-11-04', valeur: 0, seances: 1 }])).toBeNull()
  })
})

describe('la courbe', () => {
  it('arrondit l’intervalle à des graduations lisibles', () => {
    const e = graduationsNettes(35.5, 41.5)
    expect(e.min).toBeLessThanOrEqual(35.5)
    expect(e.max).toBeGreaterThanOrEqual(41.5)
    expect(e.graduations[0]).toBe(e.min)
    expect(e.graduations.at(-1)).toBe(e.max)
    expect(graduationsNettes(5, 5).graduations.length).toBeGreaterThan(1)
  })

  it('place les points proportionnellement aux dates', () => {
    const g = geometrieCourbe(
      [
        { date: '2026-11-01', valeur: 10, seances: 1 },
        { date: '2026-11-03', valeur: 20, seances: 1 },
        { date: '2026-11-11', valeur: 30, seances: 1 },
      ],
      1000,
      400,
    )
    expect(g.xs[0]).toBe(0)
    expect(g.xs[1]).toBeCloseTo(200)
    expect(g.xs[2]).toBe(1000)
    // Plus la valeur est haute, plus l'ordonnée est petite (le haut de la page est à 0).
    expect(g.ys[2]).toBeLessThan(g.ys[0] ?? 0)
    expect(g.graduations.length).toBeGreaterThan(2)
  })

  it('met un point seul au milieu et gère l’absence de points', () => {
    expect(geometrieCourbe([{ date: '2026-11-01', valeur: 10, seances: 1 }], 800, 300).xs).toEqual([400])
    expect(geometrieCourbe([], 800, 300).xs).toEqual([])
  })

  it('trouve le point le plus proche et répartit les repères de date', () => {
    expect(pointLePlusProche([0, 100, 400], 130)).toBe(1)
    expect(pointLePlusProche([0, 100, 400], 300)).toBe(2)
    expect(reperesDates(3)).toEqual([0, 1, 2])
    expect(reperesDates(9, 5)).toEqual([0, 2, 4, 6, 8])
    expect(reperesDates(0)).toEqual([])
  })
})

describe('l’objectif tracé', () => {
  const objectif = (o: Partial<ObjectifLu>): ObjectifLu => ({
    id: 1,
    titre: 't',
    type: 'max',
    exercice_id: 1,
    valeur_cible_kg: 50,
    date_cible: '2027-03-15',
    principal: false,
    statut: 'en_cours',
    exercice: 'Traction',
    jours_restants: 100,
    progression: null,
    blocs: [],
    ...o,
  })

  it('préfère le principal, parmi les objectifs en cours sur un exercice de la séance', () => {
    const liste = [
      objectif({ id: 1 }),
      objectif({ id: 2, principal: true }),
      objectif({ id: 3, exercice_id: 9 }),
    ]
    expect(objectifDeLaSeance(liste, [1, 2])?.id).toBe(2)
  })

  it('ignore les objectifs atteints, abandonnés ou sur un autre exercice', () => {
    const liste = [objectif({ id: 1, statut: 'atteint' }), objectif({ id: 2, exercice_id: 9 })]
    expect(objectifDeLaSeance(liste, [1])).toBeNull()
    expect(objectifDeLaSeance([], [1])).toBeNull()
  })
})
