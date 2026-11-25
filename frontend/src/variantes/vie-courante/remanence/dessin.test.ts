import { describe, expect, it } from 'vitest'

import { dessinerChamp, dessinerColonne, type ParametresChamp } from './dessin'
import { fauxContexte } from './faussesToiles'
import { type EmpreinteAffichee, type EncresMur, palierSouffle, type Ressenti } from './modele'

const ENCRES: EncresMur = {
  mur: { r: 17, g: 20, b: 23, a: 1 },
  lumiere: { r: 233, g: 236, b: 239, a: 1 },
}

const FIXE = { temps: 0, ecoule: Number.POSITIVE_INFINITY, dt: 0 }

function empreinte(age: number, heures: number | null, ressenti: Ressenti | null = 'bon'): EmpreinteAffichee {
  return {
    date: `2026-11-${String(24 - age).padStart(2, '0')}`,
    heures,
    qualite: null,
    age,
    ressenti,
    provisoire: false,
  }
}

const SEMAINE: EmpreinteAffichee[] = [6, 5, 4, 3, 2, 1, 0].map((age) => empreinte(age, 6 + age / 4))

function parametres(surcharge: Partial<ParametresChamp> = {}): ParametresChamp {
  return { empreintes: SEMAINE, moyenne: 7, survol: null, lissees: [], ...surcharge }
}

describe('le champ des empreintes', () => {
  it('allume une empreinte par nuit notée, posée sur la ligne de sol', () => {
    const { contexte, nombre } = fauxContexte()
    dessinerChamp(contexte, 640, 360, FIXE, parametres(), ENCRES, 'immobile')

    expect(nombre('fill')).toBe(7)
    expect(nombre('roundRect')).toBe(7)
    // Les nuits n'ont pas de contour sauf celles au bord net : ici toutes ont un bord doux.
    expect(nombre('stroke')).toBeGreaterThanOrEqual(3) // ligne des 8 h, sol, moyenne
  })

  it('laisse un tiret sur le sol pour une nuit non notée, sans rectangle', () => {
    const { contexte, nombre } = fauxContexte()
    const vide = [...SEMAINE.slice(0, 6), empreinte(0, null, null)]
    dessinerChamp(contexte, 640, 360, FIXE, parametres({ empreintes: vide }), ENCRES, 'immobile')

    expect(nombre('fill')).toBe(6)
    expect(nombre('setLineDash')).toBeGreaterThanOrEqual(2)
  })

  it('durcit le bord d’une mauvaise nuit et adoucit celui d’une bonne', () => {
    const net = fauxContexte()
    dessinerChamp(
      net.contexte,
      640,
      360,
      FIXE,
      parametres({ empreintes: [empreinte(0, 5, 'difficile')] }),
      ENCRES,
      'immobile',
    )
    // Bord net : pas de flou, mais un trait de 1 px qui le marque.
    expect(net.appels.some((a) => a.methode === '=shadowBlur' && (a.args[0] as number) > 0)).toBe(false)
    expect(net.nombre('stroke')).toBeGreaterThan(3)

    const doux = fauxContexte()
    dessinerChamp(
      doux.contexte,
      640,
      360,
      FIXE,
      parametres({ empreintes: [empreinte(0, 5, 'bon')] }),
      ENCRES,
      'immobile',
    )
    expect(doux.appels.some((a) => a.methode === '=shadowBlur' && (a.args[0] as number) > 0)).toBe(true)
  })

  it('montre la nuit du jour pas encore imprimée en contour de tirets', () => {
    const { contexte, appels } = fauxContexte()
    const provisoire = [{ ...empreinte(0, 7, null), provisoire: true }]
    dessinerChamp(contexte, 640, 360, FIXE, parametres({ empreintes: provisoire }), ENCRES, 'immobile')

    expect(appels.some((a) => a.methode === 'setLineDash' && (a.args[0] as number[]).length === 2)).toBe(true)
    expect(appels.some((a) => a.methode === '=lineWidth' && a.args[0] === 1.5)).toBe(true)
  })

  it('n’allume rien avant le début de l’entrée en cinéma, puis les nuits une à une', () => {
    const debut = fauxContexte()
    dessinerChamp(debut.contexte, 640, 360, { temps: 0, ecoule: 0, dt: 0 }, parametres(), ENCRES, 'cinema')
    expect(debut.nombre('fill')).toBe(0)

    // Un peu plus tard seules les plus anciennes brillent : la plus récente n'est pas encore là.
    const milieu = fauxContexte()
    dessinerChamp(milieu.contexte, 640, 360, { temps: 0, ecoule: 0.2, dt: 0 }, parametres(), ENCRES, 'cinema')
    expect(milieu.nombre('fill')).toBeGreaterThan(0)
    expect(milieu.nombre('fill')).toBeLessThan(7)
  })

  it('trace la moyenne fantôme seulement quand il y a une moyenne', () => {
    const avec = fauxContexte()
    dessinerChamp(avec.contexte, 640, 360, FIXE, parametres(), ENCRES, 'immobile')
    const sans = fauxContexte()
    dessinerChamp(sans.contexte, 640, 360, FIXE, parametres({ moyenne: null }), ENCRES, 'immobile')

    expect(avec.nombre('stroke')).toBe(sans.nombre('stroke') + 1)
  })

  it('lisse l’intensité du survol d’une image à l’autre', () => {
    const { contexte } = fauxContexte()
    const lissees: number[] = []
    dessinerChamp(
      contexte,
      640,
      360,
      { ...FIXE, dt: 0 },
      parametres({ survol: 3, lissees }),
      ENCRES,
      'immobile',
    )
    // Sans durée écoulée, l'image est tout de suite à sa cible : la visée à 1, les autres à 0,7.
    expect(lissees[3]).toBe(1)
    expect(lissees[0]).toBeCloseTo(0.7, 6)

    dessinerChamp(
      contexte,
      640,
      360,
      { ...FIXE, dt: 0.016 },
      parametres({ survol: null, lissees }),
      ENCRES,
      'immobile',
    )
    // Le survol s'est levé : l'empreinte 0 remonte vers 1 sans y sauter.
    expect(lissees[0]).toBeGreaterThan(0.7)
    expect(lissees[0]).toBeLessThan(1)
  })

  it('ne casse pas dans un cadre minuscule', () => {
    const { contexte } = fauxContexte()
    expect(() => dessinerChamp(contexte, 20, 40, FIXE, parametres(), ENCRES, 'immobile')).not.toThrow()
  })
})

describe('la colonne de récupération', () => {
  const colonne = (progression: number, temps: number, niveau: 'cinema' | 'sobre' | 'immobile') => {
    const faux = fauxContexte()
    dessinerColonne(
      faux.contexte,
      120,
      360,
      { temps, ecoule: Number.POSITIVE_INFINITY, dt: 0 },
      { progression, palier: palierSouffle(5.6) },
      ENCRES,
      niveau,
    )
    return faux
  }

  it('reste vide quand rien n’est récupéré, mais garde son contenant', () => {
    const faux = colonne(0, 0, 'immobile')
    expect(faux.nombre('fillRect')).toBe(0)
    expect(faux.nombre('stroke')).toBeGreaterThan(0)
  })

  it('se remplit de lumière quand la récupération avance', () => {
    const faux = colonne(0.82, 0, 'immobile')
    expect(faux.nombre('fillRect')).toBe(2) // le remplissage et le trait vif du bord haut
  })

  it('fait respirer le bord haut en cinéma, pas en immobile', () => {
    const bord = (temps: number, niveau: 'cinema' | 'immobile') =>
      colonne(0.5, temps, niveau).appels.filter((a) => a.methode === 'fillRect')[1]?.args[1] as number
    // Palier « frais » : 12 s de cycle, le sommet de la respiration est à 3 s.
    expect(bord(3, 'cinema')).not.toBeCloseTo(bord(0, 'cinema'), 1)
    expect(bord(3, 'immobile')).toBeCloseTo(bord(0, 'immobile'), 6)
  })
})
