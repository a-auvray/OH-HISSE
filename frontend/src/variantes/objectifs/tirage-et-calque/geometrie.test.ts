import { describe, expect, it } from 'vitest'

import { bloc, iso, objectif, point } from './fabriques'
import {
  bandesDeColonne,
  bandesFranchies,
  blocsAVenir,
  BOITE,
  cheminDe,
  COLONNE,
  decalageDeMires,
  echelles,
  limites,
  planDessine,
  pointsCourbe,
  reperesDeRecord,
  taquets,
  ZONE,
} from './geometrie'
import { type Analyse, analyser, jourDe, pointsE1rm } from './modele'

const evolution = [point(0, 10), point(40, 14), point(70, 16), point(100, 17)]

function planche(
  modif: Parameters<typeof objectif>[0] = {},
  blocs = [bloc({ debut: iso(60), fin: iso(120) })],
) {
  const o = objectif({
    valeur_cible_kg: 30,
    date_cible: iso(200),
    jours_restants: 100,
    progression: { e1rm_lest_kg: 17, le: iso(100), pourcentage: 56.7, cible_atteinte: false },
    ...modif,
  })
  return analyser(o, evolution, blocs, iso(100))
}

describe('les échelles', () => {
  const a = planche()
  const e = echelles(a)

  it('posent le sol en bas de la zone et la cible en haut, à l’échelle exacte des kilos', () => {
    expect(e.y(0)).toBeCloseTo(ZONE.bas, 9)
    expect(e.y(a.sommet)).toBeCloseTo(ZONE.haut, 9)
    expect(e.y(15) - e.y(17.5)).toBeCloseTo(2.5 * e.parKg, 9)
  })

  it('étalent le temps du premier relevé à l’échéance', () => {
    expect(e.x(a.points[0]!.jour)).toBeCloseTo(ZONE.gauche, 9)
    expect(e.x(a.jourEcheance)).toBeCloseTo(ZONE.droite, 9)
    expect(ZONE.droite).toBeLessThan(BOITE.largeur)
  })

  it('ne s’effondrent pas quand tout tient en un jour', () => {
    const seul = analyser(objectif(), [], [], '2026-11-21')
    const es = echelles(seul)
    expect(es.jourFin).toBeGreaterThan(es.jourDebut)
    expect(Number.isFinite(es.x(seul.jourAujourdhui))).toBe(true)
  })
})

describe('les limites d’assise', () => {
  it('commencent au sol et finissent à la cible, avec une étiquette assez espacée', () => {
    const a = planche()
    const e = echelles(a)
    const lims = limites(a, e)
    expect(lims[0]?.kg).toBe(0)
    expect(lims.at(-1)?.kg).toBe(30)
    const etiquettees = lims.filter((l) => l.etiquette !== null)
    for (let i = 1; i < etiquettees.length; i += 1) {
      expect(etiquettees[i - 1]!.y - etiquettees[i]!.y).toBeGreaterThanOrEqual(26)
    }
  })
})

describe('le sédiment', () => {
  const a = planche()
  const e = echelles(a)
  const bandes = bandesFranchies(a, e)

  it('empile des bandes dont la hauteur totale est l’e1RM, au kilo près', () => {
    const kg = bandes.reduce((s, b) => s + b.hauteurKg, 0)
    expect(kg).toBeCloseTo(17, 9)
    const px = bandes.reduce((s, b) => s + b.hauteur, 0)
    expect(px / ((ZONE.bas - ZONE.haut) * (17 / 30))).toBeCloseTo(1, 9)
  })

  it('ne pose que l’assise en cours au prorata', () => {
    const entieres = bandes.filter((b) => b.entiere)
    expect(entieres).toHaveLength(6)
    expect(bandes.at(-1)?.entiere).toBe(false)
    expect(bandes.at(-1)?.hauteurKg).toBeCloseTo(2, 9)
  })

  it('part du jour où l’assise a été franchie et court jusqu’à aujourd’hui', () => {
    for (const b of bandes) {
      expect(b.x).toBeCloseTo(e.x(b.jourFranchi), 9)
      expect(b.x + b.largeur).toBeLessThanOrEqual(ZONE.droite + 1e-9)
      expect(b.largeur).toBeGreaterThanOrEqual(2)
    }
  })

  it('rattache la bande au type de son bloc', () => {
    const avec = bandes.filter((b) => b.type === 'force')
    expect(avec.length).toBeGreaterThan(0)
    expect(bandes[0]?.type).toBeNull()
  })
})

describe('la courbe et ses repères', () => {
  const a = planche()
  const e = echelles(a)

  it('passe par chaque relevé à moins d’une unité près (le tremblé de l’encre)', () => {
    const courbe = pointsCourbe(a.points, e, 3)
    courbe.forEach((p, i) => {
      expect(Math.abs(p.x - e.x(a.points[i]!.jour))).toBeLessThanOrEqual(0.4)
      expect(Math.abs(p.y - e.y(a.points[i]!.e1rm))).toBeLessThanOrEqual(0.4)
    })
    expect(pointsCourbe(a.points, e, 3)).toEqual(courbe)
  })

  it('écrit un chemin ouvert par un déplacement puis des segments', () => {
    expect(
      cheminDe([
        { x: 1, y: 2 },
        { x: 3.14159, y: 4 },
      ]),
    ).toBe('M1.0,2.0 L3.1,4.0')
    expect(cheminDe([])).toBe('')
  })

  it('marque un repère par record, sauf le premier relevé', () => {
    const repere = reperesDeRecord(pointsE1rm(evolution), e)
    expect(repere).toHaveLength(3)
  })
})

describe('le calque', () => {
  it('se recale vers le bas quand on est en retard, du nombre d’unités que valent les kilos d’écart', () => {
    const a = planche()
    const e = echelles(a)
    const dessin = planDessine(a, e)!
    expect(dessin.repos).toBeGreaterThan(0)
    expect(dessin.repos).toBeCloseTo(3 * e.parKg, 9)
    // Une fois recalé, le plan passe par le point réel.
    expect(dessin.mire!.y + dessin.repos).toBeCloseTo(e.y(17), 9)
  })

  it('part vers le haut quand on est en avance, et reste en place dans les temps', () => {
    const avance = planche({
      progression: { e1rm_lest_kg: 24, le: iso(100), pourcentage: 80, cible_atteinte: false },
    })
    expect(planDessine(avance, echelles(avance))!.repos).toBeLessThan(0)
    const bon = planche({
      progression: { e1rm_lest_kg: 20, le: iso(100), pourcentage: 67, cible_atteinte: false },
    })
    expect(Math.abs(planDessine(bon, echelles(bon))!.repos)).toBeLessThan(1e-6)
  })

  it('n’existe pas sans plan', () => {
    const sans = analyser(objectif(), [], [], '2026-11-21')
    expect(planDessine(sans, echelles(sans))).toBeNull()
  })

  it('porte les blocs à venir, rognés à la zone, et deux taquets sur le bord haut', () => {
    const a = planche({}, [
      bloc({ id: 1, debut: iso(60), fin: iso(90) }),
      bloc({ id: 2, debut: iso(120), fin: iso(160) }),
      bloc({ id: 3, debut: iso(170), fin: null }),
    ])
    const e = echelles(a)
    const futurs = blocsAVenir(a, e)
    expect(futurs.map((b) => b.bloc.id)).toEqual([2, 3])
    for (const b of futurs) {
      expect(b.x).toBeGreaterThanOrEqual(ZONE.gauche)
      expect(b.x + b.largeur).toBeLessThanOrEqual(ZONE.droite + 1e-9)
    }
    // Un bloc déjà commencé ne porte que sa suite : sa trame part d'aujourd'hui.
    const enCours = blocsAVenir(planche({}, [bloc({ debut: iso(60), fin: iso(160) })]), e)
    expect(enCours).toHaveLength(1)
    expect(enCours[0]!.x).toBeCloseTo(e.x(jourDe(iso(100))), 9)
    // Assez large : l'étiquette dit le bloc en entier ; trop étroite, elle ne garde que son repère.
    expect(enCours[0]!.etiquette).toMatch(/^B1 · Force · \d\d\.\d\d→\d\d\.\d\d$/)
    expect(futurs[0]!.etiquette).toBe('B2')
    expect(taquets()).toHaveLength(2)
    expect(taquets().every((t) => t.y < ZONE.haut)).toBe(true)
  })
})

describe('la colonne d’ensemble', () => {
  const a: Analyse = planche()

  it('a une hauteur normalisée : le sol et le faîtage sont les mêmes pour toutes les cibles', () => {
    const petite = planche({ valeur_cible_kg: 10 })
    for (const analyse of [a, petite]) {
      const bandes = bandesDeColonne(analyse)
      expect(bandes[0]!.y + bandes[0]!.hauteur).toBeCloseTo(COLONNE.hauteur, 9)
      expect(bandes.at(-1)!.y).toBeCloseTo(0, 9)
      expect(bandes.reduce((s, b) => s + b.hauteur, 0)).toBeCloseTo(COLONNE.hauteur, 9)
    }
  })

  it('décale les deux mires du côté du retard ou de l’avance, et les aligne dans les temps', () => {
    expect(decalageDeMires(a)).toBeGreaterThan(0)
    const avance = planche({
      progression: { e1rm_lest_kg: 24, le: iso(100), pourcentage: 80, cible_atteinte: false },
    })
    expect(decalageDeMires(avance)).toBeLessThan(0)
    const bon = planche({
      progression: { e1rm_lest_kg: 20, le: iso(100), pourcentage: 67, cible_atteinte: false },
    })
    expect(decalageDeMires(bon)).toBe(0)
    expect(jourDe(iso(0))).toBeLessThan(jourDe(iso(1)))
  })
})
