import { describe, expect, it } from 'vitest'

import { conditionsFictives, heureFictive } from './fixture'
import {
  ENCRES,
  aleatoire,
  avancer,
  basculeDanger,
  cheminLisse,
  contraste,
  courantVersEst,
  creerParticules,
  distanceA,
  estClair,
  estDeNuit,
  estEtale,
  etaleDansCreneau,
  geometrie,
  hauteurA,
  houleVisuelle,
  intervallesNuit,
  lireCouleur,
  luminance,
  mareeProche,
  minutesDeMarche,
  opaciteParticule,
  pasGraduation,
  pleineMerSuivante,
  polygoneSable,
  prochainCoucher,
  profilEstran,
  rangProche,
  rayonParticule,
  reperesDistance,
  sableMouille,
  sensVent,
  souplesse,
  souplesseRetenue,
  tendanceA,
  trace,
  ventVersLarge,
  vitesseProfondeur,
} from './modele'

const conditions = conditionsFictives()
const heures = conditions.heures

describe('profil de l’estran', () => {
  const profil = profilEstran(heures)!

  it('est reconstitué à partir des heures, du pied de digue vers le large', () => {
    expect(profil.points[0]!.d).toBe(0)
    const distances = profil.points.map((p) => p.d)
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
  })

  it('ne remonte jamais en s’éloignant de la digue', () => {
    for (let i = 1; i < profil.points.length; i++)
      expect(profil.points[i]!.h).toBeLessThanOrEqual(profil.points[i - 1]!.h)
  })

  it('rend null quand aucune heure ne donne de distance', () => {
    expect(profilEstran(heures.map((h) => ({ ...h, distance_eau_m: null })))).toBeNull()
    expect(profilEstran([])).toBeNull()
  })

  it('aplatit un relevé bruité et fusionne deux relevés à la même distance', () => {
    const bruite = profilEstran([
      heureFictive(0, { distance_eau_m: 100, hauteur_eau_m: 4 }),
      heureFictive(1, { distance_eau_m: 100.2, hauteur_eau_m: 4.2 }),
      heureFictive(2, { distance_eau_m: 200, hauteur_eau_m: 4.5 }),
    ])!
    expect(bruite.points).toHaveLength(3)
    expect(bruite.points[2]!.h).toBeLessThanOrEqual(bruite.points[1]!.h)
  })

  it('donne la hauteur du sable et la distance à une hauteur d’eau, l’une inverse de l’autre', () => {
    for (const d of [30, 120, 300]) expect(distanceA(profil, hauteurA(profil, d))).toBeCloseTo(d, 3)
    expect(distanceA(profil, profil.points[0]!.h + 1)).toBe(0)
  })

  it('prolonge la dernière pente au-delà du dernier relevé', () => {
    const dernier = profil.points.at(-1)!
    expect(hauteurA(profil, dernier.d + 100)).toBeLessThan(dernier.h)
    expect(hauteurA(profil, -5)).toBe(profil.points[0]!.h)
  })

  it('retrouve la distance de l’API à chaque heure (le profil est fidèle aux relevés)', () => {
    for (const h of heures) {
      if (h.distance_eau_m && h.distance_eau_m > 0) {
        expect(Math.abs(distanceA(profil, h.hauteur_eau_m!) - h.distance_eau_m)).toBeLessThan(25)
      }
    }
  })
})

describe('marche et sable mouillé', () => {
  it('compte les minutes de marche, au moins une dès qu’il y a de la distance', () => {
    expect(minutesDeMarche(0)).toBe(0)
    expect(minutesDeMarche(3)).toBe(1)
    expect(minutesDeMarche(200)).toBe(3)
  })

  it('montre le sable que la mer vient de laisser, et seulement lorsqu’elle se retire', () => {
    const jusant = [heureFictive(0, { distance_eau_m: 50 }), heureFictive(1, { distance_eau_m: 120 })]
    expect(sableMouille(jusant, 1)).toEqual({ de: 50, a: 120 })
    expect(sableMouille([jusant[1]!, jusant[0]!], 1)).toBeNull()
    expect(sableMouille(jusant, 0)).toBeNull()
  })
})

describe('géométrie de la coupe', () => {
  const profil = profilEstran(heures)!
  const niveaux = heures.map((h) => h.hauteur_eau_m!)
  const geo = geometrie({ largeur: 900, hauteur: 330, profil, niveaux })

  it('fait entrer l’eau la plus haute et le sable le plus bas dans le cadre', () => {
    expect(geo.y(Math.max(...niveaux))).toBeGreaterThan(geo.haut)
    expect(geo.y(profil.points.at(-1)!.h)).toBeLessThan(geo.bas)
    expect(geo.x(geo.dMax)).toBeCloseTo(geo.droite, 6)
    expect(geo.x(0)).toBeCloseTo(geo.gauche, 6)
  })

  it('place les hauteurs de bas en haut et les distances de gauche à droite', () => {
    expect(geo.y(5)).toBeLessThan(geo.y(2))
    expect(geo.x(50)).toBeLessThan(geo.x(100))
  })

  it('annonce l’exagération verticale', () => {
    expect(geo.exageration).toBeGreaterThan(1)
  })

  it('se débrouille sans profil ni niveau', () => {
    const vide = geometrie({ largeur: 400, hauteur: 270, profil: null, niveaux: [] })
    expect(Number.isFinite(vide.y(3))).toBe(true)
    expect(polygoneSable(vide, null).length).toBeGreaterThan(3)
  })

  it('trace le sable en polygone fermé, de la dune au bord droit', () => {
    const poly = polygoneSable(geo, profil)
    expect(poly[0]).toEqual({ x: 0, y: geo.bas })
    expect(poly.at(-1)).toEqual({ x: geo.droite, y: geo.bas })
    const { mesure, prolonge } = trace(geo, profil)
    expect(mesure).toHaveLength(profil.points.length)
    expect(prolonge[0]).toEqual(mesure.at(-1))
  })

  it('gradue la distance avec au plus sept repères', () => {
    expect(pasGraduation(60)).toBe(10)
    expect(pasGraduation(480)).toBe(100)
    expect(reperesDistance(500)[0]).toBe(0)
    expect(reperesDistance(500).length).toBeLessThanOrEqual(8)
  })

  it('écrit une courbe lisse qui passe par tous les points', () => {
    const chemin = cheminLisse([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ])
    expect(chemin.startsWith('M0.0,0.0')).toBe(true)
    expect(chemin.match(/C/g)).toHaveLength(2)
    expect(cheminLisse([])).toBe('')
  })
})

describe('vent, courant et houle', () => {
  it('nomme le vent par rapport à la plage (qui regarde le nord)', () => {
    expect(sensVent(180)).toBe('terre')
    expect(sensVent(225)).toBe('terre')
    expect(sensVent(0)).toBe('mer')
    expect(sensVent(90)).toBe('cote')
  })

  it('projette le vent sur l’axe vers le large', () => {
    expect(ventVersLarge(20, 180)).toBeCloseTo(20, 6)
    expect(ventVersLarge(20, 0)).toBeCloseTo(-20, 6)
    expect(ventVersLarge(26, 225)).toBeCloseTo(26 * Math.cos(Math.PI / 4), 6)
  })

  it('projette le courant sur l’axe de la côte (vers l’est)', () => {
    expect(courantVersEst(2, 90)).toBeCloseTo(2, 6)
    expect(courantVersEst(2, 270)).toBeCloseTo(-2, 6)
    expect(Math.abs(courantVersEst(2, 0))).toBeLessThan(1e-9)
  })

  it('reconnaît l’étale sous le seuil de courant', () => {
    expect(estEtale(0.1)).toBe(true)
    expect(estEtale(0.3)).toBe(true)
    expect(estEtale(1.2)).toBe(false)
    expect(estEtale(null)).toBe(false)
  })

  it('dit si la mer monte ou descend', () => {
    // 10 h : la mer monte vers 14h52 ; 17 h : elle descend.
    expect(tendanceA(heures, 0)).toBe('montante')
    expect(tendanceA(heures, 7)).toBe('descendante')
    expect(
      tendanceA([heureFictive(0, { hauteur_eau_m: 3 }), heureFictive(1, { hauteur_eau_m: 3.01 })], 0),
    ).toBe('etale')
    expect(tendanceA([heureFictive(0, { hauteur_eau_m: null })], 0)).toBeNull()
  })

  it('plafonne la houle dessinée (mal de mer) et sa fréquence (0,2 Hz)', () => {
    expect(houleVisuelle(0.8, 7).amplitudePx).toBeCloseTo(4, 6)
    expect(houleVisuelle(8, 3).amplitudePx).toBe(6)
    expect(houleVisuelle(8, 3).frequenceHz).toBe(0.2)
    expect(houleVisuelle(0.8, 7).frequenceHz).toBeCloseTo(1 / 7, 6)
    expect(houleVisuelle(null, null).amplitudePx).toBeGreaterThan(0)
  })

  it('émousse les titres avec la houle : 0 à plat, 40 à 0,8 m, 100 à 2 m, et seulement si l’écart dépasse 2', () => {
    expect(souplesse(0)).toBe(0)
    expect(souplesse(0.8)).toBe(40)
    expect(souplesse(2)).toBe(100)
    expect(souplesse(5)).toBe(100)
    expect(souplesse(null)).toBe(0)
    expect(souplesseRetenue(40, 41)).toBe(40)
    expect(souplesseRetenue(40, 43)).toBe(43)
  })
})

describe('particules du courant', () => {
  it('sont les mêmes à chaque fois (graine fixe)', () => {
    expect(creerParticules(20)).toEqual(creerParticules(20))
    const a = aleatoire(3)
    const b = aleatoire(3)
    expect([a(), a()]).toEqual([b(), b()])
  })

  it('avancent dans la profondeur selon le courant et s’immobilisent à l’étale', () => {
    expect(vitesseProfondeur(2)).toBeGreaterThan(0)
    expect(vitesseProfondeur(-2)).toBeLessThan(0)
    expect(vitesseProfondeur(0)).toBe(0)
    expect(Math.abs(vitesseProfondeur(0.1))).toBeLessThan(Math.abs(vitesseProfondeur(2)) / 10)
    const p = { x: 0.2, y: 0.3, z: 0.5 }
    expect(avancer(p, 0, 1, () => 0.5)).toEqual(p)
  })

  it('reviennent de l’autre côté à la sortie, à une nouvelle place', () => {
    const sortie = avancer({ x: 0.2, y: 0.3, z: 0.99 }, 1, 1, () => 0.7)
    expect(sortie).toEqual({ x: 0.7, y: 0.7, z: 0 })
    expect(avancer({ x: 0.2, y: 0.3, z: 0.01 }, -1, 1, () => 0.7).z).toBe(1)
  })

  it('sont plus petites, plus pâles au loin, et fondues aux deux bouts', () => {
    expect(rayonParticule(1)).toBeLessThan(rayonParticule(0))
    expect(opaciteParticule(0.5)).toBeGreaterThan(opaciteParticule(0.95))
    expect(opaciteParticule(0)).toBe(0)
    expect(opaciteParticule(1)).toBeCloseTo(0, 6)
  })
})

describe('le temps : nuit, bascule, étale', () => {
  const soleil = conditions.soleil
  const t = (iso: string) => Date.parse(iso)

  it('connaît la nuit d’après le lever et le coucher du soleil', () => {
    expect(estDeNuit(soleil, t('2026-11-20T12:00:00+01:00'))).toBe(false)
    expect(estDeNuit(soleil, t('2026-11-20T17:30:00+01:00'))).toBe(true)
    expect(estDeNuit(soleil, t('2026-11-21T03:00:00+01:00'))).toBe(true)
    expect(estDeNuit([], t('2026-11-20T03:00:00+01:00'))).toBe(false)
  })

  it('borne les nuits à la fenêtre demandée', () => {
    const nuits = intervallesNuit(soleil, t('2026-11-20T10:00:00+01:00'), t('2026-11-21T10:00:00+01:00'))
    expect(nuits).toHaveLength(1)
    expect(nuits[0]!.debut).toBe(t('2026-11-20T17:08:00+01:00'))
    expect(nuits[0]!.fin).toBe(t('2026-11-21T08:22:00+01:00'))
    // Une fenêtre qui commence avant le lever voit aussi la fin de la nuit précédente, coupée à son début.
    const matin = intervallesNuit(soleil, t('2026-11-20T06:00:00+01:00'), t('2026-11-20T12:00:00+01:00'))
    expect(matin).toEqual([{ debut: t('2026-11-20T06:00:00+01:00'), fin: t('2026-11-20T08:20:00+01:00') }])
  })

  it('donne le prochain coucher', () => {
    expect(prochainCoucher(soleil, t('2026-11-20T12:00:00+01:00'))).toBe('2026-11-20T17:08:00+01:00')
    expect(prochainCoucher(soleil, t('2026-11-22T12:00:00+01:00'))).toBeNull()
  })

  it('trouve l’heure où le danger bascule', () => {
    const b = basculeDanger(heures, 0)!
    expect(b.heure.danger).toBe('rouge')
    expect(b.heure.instant).toBe('2026-11-20T16:00:00.000Z')
    expect(basculeDanger(heures.slice(0, 5), 0)).toBeNull()
    expect(basculeDanger([], 0)).toBeNull()
  })

  it('repère l’étale dans le créneau, la plus calme', () => {
    const creneau = { debut: '2026-11-20T13:30:00+01:00', fin: '2026-11-20T15:30:00+01:00' }
    const etale = etaleDansCreneau(heures, creneau)!
    expect(etale.instant).toBe('2026-11-20T14:00:00.000Z')
    expect(estEtale(etale.courant_kmh)).toBe(true)
    expect(
      etaleDansCreneau(heures, { debut: '2026-11-20T10:00:00+01:00', fin: '2026-11-20T11:00:00+01:00' }),
    ).toBeNull()
    expect(etaleDansCreneau(heures, null)).toBeNull()
  })

  it('trouve l’heure la plus proche et les marées voisines', () => {
    expect(rangProche(heures, t('2026-11-20T12:10:00+01:00'))).toBe(2)
    expect(pleineMerSuivante(conditions.marees, t('2026-11-20T10:40:00+01:00'))?.hauteur_m).toBe(6.9)
    expect(pleineMerSuivante(conditions.marees, t('2026-11-20T16:00:00+01:00'))).toBeNull()
    expect(mareeProche(conditions.marees, t('2026-11-20T20:00:00+01:00'))?.type).toBe('BM')
    expect(mareeProche([], 0)).toBeNull()
  })
})

describe('contraste des encres', () => {
  it('lit les couleurs hexadécimales et rgb()', () => {
    expect(lireCouleur('#fff')).toEqual([255, 255, 255])
    expect(lireCouleur('#0b0d10')).toEqual([11, 13, 16])
    expect(lireCouleur('rgb(10, 20, 30)')).toEqual([10, 20, 30])
    expect(lireCouleur('color-mix(in srgb, red, blue)')).toBeNull()
  })

  it('calcule le contraste WCAG', () => {
    expect(contraste([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0)
    expect(luminance([255, 255, 255])).toBeCloseTo(1, 6)
    expect(estClair('#efe9dd')).toBe(true)
    expect(estClair('#0b0d10')).toBe(false)
    expect(estClair('inconnu')).toBeNull()
  })

  it('garde le badge de danger lisible : chaque encre ressort d’au moins 3:1 sur son disque sombre', () => {
    const scrim = lireCouleur(ENCRES.scrim)!
    expect(contraste(lireCouleur(ENCRES.danger.vert)!, scrim)).toBeGreaterThanOrEqual(3)
    expect(contraste(lireCouleur(ENCRES.danger.rouge)!, scrim)).toBeGreaterThanOrEqual(3)
    // Le noir est cerclé de blanc : c'est le liseré qui porte le contraste.
    expect(contraste(lireCouleur(ENCRES.lisere)!, scrim)).toBeGreaterThanOrEqual(3)
  })

  // Les fonds de page de chacun des quatre thèmes, en jour et en sombre : le sable doit s'y voir (3:1 pour un trait).
  const FONDS: [string, string][] = [
    ['Papier jour', '#efe9dd'],
    ['Papier soir', '#121110'],
    ['Estampe jour', '#ece7da'],
    ['Estampe sombre', '#0e1014'],
    ['Matière jour', '#cfccc4'],
    ['Matière sombre', '#131416'],
    ['Classique', '#0b0d10'],
  ]
  it.each(FONDS)('garde le sable visible sur le fond de %s', (_nom, fond) => {
    const rgb = lireCouleur(fond)!
    const encre = estClair(fond) ? ENCRES.sable.clair : ENCRES.sable.sombre
    expect(contraste(lireCouleur(encre)!, rgb)).toBeGreaterThanOrEqual(3)
  })
})
