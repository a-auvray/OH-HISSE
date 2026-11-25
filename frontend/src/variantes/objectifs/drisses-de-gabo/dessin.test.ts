import { describe, expect, it } from 'vitest'

import { dessinerSculpture, type EtatSculpture, type Encres, lireEncres } from './dessin'
import { NOMBRE_DE_FILS } from './modele'

const ENCRES: Encres = { hisse: '#aaa', ombre: '#777', corde: '#fff', pince: '#80f' }

/** Un contexte 2D qui note ce qu'on lui demande : on compte les traits, on regarde leurs couleurs. */
function fauxContexte() {
  const traits: { couleur: string; alpha: number; de: [number, number]; a: [number, number] }[] = []
  let courant: { de: [number, number]; a: [number, number] } | null = null
  let ligne: [number, number][] = []
  const ctx = {
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    globalAlpha: 1,
    clearRect: () => undefined,
    beginPath: () => {
      courant = null
      ligne = []
    },
    moveTo: (x: number, y: number) => {
      ligne = [[x, y]]
      courant = { de: [x, y], a: [x, y] }
    },
    lineTo: (x: number, y: number) => {
      ligne.push([x, y])
      if (courant) courant.a = [x, y]
    },
    stroke: () => {
      if (courant)
        traits.push({ couleur: ctx.strokeStyle, alpha: ctx.globalAlpha, de: courant.de, a: courant.a })
    },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, traits }
}

const ETAT: EtatSculpture = { p: 0.64, ouverture: 1, verrou: 0, luminosite: 1, pince: true }

describe('dessinerSculpture', () => {
  it('trace les 96 fils en deux tronçons (éclairé sous la pince, dans l’ombre au-dessus)', () => {
    const { ctx, traits } = fauxContexte()
    dessinerSculpture(ctx, 400, 300, ETAT, ENCRES)
    const eclaires = traits.filter((t) => t.couleur === ENCRES.hisse)
    const dansLOmbre = traits.filter((t) => t.couleur === ENCRES.ombre)
    expect(eclaires).toHaveLength(NOMBRE_DE_FILS)
    // Un tronçon d'ombre par fil, plus les deux barres.
    expect(dansLOmbre).toHaveLength(NOMBRE_DE_FILS + 2)
  })

  it('serre les fils d’une pince, une seule ligne', () => {
    const { ctx, traits } = fauxContexte()
    dessinerSculpture(ctx, 400, 300, ETAT, ENCRES)
    expect(traits.filter((t) => t.couleur === ENCRES.pince)).toHaveLength(1)
  })

  it('n’a pas de pince au repos de la progression nulle, ni éteinte, ni verrouillée', () => {
    for (const etat of [
      { ...ETAT, p: 0 },
      { ...ETAT, pince: false },
      { ...ETAT, p: 1, verrou: 1 },
    ]) {
      const { ctx, traits } = fauxContexte()
      dessinerSculpture(ctx, 400, 300, etat, ENCRES)
      expect(traits.filter((t) => t.couleur === ENCRES.pince)).toHaveLength(0)
    }
  })

  it('range les fils en une seule ligne verticale au verrouillage', () => {
    const { ctx, traits } = fauxContexte()
    dessinerSculpture(ctx, 400, 300, { ...ETAT, p: 1, verrou: 1 }, ENCRES)
    const fils = traits.filter((t) => t.couleur === ENCRES.corde)
    expect(fils.length).toBeGreaterThan(0)
    for (const f of fils) {
      expect(f.de[0]).toBeCloseTo(200, 3)
      expect(f.a[0]).toBeCloseTo(200, 3)
    }
  })

  it('atténue tout ce qu’on dessine quand l’objectif est détendu', () => {
    const clair = fauxContexte()
    dessinerSculpture(clair.ctx, 400, 300, ETAT, ENCRES)
    const eteint = fauxContexte()
    dessinerSculpture(eteint.ctx, 400, 300, { ...ETAT, luminosite: 0.4 }, ENCRES)
    expect(Math.max(...eteint.traits.map((t) => t.alpha))).toBeLessThan(
      Math.max(...clair.traits.map((t) => t.alpha)),
    )
  })

  it('ne dessine rien dans un cadre sans taille', () => {
    const { ctx, traits } = fauxContexte()
    dessinerSculpture(ctx, 0, 0, ETAT, ENCRES)
    expect(traits).toHaveLength(0)
  })

  it('reste dans son cadre', () => {
    const { ctx, traits } = fauxContexte()
    dessinerSculpture(ctx, 400, 300, ETAT, ENCRES)
    for (const t of traits) {
      for (const [x, y] of [t.de, t.a]) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(400)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(300)
      }
    }
  })
})

describe('lireEncres', () => {
  it('lit les jetons du thème courant à l’appel, avec un repli quand il n’y en a pas', () => {
    const element = document.createElement('div')
    document.body.append(element)
    expect(lireEncres(element).hisse).toBe('#b9a2ff')
    element.style.setProperty('--accent-clair', '#123456')
    expect(lireEncres(element).hisse).toBe('#123456')
    element.remove()
  })
})
