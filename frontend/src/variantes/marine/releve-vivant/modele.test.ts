import { describe, expect, it } from 'vitest'

import type { Conditions } from '../../../api/types'
import { nombre } from '../../../commun/format'
import styles from './ConditionsReleve.module.css?raw'
import {
  altitudeADistance,
  amplitudeDeFrange,
  arrondirDistance,
  cheminDeFrange,
  cheminMonotone,
  coordonnees,
  dateLongueParis,
  distanceAuNiveau,
  dureeDeFrange,
  echelle,
  fenetreDeDanger,
  finDuNiveau,
  fractionDeRegle,
  graduationsHoraires,
  type Heure,
  heureDuJour,
  isolignes,
  libelleDuTampon,
  ligneDeVerdict,
  mareeProche,
  pasDeGraduation,
  phraseDeDanger,
  phraseDeDistance,
  phraseDeDuree,
  phraseDeRegle,
  plafondDeHauteur,
  plagesDeDanger,
  profilDePlage,
  prochainesMarees,
  rangLePlusProche,
  valeurDeFrange,
} from './modele'

/** Une heure de prévision, le 23/11/2026 (heure d'hiver : +01:00). */
const h = (heure: number, danger: Heure['danger'], hauteur: number | null, distance?: number | null): Heure =>
  ({
    instant: `2026-11-23T${String(heure).padStart(2, '0')}:00:00+01:00`,
    danger,
    hauteur_eau_m: hauteur,
    distance_eau_m: distance,
  }) as Heure

const JOUR = [
  h(13, 'vert', 4.6, 50),
  h(14, 'vert', 5.8, 20),
  h(15, 'vert', 6.9, 0),
  h(16, 'vert', 6.2, 15),
  h(17, 'rouge', 5.0, 40),
  h(18, 'rouge', 3.8, 80),
]

describe('échelle', () => {
  it('place les valeurs entre deux bornes, dans les deux sens', () => {
    const e = echelle(0, 10, 100, 300)
    expect(e(0)).toBe(100)
    expect(e(10)).toBe(300)
    expect(e(5)).toBe(200)
    expect(echelle(0, 8, 200, 0)(2)).toBe(150)
  })

  it('ne divise pas par zéro quand le domaine est nul', () => {
    expect(echelle(3, 3, 0, 100)(3)).toBe(50)
  })
})

describe('cheminMonotone', () => {
  const nombres = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

  it('ne dessine rien sans points, et un point seul sans courbe', () => {
    expect(cheminMonotone([])).toBe('')
    expect(cheminMonotone([{ x: 5, y: 7 }])).toBe('M5.0,7.0')
  })

  it('passe par chaque point', () => {
    const d = cheminMonotone([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ])
    expect(d.startsWith('M0.0,10.0')).toBe(true)
    expect(d).toContain('10.0,0.0')
    expect(d.endsWith('20.0,10.0')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(2)
  })

  it('ne dépasse jamais ses points : une pleine mer lissée ne monte pas plus haut que la prévision', () => {
    const hauts = [2, 5, 7, 5, 2]
    const d = cheminMonotone(hauts.map((v, i) => ({ x: i * 10, y: -v })))
    // Toutes les ordonnées des poignées restent entre le point le plus bas (-7) et le plus haut (-2).
    const ordonnees = nombres(d).filter((_, i) => i % 2 === 1)
    expect(Math.min(...ordonnees)).toBeGreaterThanOrEqual(-7)
    expect(Math.max(...ordonnees)).toBeLessThanOrEqual(-2)
  })
})

describe('heures', () => {
  it('lit l’heure de la plage, quel que soit le fuseau du navigateur', () => {
    expect(heureDuJour('2026-11-23T13:05:00+01:00')).toBe(13)
    expect(heureDuJour('2026-11-23T00:00:00+01:00')).toBe(0)
    expect(heureDuJour('2026-11-22T23:30:00Z')).toBe(0)
  })

  it('écrit la date du relevé en français', () => {
    expect(dateLongueParis('2026-11-23T13:05:00+01:00')).toBe('lundi 23 novembre')
  })

  it('gradue une heure sur trois et repère les minuits', () => {
    const jour = Array.from({ length: 25 }, (_, i) => h(i % 24, 'vert', 1))
    // Les instants sont tous le 23 ; seul le rang compte ici.
    const g = graduationsHoraires(jour, 6)
    expect(g.map((x) => x.etiquette)).toEqual(['0h', '6h', '12h', '18h', '0h'])
    expect(g.filter((x) => x.minuit)).toHaveLength(2)
  })

  it('espace les graduations d’au moins 46 px', () => {
    expect(pasDeGraduation(900, 48)).toBe(3)
    expect(pasDeGraduation(300, 48)).toBe(12)
    expect(pasDeGraduation(2000, 25)).toBe(1)
  })

  it('trouve l’heure la plus proche d’un instant', () => {
    const t = JOUR.map((x) => Date.parse(x.instant))
    expect(rangLePlusProche(t, Date.parse('2026-11-23T14:20:00+01:00'))).toBe(1)
    expect(rangLePlusProche(t, Date.parse('2026-11-23T14:40:00+01:00'))).toBe(2)
    expect(rangLePlusProche(t, 0)).toBe(0)
    expect(rangLePlusProche([], 5)).toBe(0)
  })
})

describe('danger', () => {
  it('regroupe les heures de même niveau', () => {
    const plages = plagesDeDanger([...JOUR, h(19, 'vert', 2)])
    expect(plages.map((p) => p.niveau)).toEqual(['vert', 'rouge', 'vert'])
    expect(plages[0]?.finMs).toBe(plages[1]?.debutMs)
    // La dernière heure dure une heure : on ne devine rien au-delà.
    expect(plages[2]?.finMs).toBe(Date.parse('2026-11-23T20:00:00+01:00'))
  })

  it('trouve la première heure où le niveau change', () => {
    expect(finDuNiveau(JOUR, Date.parse('2026-11-23T13:05:00+01:00'), 'vert')).toBe(JOUR[4]?.instant)
    expect(finDuNiveau(JOUR, Date.parse('2026-11-23T17:30:00+01:00'), 'rouge')).toBeNull()
  })

  it('dit combien de temps ça dure', () => {
    expect(fenetreDeDanger('vert', JOUR, JOUR[0]!.instant)).toBe('jusqu’à 17h')
    expect(fenetreDeDanger('rouge', JOUR, JOUR[4]!.instant)).toBe('jusqu’à la fin des prévisions')
    expect(fenetreDeDanger('noir', JOUR, JOUR[0]!.instant)).toBe('NE PAS Y ALLER')
  })

  it('écrit le tampon', () => {
    expect(libelleDuTampon('vert', JOUR, JOUR[0]!.instant)).toBe('VERT · jusqu’à 17h')
    expect(libelleDuTampon('noir', JOUR, JOUR[0]!.instant)).toBe('NOIR · NE PAS Y ALLER')
  })

  it('nomme le jour quand le niveau change le lendemain', () => {
    const nuit = [h(22, 'vert', 3), { ...h(7, 'rouge', 3), instant: '2026-11-24T07:00:00+01:00' } as Heure]
    expect(fenetreDeDanger('vert', nuit, nuit[0]!.instant)).toMatch(/jusqu’à .* 7h$/)
  })

  it('met le ruban en phrase', () => {
    expect(phraseDeDanger(plagesDeDanger(JOUR))).toBe('VERT jusqu’à 17h · ROUGE dès 17h')
    expect(phraseDeDanger(plagesDeDanger([...JOUR, h(19, 'vert', 2)]))).toBe(
      'VERT jusqu’à 17h · ROUGE de 17h à 19h · VERT dès 19h',
    )
    expect(phraseDeDanger(plagesDeDanger(JOUR.slice(0, 2)))).toBe('VERT sur toute la période prévue')
    expect(phraseDeDanger([])).toBe('')
  })

  it('garde l’encre lisible sur chaque tampon (WCAG AA, 4,5:1)', () => {
    const couleur = (nom: string) => new RegExp(`--${nom}:\\s*(#[0-9a-f]{6})`, 'i').exec(styles)?.[1]
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      }) as [number, number, number]
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const contraste = (a: string, b: string) => {
      const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
      return (clair + 0.05) / (sombre + 0.05)
    }
    const encre = couleur('encre-danger')
    const noir = couleur('danger-noir')
    const liseret = couleur('danger-noir-liseret')
    expect(encre && couleur('danger-vert') && couleur('danger-rouge') && noir && liseret).toBeTruthy()
    expect(contraste(encre!, couleur('danger-vert')!)).toBeGreaterThanOrEqual(4.5)
    expect(contraste(encre!, couleur('danger-rouge')!)).toBeGreaterThanOrEqual(4.5)
    expect(contraste(liseret!, noir!)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('marées', () => {
  const marees = [
    { type: 'PM', instant: '2026-11-23T03:00:00+01:00', hauteur_m: 7, coefficient: 90 },
    { type: 'BM', instant: '2026-11-23T09:10:00+01:00', hauteur_m: 0.8, coefficient: null },
    { type: 'PM', instant: '2026-11-23T14:52:00+01:00', hauteur_m: 6.9, coefficient: 87 },
    { type: 'BM', instant: '2026-11-23T21:08:00+01:00', hauteur_m: 0.9, coefficient: null },
  ] as Conditions['marees']

  it('donne le coefficient de la marée la plus proche', () => {
    expect(mareeProche(marees, Date.parse('2026-11-23T13:00:00+01:00'))?.coefficient).toBe(87)
    expect(mareeProche([], 0)).toBeUndefined()
  })

  it('cherche la prochaine pleine mer et la prochaine basse mer', () => {
    const { pm, bm } = prochainesMarees(marees, Date.parse('2026-11-23T13:00:00+01:00'))
    expect(pm?.hauteur_m).toBe(6.9)
    expect(bm?.hauteur_m).toBe(0.9)
  })

  it('retombe sur la dernière connue quand il n’y en a plus', () => {
    const { pm } = prochainesMarees(marees, Date.parse('2026-11-23T23:00:00+01:00'))
    expect(pm?.hauteur_m).toBe(6.9)
    expect(prochainesMarees([], 0)).toEqual({ pm: undefined, bm: undefined })
  })

  it('règle le plafond de la courbe au mètre entier au-dessus de la plus haute eau', () => {
    expect(plafondDeHauteur(JOUR)).toBe(7)
    expect(plafondDeHauteur([h(1, 'vert', 8.2)])).toBe(9)
    expect(plafondDeHauteur([])).toBe(7)
  })
})

describe('profil de plage', () => {
  it('relève un point par heure : le niveau de l’eau et la distance à parcourir', () => {
    expect(profilDePlage(JOUR)).toEqual([
      { distance: 0, hauteur: 6.9 },
      { distance: 15, hauteur: 6.2 },
      { distance: 20, hauteur: 5.8 },
      { distance: 40, hauteur: 5.0 },
      { distance: 50, hauteur: 4.6 },
      { distance: 80, hauteur: 3.8 },
    ])
  })

  it('descend toujours vers le large, et garde le point le plus haut à distance égale', () => {
    const profil = profilDePlage([
      h(1, 'vert', 6, 0),
      h(2, 'vert', 7, 0),
      h(3, 'vert', 5, 30),
      h(4, 'vert', 5.5, 60),
    ])
    expect(profil).toEqual([
      { distance: 0, hauteur: 7 },
      { distance: 30, hauteur: 5 },
      { distance: 60, hauteur: 5 },
    ])
  })

  it('ne devine pas : sans deux distances différentes, pas de profil', () => {
    expect(profilDePlage([])).toEqual([])
    expect(profilDePlage([h(1, 'vert', 6, null), h(2, 'vert', 5)])).toEqual([])
    expect(profilDePlage([h(1, 'vert', 6, 10), h(2, 'vert', 5, 10)])).toEqual([])
    expect(profilDePlage([h(1, 'vert', null, 10), h(2, 'vert', 5, 20)])).toEqual([])
  })

  const profil = profilDePlage(JOUR)

  it('place l’eau sur le sable, en interpolant entre deux relevés', () => {
    expect(distanceAuNiveau(profil, 5.8)).toBe(20)
    expect(distanceAuNiveau(profil, 5.4)).toBeCloseTo(30, 6)
    // Au-dessus du plus haut relevé : au pied de la digue. En dessous du plus bas : au bout du relevé.
    expect(distanceAuNiveau(profil, 9)).toBe(0)
    expect(distanceAuNiveau(profil, 1)).toBe(80)
    expect(distanceAuNiveau([], 3)).toBe(0)
  })

  it('lit l’altitude du sable à une distance', () => {
    expect(altitudeADistance(profil, 30)).toBeCloseTo(5.4)
    expect(altitudeADistance(profil, -5)).toBe(6.9)
    expect(altitudeADistance(profil, 500)).toBe(3.8)
    expect(altitudeADistance([], 3)).toBe(0)
  })

  it('passe sans diviser par zéro sur une plateforme', () => {
    const plat = [
      { distance: 0, hauteur: 5 },
      { distance: 10, hauteur: 5 },
      { distance: 20, hauteur: 3 },
    ]
    expect(distanceAuNiveau(plat, 5)).toBe(0)
    expect(Number.isFinite(distanceAuNiveau(plat, 4))).toBe(true)
  })

  it('trace les isolignes de hauteur d’eau tous les demi-mètres, au large de la ligne d’eau', () => {
    const lignes = isolignes(profil, 6.2)
    expect(lignes[0]).toEqual({ profondeurM: 0.5, distance: expect.closeTo(distanceAuNiveau(profil, 5.7)) })
    // Chaque ligne est plus au large que la précédente, et aucune ne sort du relevé.
    expect(lignes.map((l) => l.distance)).toEqual([...lignes.map((l) => l.distance)].sort((a, b) => a - b))
    expect(Math.max(...lignes.map((l) => l.distance))).toBeLessThanOrEqual(80)
    expect(lignes.length).toBeGreaterThan(2)
    expect(lignes.at(-1)!.profondeurM).toBeLessThanOrEqual(6.2 - 3.8)
  })

  it('glisse avec l’eau : plus la mer monte, plus les lignes reculent vers la digue', () => {
    const bas = isolignes(profil, 4.6)[0]!
    const haut = isolignes(profil, 6.2)[0]!
    expect(haut.distance).toBeLessThan(bas.distance)
  })

  it('n’invente rien sans profil', () => {
    expect(isolignes([], 5)).toEqual([])
  })
})

describe('distances', () => {
  it('arrondit à 10 m, sans jamais promettre l’eau au pied de la digue à tort', () => {
    expect(arrondirDistance(0)).toBe(0)
    expect(arrondirDistance(4)).toBe(10)
    expect(arrondirDistance(44)).toBe(40)
    expect(arrondirDistance(205)).toBe(210)
  })

  it('met la distance en phrase', () => {
    expect(phraseDeDistance(44)).toBe('40 m de sable')
    expect(phraseDeDistance(0)).toBe('l’eau au pied de la digue')
    expect(phraseDeDistance(null)).toBeNull()
    expect(phraseDeDistance(undefined)).toBeNull()
    expect(phraseDeDistance(1200)).toBe(`${nombre(1200)} m de sable`)
  })
})

describe('frange de houle', () => {
  it('donne environ 6 px à 0,8 m de vagues, avec des bornes', () => {
    expect(amplitudeDeFrange(0.8)).toBeCloseTo(6)
    expect(amplitudeDeFrange(0)).toBe(1.5)
    expect(amplitudeDeFrange(10)).toBe(20)
    expect(amplitudeDeFrange(null)).toBeGreaterThan(0)
  })

  it('suit la période, sans jamais dépasser 0,2 Hz', () => {
    expect(dureeDeFrange(7)).toBe(7)
    expect(dureeDeFrange(2)).toBe(5)
    expect(1 / dureeDeFrange(1)).toBeLessThanOrEqual(0.2)
    expect(dureeDeFrange(60)).toBe(20)
    expect(dureeDeFrange(null)).toBe(7)
  })

  it('se raccorde : décalée d’une période, la frange est identique', () => {
    for (const x of [0, 13, 47.5, 90]) {
      expect(valeurDeFrange(x + 96, 6, 96)).toBeCloseTo(valeurDeFrange(x, 6, 96), 6)
    }
  })

  it('reste dans son amplitude', () => {
    const max = Math.max(...Array.from({ length: 200 }, (_, i) => Math.abs(valeurDeFrange(i, 6, 96))))
    expect(max).toBeLessThanOrEqual(6)
  })

  it('couvre la longueur demandée plus une période', () => {
    const dernierX = cheminDeFrange(100, 5, 96).split(' L').at(-1)!.split(',')[0]
    expect(Number(dernierX)).toBeGreaterThanOrEqual(196)
  })
})

describe('phrases de la page', () => {
  it('écrit la position du spot', () => {
    expect(coordonnees(49.2756, -0.2574)).toBe('49,276° N · 0,257° O')
    expect(coordonnees(-33.9, 151.2)).toBe('33,9° S · 151,2° E')
  })

  it('place l’eau sur la règle de 0 à 25 °C', () => {
    expect(fractionDeRegle(12)).toBeCloseTo(0.48)
    expect(fractionDeRegle(15)).toBeCloseTo(0.6)
    expect(fractionDeRegle(40)).toBe(1)
    expect(fractionDeRegle(-3)).toBe(0)
    expect(fractionDeRegle(null)).toBe(0)
  })

  it('décrit la règle pour qui ne la voit pas', () => {
    expect(phraseDeRegle(12)).toBe('Eau à 12 °C, sous le seuil de choc thermique de 15 °C.')
    expect(phraseDeRegle(18.4)).toBe('Eau à 18,4 °C, au-dessus du seuil de choc thermique de 15 °C.')
    expect(phraseDeRegle(null)).toBe('Température de l’eau inconnue.')
  })

  it('met les durées d’eau froide en phrase', () => {
    expect(phraseDeDuree({ conseille_min: 25, maximum_min: 40 })).toBe('25 min conseillées · 40 max')
    expect(phraseDeDuree({ conseille_min: 25, maximum_min: null })).toBe('25 min conseillées')
    expect(phraseDeDuree({ conseille_min: null, maximum_min: 40 })).toBeNull()
    expect(phraseDeDuree(null)).toBeNull()
  })

  it('compose la ligne du verdict', () => {
    const conditions = {
      maintenant: { instant: '2026-11-23T13:05:00+01:00', eau_c: 12 },
      danger: { niveau: 'vert', raisons: [] },
      heures: JOUR,
    } as unknown as Conditions
    expect(ligneDeVerdict(conditions, { conseille_min: 25, maximum_min: 40 })).toEqual([
      'VERT jusqu’à 17h',
      'eau 12 °C',
      '25 min conseillées · 40 max',
    ])
    expect(ligneDeVerdict(conditions, null)).toEqual(['VERT jusqu’à 17h', 'eau 12 °C'])
  })

  it('dit « NE PAS Y ALLER » à l’état noir, sans durée à proposer', () => {
    const conditions = {
      maintenant: { instant: '2026-11-23T13:05:00+01:00', eau_c: null },
      danger: { niveau: 'noir', raisons: [] },
      heures: JOUR,
    } as unknown as Conditions
    expect(ligneDeVerdict(conditions, null)).toEqual(['NOIR · NE PAS Y ALLER'])
  })
})
