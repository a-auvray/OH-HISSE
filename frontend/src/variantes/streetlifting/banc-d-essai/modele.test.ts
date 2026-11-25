import { describe, expect, it } from 'vitest'

import type { ObjectifLu, PointEvolution, Proposition } from '../../../api/types'
import {
  dateDePV,
  effortEquivalent,
  graduations,
  historiqueDouzeSemaines,
  indexLePlusProche,
  intensiteDuJour,
  lectureCourbe,
  miseEnPageCourbe,
  miseEnPageSerie,
  objectifDeLExercice,
  phraseLimiteVisee,
  pourcentageEffort,
  pourcentageSerie,
  referenceDepuis,
  regrouperSeries,
  seriesPrevues,
  typoIntensite,
} from './modele'

const point = (date: string, lest: number | null, total: number | null): PointEvolution => ({
  seance_id: 1,
  date,
  e1rm_lest_kg: lest,
  e1rm_total_kg: total,
  tonnage_kg: 2000,
  series: 4,
  reps: 12,
  rpe_moyen: 8,
  poids_du_corps_kg: 74.2,
})

const proposition = (surcharge: Partial<Proposition> = {}): Proposition => ({
  exercice_id: 1,
  exercice: 'Traction',
  series: 4,
  reps: 3,
  rpe_cible: 8,
  lest_kg: 32.5,
  justifications: [],
  ...surcharge,
})

describe('la table RPE (alignée sur le backend)', () => {
  it('lit les lignes de la table de Tuchscherer', () => {
    // Les mêmes valeurs que backend/app/moteurs/rpe.py : 1 rep à RPE 10 = 100 %, 5 reps à RPE 8 = effort 7 = 81,1 %.
    expect(pourcentageSerie(1, 10)).toBe(1)
    expect(pourcentageSerie(5, 8)).toBeCloseTo(0.811, 6)
    expect(pourcentageSerie(7, 10)).toBeCloseTo(0.811, 6)
    expect(pourcentageSerie(3, 8)).toBeCloseTo(0.863, 6)
  })

  it('interpole les demi-points comme le backend (moyenne de deux lignes)', () => {
    // 3 reps à RPE 8,5 : effort 4,5 → entre 89,2 % et 86,3 %.
    expect(pourcentageSerie(3, 8.5)).toBeCloseTo((0.892 + 0.863) / 2, 6)
  })

  it('refuse ce que la table ne couvre pas', () => {
    expect(pourcentageSerie(0, 8)).toBeNull()
    expect(pourcentageSerie(13, 8)).toBeNull()
    expect(pourcentageSerie(5, 5.5)).toBeNull()
    expect(pourcentageSerie(5, 8.25)).toBeNull()
    expect(pourcentageEffort(0.5)).toBeNull()
    expect(pourcentageEffort(17)).toBeNull()
  })

  it('calcule l’effort équivalent : reps + réserve', () => {
    expect(effortEquivalent(5, 8)).toBe(7)
    expect(effortEquivalent(3, 10)).toBe(3)
  })
})

describe('la référence d’un exercice', () => {
  it('prend le dernier 1RM estimé et en tire le poids du corps', () => {
    const r = referenceDepuis([
      point('2026-11-21', 41.5, 115.7),
      point('2026-11-04', 35.5, 109.7),
      point('2026-11-24', null, null),
    ])
    expect(r).toMatchObject({ e1rmTotal: 115.7, e1rmLest: 41.5, date: '2026-11-21' })
    expect(r?.poidsDuCorps).toBeCloseTo(74.2, 6)
  })

  it('n’invente rien sans estimation', () => {
    expect(referenceDepuis([])).toBeNull()
    expect(referenceDepuis([point('2026-11-04', null, null)])).toBeNull()
  })

  it('garde douze semaines d’historique à partir de la dernière séance', () => {
    const h = historiqueDouzeSemaines([
      point('2026-05-01', 30, 104),
      point('2026-09-10', 38, 112),
      point('2026-11-21', 41.5, 115.7),
      point('2026-11-22', null, null),
    ])
    expect(h.map((p) => p.date)).toEqual(['2026-09-10', '2026-11-21'])
    expect(historiqueDouzeSemaines([])).toEqual([])
  })
})

describe('les séries prévues', () => {
  it('place chaque série par sa charge totale et son intensité', () => {
    const series = seriesPrevues(proposition(), 74.2, 115.7)
    expect(series).toHaveLength(4)
    expect(series[0]).toMatchObject({ indice: 1, reps: 3, rpe: 8, effort: 5 })
    expect(series[0]?.chargeTotale).toBeCloseTo(106.7, 6)
    expect(series[0]?.intensite).toBeCloseTo(106.7 / 115.7, 6)
  })

  it('retombe sur l’intensité de la table quand le 1RM manque', () => {
    const [serie] = seriesPrevues(proposition(), 74.2, null)
    expect(serie?.intensite).toBeCloseTo(0.863, 6)
  })

  it('garde une série sans charge quand le lest est à choisir ou le poids inconnu', () => {
    expect(seriesPrevues(proposition({ lest_kg: null }), 74.2, 115.7)[0]?.chargeTotale).toBeNull()
    expect(seriesPrevues(proposition(), null, 115.7)[0]?.chargeTotale).toBeNull()
  })

  it('regroupe les séries identiques en un seul point', () => {
    const points = regrouperSeries([
      ...seriesPrevues(proposition(), 74.2, 115.7),
      ...seriesPrevues(proposition({ series: 1, reps: 5, lest_kg: 20 }), 74.2, 115.7),
      ...seriesPrevues(proposition({ lest_kg: null }), 74.2, 115.7),
    ])
    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ effort: 7, nombre: 1 })
    expect(points[1]).toMatchObject({ effort: 5, nombre: 4 })
  })

  it('moyenne l’intensité du jour, ou renvoie null sans rien à mesurer', () => {
    const series = [
      ...seriesPrevues(proposition(), 74.2, 115.7),
      ...seriesPrevues(proposition({ exercice_id: 2, lest_kg: 0, reps: 2, rpe_cible: 7 }), 74.2, 100),
    ]
    const attendu = (4 * (106.7 / 115.7) + 4 * (74.2 / 100)) / 8
    expect(intensiteDuJour(series)).toBeCloseTo(attendu, 6)
    expect(intensiteDuJour([])).toBeNull()
  })
})

describe('le titre sous charge', () => {
  it('suit le mapping du brief : 70 % étroit et maigre, 100 % large et gras', () => {
    expect(typoIntensite(0.7)).toMatchObject({ largeur: 50, graisse: 500 })
    expect(typoIntensite(1)).toMatchObject({ largeur: 150, graisse: 900 })
    expect(typoIntensite(0.92).largeur).toBeCloseTo(50 + (100 * 0.22) / 0.3, 6)
  })

  it('borne les valeurs hors de la plage et garde un milieu sans donnée', () => {
    expect(typoIntensite(0.4).largeur).toBe(50)
    expect(typoIntensite(1.2).largeur).toBe(150)
    expect(typoIntensite(null).largeur).toBe(100)
  })
})

describe('les graduations', () => {
  it('choisit des pas ronds', () => {
    expect(graduations(0, 100)).toEqual([0, 20, 40, 60, 80, 100])
    expect(graduations(41, 119)).toEqual([60, 80, 100])
    expect(graduations(5, 5)).toEqual([5])
  })
})

describe('la mise en page de la courbe caractéristique', () => {
  const entree = {
    largeur: 640,
    hauteur: 360,
    e1rmTotal: 115.7,
    points: [{ effort: 5, charge: 106.7 }],
    limiteVisee: 124.2,
  }

  it('inverse l’abscisse : 12 reps à gauche, la limite à une rep à droite', () => {
    const m = miseEnPageCourbe(entree)
    expect(m.x(12)).toBeCloseTo(m.marges.gauche, 6)
    expect(m.x(1)).toBeCloseTo(m.marges.gauche + m.zone.largeur, 6)
    expect(m.x(5)).toBeGreaterThan(m.x(8))
  })

  it('monte jusqu’au 1RM, qui est le sommet de la courbe', () => {
    const m = miseEnPageCourbe(entree)
    expect(m.limite.x).toBeCloseTo(m.x(1), 6)
    expect(m.limite.y).toBeCloseTo(m.y(115.7), 6)
    expect(m.y(124.2)).toBeLessThan(m.limite.y)
    // La charge d'un effort moindre est plus basse : le trait descend vers la gauche.
    expect(m.y(0.811 * 115.7)).toBeGreaterThan(m.limite.y)
    expect(m.chemin.startsWith('M')).toBe(true)
    expect(m.chemin.endsWith(`${m.limite.x.toFixed(1)},${m.limite.y.toFixed(1)}`)).toBe(true)
  })

  it('garde dans le cadre la ligne visée et les séries', () => {
    const m = miseEnPageCourbe(entree)
    for (const charge of [106.7, 115.7, 124.2]) {
      expect(m.y(charge)).toBeGreaterThanOrEqual(m.marges.haut)
      expect(m.y(charge)).toBeLessThanOrEqual(m.marges.haut + m.zone.hauteur)
    }
  })

  it('retrouve l’effort sous le pointeur, au demi-point près et dans les bornes', () => {
    const m = miseEnPageCourbe(entree)
    expect(m.effortA(m.x(5))).toBe(5)
    expect(m.effortA(m.x(5) + 3)).toBe(5)
    expect(m.effortA(-500)).toBe(m.effortMax)
    expect(m.effortA(5000)).toBe(1)
  })

  it('étend l’échelle quand une série dépasse 12 d’effort, sans passer la table', () => {
    expect(miseEnPageCourbe({ ...entree, points: [{ effort: 14, charge: 80 }] }).effortMax).toBe(14)
    expect(miseEnPageCourbe({ ...entree, points: [{ effort: 40, charge: 80 }] }).effortMax).toBe(16)
  })

  it('espace les graduations sur un écran étroit', () => {
    expect(miseEnPageCourbe(entree).graduationsX).toEqual([12, 10, 8, 6, 4, 2, 1])
    expect(miseEnPageCourbe({ ...entree, largeur: 300 }).graduationsX).toEqual([12, 8, 4, 1])
  })
})

describe('la mise en page des séries dans le temps', () => {
  const points = [
    { date: '2026-11-04', valeur: 1900, seances: 1 },
    { date: '2026-11-12', valeur: 2100, seances: 1 },
    { date: '2026-11-21', valeur: 2200, seances: 2 },
  ]

  it('range les barres à intervalles réguliers, à partir de zéro', () => {
    const m = miseEnPageSerie({ largeur: 720, hauteur: 340, points, barres: true })
    expect(m.domaine[0]).toBe(0)
    const [a, b, c] = m.elements
    expect((b?.x ?? 0) - (a?.x ?? 0)).toBeCloseTo((c?.x ?? 0) - (b?.x ?? 0), 6)
    expect(m.largeurBarre).toBeGreaterThan(0)
    expect(m.y(2200)).toBeLessThan(m.y(1900))
  })

  it('place les points d’un trait selon la date, pas selon le rang', () => {
    const m = miseEnPageSerie({ largeur: 720, hauteur: 340, points, barres: false })
    const [a, b, c] = m.elements
    expect(a?.x).toBeCloseTo(m.marges.gauche, 6)
    expect(c?.x).toBeCloseTo(m.marges.gauche + m.zone.largeur, 6)
    // 8 jours sur 17 : le deuxième point est à 8/17 de la largeur.
    expect(((b?.x ?? 0) - m.marges.gauche) / m.zone.largeur).toBeCloseTo(8 / 17, 6)
    expect(m.largeurBarre).toBe(0)
  })

  it('met un seul point au milieu et ne dépasse pas six repères de date', () => {
    const seul = miseEnPageSerie({ largeur: 720, hauteur: 340, points: points.slice(0, 1), barres: false })
    expect(seul.elements[0]?.x).toBeCloseTo(seul.marges.gauche + seul.zone.largeur / 2, 6)
    const beaucoup = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      valeur: i + 1,
      seances: 1,
    }))
    expect(
      miseEnPageSerie({ largeur: 720, hauteur: 340, points: beaucoup, barres: false }).reperesX.length,
    ).toBeLessThanOrEqual(6)
  })

  it('aimante le repère à la mesure la plus proche', () => {
    const m = miseEnPageSerie({ largeur: 720, hauteur: 340, points, barres: false })
    expect(indexLePlusProche(m.elements, 0)).toBe(0)
    expect(indexLePlusProche(m.elements, 10_000)).toBe(2)
    expect(indexLePlusProche(m.elements, m.elements[1]?.x ?? 0)).toBe(1)
  })
})

describe('les objectifs et les phrases', () => {
  const objectif = (surcharge: Partial<ObjectifLu>): ObjectifLu =>
    ({
      titre: 'Cap',
      type: 'max',
      exercice_id: 1,
      valeur_cible_kg: 50,
      date_cible: '2027-01-01',
      principal: false,
      id: 1,
      statut: 'en_cours',
      exercice: 'Traction',
      jours_restants: 30,
      progression: null,
      blocs: [],
      ...surcharge,
    }) as ObjectifLu

  it('choisit l’objectif en cours de l’exercice, le principal d’abord', () => {
    const liste = [
      objectif({ id: 1, valeur_cible_kg: 45 }),
      objectif({ id: 2, valeur_cible_kg: 50, principal: true }),
      objectif({ id: 3, exercice_id: 2, valeur_cible_kg: 80 }),
      objectif({ id: 4, statut: 'atteint', principal: true }),
    ]
    expect(objectifDeLExercice(liste, 1)?.id).toBe(2)
    expect(objectifDeLExercice(liste, 2)?.id).toBe(3)
    expect(objectifDeLExercice(liste, 9)).toBeUndefined()
  })

  it('dit ce qui reste à tirer, ou le dépassement', () => {
    expect(phraseLimiteVisee(41.5, 50)).toBe('Reste 8,5 kg avant la limite visée de +50 kg.')
    expect(phraseLimiteVisee(52, 50)).toBe('Limite visée de +50 kg dépassée de 2 kg.')
  })

  it('lit un point de la courbe', () => {
    expect(lectureCourbe(5, 106.66, undefined)).toBe('5 reps éq. · 106,7 kg')
    expect(lectureCourbe(5, 106.7, { effort: 5, charge: 106.7, reps: 3, rpe: 8, nombre: 4 })).toBe(
      '5 reps éq. · 106,7 kg · 3 @ RPE 8 (×4)',
    )
  })

  it('écrit la date d’un procès-verbal', () => {
    expect(dateDePV('2026-11-25')).toBe('25.11.2026')
  })
})
