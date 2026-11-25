import { describe, expect, it } from 'vitest'

import { bloc, iso, objectif, point } from './fabriques'
import {
  analyser,
  annotationAssise,
  assises,
  blocLe,
  blocsPlanche,
  dateCompacte,
  dateParlee,
  decimal,
  ecartAuPlan,
  empreinte,
  isoDe,
  jourDe,
  jourDeFranchissement,
  jourEstime,
  legendeFil,
  niveau,
  numeroPlanche,
  pasAssise,
  phraseEstimation,
  planLineaire,
  pointsE1rm,
  positionElastique,
  prochainPalier,
  raisonSansPlan,
  records,
  resumeArchives,
  resumePortefeuille,
  rythme,
  rythmeRequis,
  segmentsBandeau,
  SEUIL_JOURS,
  signe,
  signeEntier,
  statutDe,
  tensionFil,
  texteMesure,
  tremble,
  valeurDuPlan,
} from './modele'

describe('dates et nombres', () => {
  it('passe d’une date à un numéro de jour et revient', () => {
    expect(isoDe(jourDe('2027-03-15'))).toBe('2027-03-15')
    expect(jourDe('2027-03-15') - jourDe('2026-11-25')).toBe(110)
  })

  it('écrit les nombres à la française, avec le vrai signe moins', () => {
    expect(decimal(41.5)).toBe('41,5')
    expect(decimal(40)).toBe('40,0')
    expect(signe(-1.3)).toBe('−1,3')
    expect(signe(1)).toBe('+1,0')
    expect(signeEntier(-21)).toBe('−21')
    expect(signeEntier(17)).toBe('+17')
  })

  it('écrit les dates comme les cotes d’une planche', () => {
    expect(dateCompacte('2027-03-15')).toBe('15.03.2027')
    expect(dateParlee('2027-03-15')).toBe('15 mars 2027')
    expect(niveau(40)).toBe('NIV. +40,0')
    expect(numeroPlanche(0)).toBe('PL. 01')
    expect(numeroPlanche(11)).toBe('PL. 12')
  })
})

describe('l’historique d’e1RM', () => {
  it('garde le meilleur relevé de chaque jour, dans l’ordre, sans les relevés vides', () => {
    const pts = pointsE1rm([point(10, 20), point(2, 15), point(10, 22), point(5, null)])
    expect(pts.map((p) => [p.jour - jourDe(iso(0)), p.e1rm])).toEqual([
      [2, 15],
      [10, 22],
    ])
  })

  it('ne garde comme records que les relevés qui battent tous les précédents', () => {
    const pts = pointsE1rm([point(0, 10), point(5, 12), point(9, 11), point(12, 14)])
    expect(records(pts).map((p) => p.e1rm)).toEqual([10, 12, 14])
  })

  it('trouve le premier jour où un seuil a été franchi', () => {
    const pts = pointsE1rm([point(0, 10), point(5, 12), point(9, 11), point(12, 14)])
    expect(jourDeFranchissement(pts, 12)).toBe(jourDe(iso(5)))
    expect(jourDeFranchissement(pts, 15)).toBeNull()
  })
})

describe('les assises', () => {
  it('découpe en assises de 2,5 kg calées sur des multiples absolus', () => {
    const liste = assises(50, 41.5, 2.5)
    expect(liste).toHaveLength(20)
    expect(liste[0]).toMatchObject({ bas: 0, haut: 2.5, part: 1 })
    expect(liste[16]).toMatchObject({ bas: 40, haut: 42.5 })
    expect(liste[16]?.part).toBeCloseTo(0.6, 6)
    expect(liste[17]?.part).toBe(0)
  })

  it('a pour hauteur franchie exactement l’e1RM : hauteur franchie / hauteur totale = e1RM / cible', () => {
    for (const [cible, e1rm] of [
      [50, 41.5],
      [10, 3],
      [70, 49.7],
    ] as const) {
      const franchi = assises(cible, e1rm, pasAssise(cible)).reduce(
        (s, a) => s + (a.haut - a.bas) * a.part,
        0,
      )
      expect(franchi / cible).toBeCloseTo(e1rm / cible, 9)
    }
  })

  it('termine par une assise partielle quand la cible n’est pas un multiple', () => {
    const liste = assises(10.3, 0, 2.5)
    expect(liste.at(-1)).toMatchObject({ bas: 10, haut: 10.3 })
    expect(liste).toHaveLength(5)
  })

  it('double l’épaisseur des assises quand la cible en donnerait plus de quarante', () => {
    expect(pasAssise(100)).toBe(2.5)
    expect(pasAssise(120)).toBe(5)
    expect(pasAssise(300)).toBe(10)
  })

  it('annonce le prochain palier et ce qu’il reste', () => {
    expect(prochainPalier(41.5, 50, 2.5)).toEqual({ niveau: 42.5, reste: 1 })
    expect(prochainPalier(40, 50, 2.5)).toEqual({ niveau: 42.5, reste: 2.5 })
    expect(prochainPalier(49, 50, 2.5)?.niveau).toBe(50)
    expect(prochainPalier(50, 50, 2.5)).toBeNull()
  })
})

describe('le plan, l’écart et le rythme', () => {
  const points = pointsE1rm([point(0, 10), point(50, 15), point(100, 17)])
  const echeance = jourDe(iso(200))
  const plan = planLineaire(points, 30, echeance)

  it('trace la droite du premier relevé à la cible, à l’échéance', () => {
    expect(plan).not.toBeNull()
    expect(plan?.pente).toBeCloseTo(0.1, 9)
    expect(valeurDuPlan(plan!, jourDe(iso(100)))).toBeCloseTo(20, 9)
  })

  it('n’invente pas de plan sans deux relevés, ou sans échéance devant soi', () => {
    expect(planLineaire(pointsE1rm([point(0, 10)]), 30, echeance)).toBeNull()
    expect(planLineaire(points, 30, jourDe(iso(0)))).toBeNull()
    expect(planLineaire(points, 8, echeance)).toBeNull()
  })

  it('mesure l’écart du jour en kilos et en jours : négatif et positif côté retard', () => {
    const retard = ecartAuPlan(plan!, jourDe(iso(100)), 17)
    expect(retard.kg).toBeCloseTo(-3, 9)
    expect(retard.jours).toBe(30)
    const avance = ecartAuPlan(plan!, jourDe(iso(100)), 21)
    expect(avance.kg).toBeCloseTo(1, 9)
    expect(avance.jours).toBe(-10)
  })

  it('calcule le rythme réel sur les six dernières semaines, et celui qu’il faudrait tenir', () => {
    const recents = pointsE1rm([point(0, 10), point(70, 16), point(100, 17)])
    expect(rythme(recents, jourDe(iso(100)))).toBeCloseTo(1 / 30, 9)
    expect(rythme(pointsE1rm([point(100, 17)]), jourDe(iso(100)))).toBeNull()
    expect(rythme(pointsE1rm([point(98, 16), point(100, 17)]), jourDe(iso(100)))).toBeNull()
    expect(rythmeRequis(17, 30, 100)).toBeCloseTo(0.13, 9)
    expect(rythmeRequis(30, 30, 100)).toBeNull()
    expect(rythmeRequis(17, 30, 0)).toBeNull()
  })

  it('estime le jour où la cible serait atteinte au rythme actuel', () => {
    expect(jourEstime(10, 100, 20, 0.5)).toBe(120)
    expect(jourEstime(10, 100, 20, 0)).toBeNull()
    expect(jourEstime(20, 100, 20, 0.5)).toBeNull()
    expect(jourEstime(null, 100, 20, 0.5)).toBeNull()
    // À ce rythme, ce serait dans plus de dix ans : on ne donne pas de date.
    expect(jourEstime(10, 100, 20, 0.0001)).toBeNull()
  })
})

describe('le statut', () => {
  const base = { statut: 'en_cours' as const, jours_restants: 100, progression: null }

  it('est dans les temps jusqu’à une semaine d’écart, en retard ou en avance au-delà', () => {
    expect(statutDe(base, { kg: 0, jours: 0 })).toBe('dans-les-temps')
    expect(statutDe(base, { kg: -0.5, jours: SEUIL_JOURS })).toBe('dans-les-temps')
    expect(statutDe(base, { kg: -0.5, jours: SEUIL_JOURS + 1 })).toBe('en-retard')
    expect(statutDe(base, { kg: 2, jours: -(SEUIL_JOURS + 1) })).toBe('en-avance')
  })

  it('suit d’abord le statut de l’objectif, puis la cible atteinte', () => {
    expect(statutDe({ ...base, statut: 'atteint' }, null)).toBe('atteint')
    expect(statutDe({ ...base, statut: 'abandonne' }, null)).toBe('abandonne')
    const atteinte = { e1rm_lest_kg: 50, le: '2026-11-21', pourcentage: 100, cible_atteinte: true }
    expect(statutDe({ ...base, progression: atteinte }, { kg: 1, jours: -5 })).toBe('cible-atteinte')
  })

  it('sans plan, ne dit « en retard » qu’après l’échéance', () => {
    expect(statutDe(base, null)).toBe('sans-estimation')
    expect(statutDe({ ...base, jours_restants: -3 }, null)).toBe('en-retard')
  })
})

describe('la planche analysée', () => {
  const evolution = [point(0, 10), point(70, 16), point(100, 17)]
  const o = objectif({
    titre: 'Traction +30 kg',
    valeur_cible_kg: 30,
    date_cible: iso(200),
    jours_restants: 100,
    progression: { e1rm_lest_kg: 17, le: iso(100), pourcentage: 56.7, cible_atteinte: false },
  })
  const a = analyser(o, evolution, [], iso(100))

  it('prend sa hauteur de la cible et son pourcentage de l’API', () => {
    expect(a.sommet).toBe(30)
    expect(a.pas).toBe(2.5)
    expect(a.assises).toHaveLength(12)
    expect(a.pourcentage).toBeCloseTo(56.7, 6)
    expect(a.reste).toBe(13)
  })

  it('met la hauteur franchie en proportion exacte de la progression', () => {
    const franchi = a.assises.reduce((s, x) => s + (x.haut - x.bas) * x.part, 0)
    expect((franchi / a.sommet) * 100).toBeCloseTo((17 / 30) * 100, 6)
  })

  it('est en retard de 30 jours sur le plan, avec 3 kg de décalage', () => {
    expect(a.statut).toBe('en-retard')
    expect(a.ecart?.jours).toBe(30)
    expect(a.ecart?.kg).toBeCloseTo(-3, 9)
    expect(a.palier).toEqual({ niveau: 17.5, reste: 0.5 })
  })

  it('date chaque assise franchie par le premier relevé qui l’a atteinte', () => {
    expect(a.assises[0]?.jourFranchi).toBe(jourDe(iso(0)))
    expect(a.assises[4]?.jourFranchi).toBe(jourDe(iso(70)))
    expect(a.assises[8]?.jourFranchi).toBeNull()
  })

  it('estime une date d’arrivée au rythme actuel', () => {
    expect(a.estime).not.toBeNull()
    expect(a.estime!).toBeGreaterThan(a.jourAujourdhui)
  })

  it('retombe sur le seul relevé sûr quand l’historique n’a pas pu être lu', () => {
    const sans = analyser(o, null, null, iso(100))
    expect(sans.points).toHaveLength(1)
    expect(sans.plan).toBeNull()
    expect(sans.ecart).toBeNull()
    expect(raisonSansPlan(sans, false)).toMatch(/historique/)
    expect(raisonSansPlan(sans, true)).toMatch(/deux relevés/)
  })

  it('n’invente rien sans progression', () => {
    const vide = analyser(objectif({ progression: null }), [], [], iso(100))
    expect(vide.e1rm).toBeNull()
    expect(vide.reste).toBeNull()
    expect(vide.palier).toBeNull()
    expect(vide.pourcentage).toBe(0)
    expect(vide.statut).toBe('sans-estimation')
  })

  it('range les assises franchies dans le bloc en cours ce jour-là', () => {
    const blocs = [bloc({ id: 4, objectif_id: o.id, debut: iso(60), fin: iso(120), type: 'volume' })]
    const avec = analyser(o, evolution, blocs, iso(100))
    expect(avec.blocs.map((b) => b.repere)).toEqual(['B1'])
    expect(avec.assises[4]?.bloc?.id).toBe(4)
    expect(avec.assises[0]?.bloc).toBeNull()
    expect(annotationAssise(avec, 4)).toContain('Volume')
    expect(annotationAssise(avec, 4)).toMatch(/^NIV\. \+12,5 · franchi le /)
  })

  it('ne retient que les blocs de l’objectif, dans l’ordre où ils commencent', () => {
    const liste = blocsPlanche(
      [
        bloc({ id: 2, debut: '2026-10-01', fin: null }),
        bloc({ id: 1, debut: '2026-09-01' }),
        bloc({ id: 3, objectif_id: 99 }),
      ],
      1,
    )
    expect(liste.map((b) => [b.id, b.repere])).toEqual([
      [1, 'B1'],
      [2, 'B2'],
    ])
    expect(blocLe(liste, jourDe('2027-01-01'))?.id).toBe(2)
    expect(blocLe(liste, jourDe('2026-01-01'))).toBeNull()
  })
})

describe('les phrases', () => {
  const o = objectif({
    titre: 'Traction +30 kg',
    valeur_cible_kg: 30,
    date_cible: iso(200),
    jours_restants: 100,
    progression: { e1rm_lest_kg: 17, le: iso(100), pourcentage: 56.7, cible_atteinte: false },
  })
  const a = analyser(o, [point(0, 10), point(70, 16), point(100, 17)], [], iso(100))

  it('écrit tout le diagnostic dans le bandeau d’état', () => {
    const texte = segmentsBandeau(a, o, 'J−100').join(' · ')
    expect(texte).toContain(`échéance ${dateCompacte(iso(200))}`)
    expect(texte).toContain('+30 j sur le plan')
    expect(texte).toContain('−3,0 kg au calage')
    expect(texte).toContain('rythme +0,5 kg / 2 sem (requis +1,8)')
    expect(texte).toContain('prochain palier NIV. +17,5 kg, à +0,5 kg')
    expect(texte).toContain('J−100')
    expect(texte).toContain('estimé ')
  })

  it('dit si l’arrivée estimée tombe avant ou après l’échéance', () => {
    expect(phraseEstimation(a, true)).toMatch(/^estimé \d\d\.\d\d\.\d{4} \(\d+ j après l’échéance\)$/)
    expect(phraseEstimation({ ...a, estime: a.jourEcheance }, true)).toMatch(/à l’échéance\)$/)
    expect(phraseEstimation({ ...a, estime: a.jourEcheance - 4 }, true)).toMatch(/4 j avant l’échéance\)$/)
    expect(phraseEstimation({ ...a, estime: null })).toBeNull()
  })

  it('décrit la mesure pour un lecteur d’écran', () => {
    expect(texteMesure(a, o)).toBe(
      `Traction +30 kg, 57 %, 17,0 kilos sur 30,0, en retard de 30 jours, échéance le ${dateParlee(iso(200))}`,
    )
  })

  it('écrit le fil tendu en toutes lettres', () => {
    expect(legendeFil(a)).toContain('3,0 kg sous la cible')
    expect(legendeFil({ ...a, statut: 'atteint' })).toBeNull()
    expect(legendeFil({ ...a, ecart: { kg: 0, jours: 0 } })).toMatch(/calé/)
  })

  it('résume le portefeuille et les archives', () => {
    expect(resumePortefeuille(['en-retard', 'dans-les-temps', 'en-avance'])).toBe(
      '1 en retard · 1 dans les temps · 1 en avance',
    )
    expect(resumePortefeuille([])).toBe('aucune planche en cours')
    expect(resumeArchives(['atteint', 'abandonne', 'abandonne'])).toBe(
      '1 planche atteinte · 2 planches abandonnées',
    )
    expect(resumeArchives([])).toBe('le tiroir est vide')
  })

  it('change d’empreinte quand une donnée change', () => {
    const avant = empreinte([o])
    expect(empreinte([o])).toBe(avant)
    expect(empreinte([{ ...o, valeur_cible_kg: 32 }])).not.toBe(avant)
    expect(
      empreinte([
        { ...o, progression: { e1rm_lest_kg: 17.5, le: iso(101), pourcentage: 58, cible_atteinte: false } },
      ]),
    ).not.toBe(avant)
  })
})

describe('le fil tendu et le calque qu’on tire', () => {
  it('épaissit le fil et resserre ses tirets avec l’écart, sans jamais dépasser ses bornes', () => {
    const zero = tensionFil(0)
    const moyen = tensionFil(14)
    const loin = tensionFil(400)
    expect(zero.epaisseur).toBeCloseTo(0.75, 9)
    expect(zero.tirets).toBe('6 6.00')
    expect(moyen.epaisseur).toBeGreaterThan(zero.epaisseur)
    expect(loin.epaisseur).toBeCloseTo(2.5, 9)
    expect(loin.tirets).toBe('none')
    expect(tensionFil(-14).epaisseur).toBe(moyen.epaisseur)
  })

  it('suit le doigt entre le calage et la position recalée, puis résiste au-delà', () => {
    expect(positionElastique(20, 31)).toBe(20)
    expect(positionElastique(1, 31)).toBe(0)
    expect(positionElastique(-10, 31)).toBeLessThan(0)
    expect(positionElastique(-10, 31)).toBeGreaterThan(-10)
    // Plus on tire loin, plus la feuille résiste : elle ne dépasse jamais 28 unités de plus.
    expect(positionElastique(31 + 400, 31)).toBeLessThan(31 + 28)
    expect(positionElastique(-400, -31)).toBeLessThan(-31)
    expect(positionElastique(-400, -31)).toBeGreaterThan(-31 - 28)
  })

  it('tremble toujours de la même façon pour un même objectif, dans l’amplitude donnée', () => {
    const premier = tremble(20, 7, 0.4)
    expect(tremble(20, 7, 0.4)).toEqual(premier)
    expect(tremble(20, 8, 0.4)).not.toEqual(premier)
    expect(premier.every((v) => Math.abs(v) <= 0.4)).toBe(true)
  })
})
