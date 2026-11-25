import { describe, expect, it } from 'vitest'

import type { ObjectifLu, PointEvolution } from '../../../api/types'
import {
  amplitudePincement,
  avancement,
  bornesVerticales,
  calculerRythme,
  deplacement,
  DUREE_PINCEMENT,
  eclairage,
  extremites,
  geometrieCourbe,
  hautDePince,
  hautDeProjection,
  lacetVerrouille,
  largeurOuverte,
  LACET_DE_REPOS,
  NOMBRE_DE_FILS,
  penteReelle,
  phraseBulle,
  phraseEcart,
  phrasePente,
  projeter,
  semaines,
  signe,
  statut,
  surFil,
  texteDrisse,
  torsion,
  trajetHisse,
} from './modele'

const AUJOURDHUI = '2026-11-25'

function objectif(surcharge: Partial<ObjectifLu> = {}): ObjectifLu {
  return {
    id: 1,
    titre: 'Traction +50 kg',
    type: 'max',
    exercice_id: 1,
    exercice: 'Tractions',
    valeur_cible_kg: 50,
    date_cible: '2027-03-15',
    principal: true,
    statut: 'en_cours',
    jours_restants: 112,
    blocs: [],
    progression: { e1rm_lest_kg: 41.5, le: '2026-11-21', pourcentage: 83, cible_atteinte: false },
    ...surcharge,
  }
}

function point(date: string, e1rm: number | null): PointEvolution {
  return {
    seance_id: 1,
    date,
    e1rm_lest_kg: e1rm,
    e1rm_total_kg: null,
    tonnage_kg: 0,
    series: 0,
    reps: 0,
    rpe_moyen: null,
    poids_du_corps_kg: null,
  }
}

/** Quatre séances à une semaine d'écart, +0,5 kg par semaine, la dernière aujourd'hui. */
const SEANCES_REGULIERES = [
  point('2026-11-04', 40),
  point('2026-11-11', 40.5),
  point('2026-11-18', 41),
  point('2026-11-25', 41.5),
]

describe('formats', () => {
  it('écrit toujours le signe, avec un vrai moins', () => {
    expect(signe(0.52)).toBe('+0,52')
    expect(signe(-3.14, 1)).toBe('−3,1')
    expect(signe(41.5, 1)).toBe('+41,5')
  })

  it('arrondit les jours en semaines, au moins une', () => {
    expect(semaines(115)).toBe('16 semaines')
    expect(semaines(3)).toBe('1 semaine')
  })
})

describe('avancement', () => {
  it('suit le pourcentage de l’API, borné entre 0 et 1', () => {
    expect(avancement(objectif())).toBeCloseTo(0.83)
    expect(avancement(objectif({ progression: null }))).toBe(0)
    expect(
      avancement(
        objectif({
          progression: { e1rm_lest_kg: 60, le: '2026-11-21', pourcentage: 120, cible_atteinte: true },
        }),
      ),
    ).toBe(1)
  })
})

describe('penteReelle', () => {
  it('est la régression des e1RM des quatre dernières semaines', () => {
    expect(penteReelle(SEANCES_REGULIERES, AUJOURDHUI)).toBeCloseTo(0.5, 5)
  })

  it('dit qu’elle ne sait pas avec moins de trois séances dans la fenêtre', () => {
    expect(penteReelle(SEANCES_REGULIERES.slice(2), AUJOURDHUI)).toBeNull()
    // Une séance vieille de plus de 28 jours ne compte plus.
    expect(penteReelle([point('2026-09-01', 30), ...SEANCES_REGULIERES.slice(2)], AUJOURDHUI)).toBeNull()
  })

  it('ignore les séances sans e1RM et les séances toutes du même jour', () => {
    expect(penteReelle([...SEANCES_REGULIERES.slice(0, 2), point('2026-11-18', null)], AUJOURDHUI)).toBeNull()
    expect(
      penteReelle([point('2026-11-24', 40), point('2026-11-24', 41), point('2026-11-24', 42)], AUJOURDHUI),
    ).toBeNull()
  })

  it('ne dépend pas de l’ordre dans lequel arrivent les points', () => {
    expect(penteReelle([...SEANCES_REGULIERES].reverse(), AUJOURDHUI)).toBeCloseTo(0.5, 5)
  })
})

describe('calculerRythme', () => {
  it('compare la pente nécessaire à la pente tenue, et projette à l’échéance', () => {
    const r = calculerRythme(objectif({ jours_restants: 112 }), SEANCES_REGULIERES, AUJOURDHUI)
    expect(r.semainesRestantes).toBeCloseTo(16)
    // (50 − 41,5) / 16 semaines
    expect(r.necessaire).toBeCloseTo(0.53125, 5)
    expect(r.reel).toBeCloseTo(0.5, 5)
    // 41,5 + 0,5 × 16 = 49,5 : on arrive 0,5 kg sous la cible.
    expect(r.projection).toBeCloseTo(49.5, 4)
    expect(r.ecart).toBeCloseTo(-0.5, 4)
  })

  it('laisse la pente et la projection vides quand les données manquent', () => {
    const r = calculerRythme(objectif(), [], AUJOURDHUI)
    expect(r.reel).toBeNull()
    expect(r.projection).toBeNull()
    expect(r.ecart).toBeNull()
    expect(r.necessaire).toBeCloseTo(0.53125, 5)
  })

  it('ne devine rien sans e1RM ni échéance devant soi', () => {
    expect(
      calculerRythme(objectif({ progression: null }), SEANCES_REGULIERES, AUJOURDHUI).necessaire,
    ).toBeNull()
    expect(
      calculerRythme(objectif({ jours_restants: 0 }), SEANCES_REGULIERES, AUJOURDHUI).necessaire,
    ).toBeNull()
  })
})

describe('statut', () => {
  const rythme = (ecart: number | null) => ({
    semainesRestantes: 16,
    necessaire: 0.5,
    reel: 0.4,
    projection: null,
    ecart,
  })

  it('range les objectifs finis par leur statut', () => {
    expect(statut(objectif({ statut: 'atteint' }), null)).toBe('verrouille')
    expect(statut(objectif({ statut: 'abandonne' }), null)).toBe('detendu')
  })

  it('est en tension quand la projection rejoint la cible, en retard sinon', () => {
    expect(statut(objectif(), rythme(0.4))).toBe('tension')
    expect(statut(objectif(), rythme(0))).toBe('tension')
    expect(statut(objectif(), rythme(-3.1))).toBe('retard')
  })

  it('n’en donne pas quand on ne sait pas, ni quand la cible est déjà atteinte', () => {
    expect(statut(objectif(), null)).toBeNull()
    expect(statut(objectif(), rythme(null))).toBeNull()
    expect(
      statut(
        objectif({
          progression: { e1rm_lest_kg: 50, le: '2026-11-21', pourcentage: 100, cible_atteinte: true },
        }),
        rythme(5),
      ),
    ).toBeNull()
  })

  it('est en retard dès que l’échéance est passée', () => {
    expect(statut(objectif({ jours_restants: -3 }), null)).toBe('retard')
  })
})

describe('phrases', () => {
  const r = calculerRythme(objectif(), SEANCES_REGULIERES, AUJOURDHUI)

  it('dit la décision du jour, calculée', () => {
    expect(phrasePente(objectif(), r)).toBe('il faut +0,53 kg/sem, tu fais +0,5 kg/sem')
  })

  it('dit pourquoi la pente est inconnue', () => {
    expect(phrasePente(objectif(), calculerRythme(objectif(), [], AUJOURDHUI))).toBe(
      'pente : données insuffisantes',
    )
    expect(phrasePente(objectif(), null, true)).toBe('pente : calcul en cours')
    expect(phrasePente(objectif({ statut: 'atteint' }), r)).toBe('')
    expect(phrasePente(objectif({ jours_restants: -2 }), r)).toBe('L’échéance est passée.')
    expect(phrasePente(objectif({ jours_restants: 0 }), r)).toBe('L’échéance, c’est aujourd’hui.')
    expect(
      phrasePente(
        objectif({
          progression: { e1rm_lest_kg: 50, le: '2026-11-21', pourcentage: 100, cible_atteinte: true },
        }),
        r,
      ),
    ).toMatch(/Cible atteinte/)
  })

  it('écrit l’écart projeté avec la date de l’échéance', () => {
    expect(phraseEcart(objectif(), r)).toMatch(/^−0,5 kg au 15 mars au rythme actuel$/)
    expect(phraseEcart(objectif(), null)).toBe('')
  })

  it('met tout ce que dit la forme dans le texte lu par les lecteurs d’écran', () => {
    const texte = texteDrisse(objectif(), r)
    expect(texte).toContain('83 %')
    expect(texte).toContain('+41,5 / 50 kg')
    expect(texte).toContain('J−112')
    expect(texte).toContain('En retard')
    expect(texte).toContain('il faut +0,53 kg/sem')
    expect(texteDrisse(objectif({ progression: null }), null)).toContain('pas encore estimé')
  })

  it('donne la bulle de la pince', () => {
    expect(phraseBulle(objectif(), r)).toBe('e1RM +41,5 kg · dernière séance 21 nov. · pente +0,5 kg/sem')
    expect(phraseBulle(objectif({ progression: null }), null)).toBe('e1RM pas encore estimé')
  })
})

describe('la drisse', () => {
  it('place la pince à la hauteur de l’avancement : 0 en haut, 100 à la base', () => {
    expect(hautDePince(objectif())).toBeCloseTo(17)
    expect(hautDePince(objectif({ statut: 'atteint' }))).toBe(0)
    expect(hautDePince(objectif({ statut: 'abandonne' }))).toBe(100)
    expect(hautDePince(objectif({ progression: null }))).toBe(100)
  })

  it('place le repère de projection, sous la tête s’il manque, au-dessus s’il dépasse', () => {
    const r = calculerRythme(objectif(), SEANCES_REGULIERES, AUJOURDHUI)
    expect(hautDeProjection(objectif(), r)).toBeCloseTo(1, 4)
    const avance = { ...r, projection: 52 }
    expect(hautDeProjection(objectif(), avance)).toBeCloseTo(-4)
    expect(hautDeProjection(objectif(), { ...r, projection: 80 })).toBe(-10)
    expect(hautDeProjection(objectif(), null)).toBeNull()
    expect(hautDeProjection(objectif({ statut: 'atteint' }), r)).toBeNull()
  })

  it('trace une droite au repos et rien tant que la pince est à la base', () => {
    expect(trajetHisse(100, 0)).toBe('')
    expect(trajetHisse(40, 0)).toBe('M24 100 L24 40')
  })

  it('garde la base et la pince fixes pendant le pincement', () => {
    const trace = trajetHisse(40, 2)
    const points = trace
      .slice(1)
      .split(' L')
      .map((p) => p.split(' ').map(Number) as [number, number])
    expect(points).toHaveLength(25)
    expect(points[0]).toEqual([24, 100])
    expect(points.at(-1)![0]).toBeCloseTo(24, 5)
    expect(points.at(-1)![1]).toBeCloseTo(40, 5)
    // Le ventre de l'onde est au milieu, de 2 px au plus.
    expect(Math.max(...points.map(([x]) => Math.abs(x - 24)))).toBeCloseTo(2, 1)
  })

  it('déplace les points selon une onde stationnaire, extrémités fixes', () => {
    expect(deplacement(2, 0)).toBeCloseTo(0, 10)
    expect(deplacement(2, 1)).toBeCloseTo(0, 10)
    expect(deplacement(2, 0.5)).toBeCloseTo(2, 10)
  })

  it('amortit le pincement en moins de 400 ms, sans jamais dépasser 2 px', () => {
    for (const enRetard of [false, true]) {
      expect(amplitudePincement(DUREE_PINCEMENT, enRetard)).toBe(0)
      expect(amplitudePincement(-1, enRetard)).toBe(0)
      for (let t = 0; t < DUREE_PINCEMENT; t += 0.01)
        expect(Math.abs(amplitudePincement(t, enRetard))).toBeLessThanOrEqual(2)
    }
  })

  it('distingue le tintement sec de la drisse en tension du son mat de la drisse en retard', () => {
    const traverse = (enRetard: boolean) => {
      let changements = 0
      let precedent = Math.sign(amplitudePincement(0.001, enRetard))
      for (let t = 0.002; t < DUREE_PINCEMENT; t += 0.002) {
        const s = Math.sign(amplitudePincement(t, enRetard))
        if (s !== 0 && s !== precedent) changements++
        if (s !== 0) precedent = s
      }
      return changements
    }
    // En retard : une demi-oscillation amortie, jamais de retour de l'autre côté.
    expect(traverse(true)).toBe(0)
    // En tension : plusieurs oscillations.
    expect(traverse(false)).toBeGreaterThanOrEqual(3)
  })
})

describe('la sculpture', () => {
  it('a une torsion de 90° au début, nulle à 100 %', () => {
    expect(torsion(0)).toBeCloseTo(Math.PI / 2)
    expect(torsion(0.5)).toBeCloseTo(Math.PI / 4)
    expect(torsion(1)).toBe(0)
    expect(torsion(2)).toBe(0)
    expect(torsion(-1)).toBeCloseTo(Math.PI / 2)
  })

  it('tend 96 fils entre la barre du sol et celle du plafond', () => {
    const fils = extremites(NOMBRE_DE_FILS, torsion(0.64))
    expect(fils).toHaveLength(96)
    expect(fils[0]!.bas.z).toBe(0)
    expect(fils[0]!.haut.z).toBe(1)
    // Le fil du milieu relie les centres des deux barres, le premier et le dernier leurs bouts.
    expect(fils[0]!.bas.x).toBeCloseTo(-0.5)
    expect(fils[95]!.bas.x).toBeCloseTo(0.5)
  })

  it('forme un paraboloïde hyperbolique : les fils, droits, ne se croisent qu’en dehors de la barre', () => {
    // Deux fils voisins sont plus proches en bas qu'en haut quand la barre du plafond a tourné : la surface est réglée mais gauche.
    const fils = extremites(3, Math.PI / 4)
    const ecart = (t: number) => {
      const a = surFil(fils[0]!, t)
      const b = surFil(fils[2]!, t)
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    expect(ecart(0)).toBeCloseTo(1)
    expect(ecart(1)).toBeCloseTo(1)
    // Au milieu les fils extrêmes se rapprochent : c'est le col de la selle.
    expect(ecart(0.5)).toBeLessThan(ecart(0))
  })

  it('se range en une seule ligne vue par la tranche quand la torsion est nulle', () => {
    const fils = extremites(NOMBRE_DE_FILS, torsion(1))
    const vue = { lacet: lacetVerrouille(1), tangage: 0.16 }
    const abscisses = fils.flatMap((f) => [f.bas, f.haut].map((p) => projeter(p, vue).x))
    for (const x of abscisses) expect(Math.abs(x)).toBeLessThan(1e-9)
  })

  it('s’étale en ruban de biais au repos', () => {
    const fils = extremites(NOMBRE_DE_FILS, torsion(1))
    const vue = { lacet: lacetVerrouille(0), tangage: 0.16 }
    expect(lacetVerrouille(0)).toBe(LACET_DE_REPOS)
    const abscisses = fils.map((f) => projeter(f.bas, vue).x)
    expect(Math.max(...abscisses) - Math.min(...abscisses)).toBeGreaterThan(0.5)
  })

  it('éclaire les fils sous la pince de plus en plus, et laisse le reste dans l’ombre', () => {
    expect(eclairage(0.2, 0.5, 0)).toBeCloseTo(0.25)
    expect(eclairage(0.2, 0.5, 1)).toBeCloseTo(1)
    expect(eclairage(0.2, 0.5, 0.5)).toBeGreaterThan(eclairage(0.2, 0.5, 0.2))
    expect(eclairage(0.8, 0.5, 1)).toBeCloseTo(0.22)
  })

  it('ouvre les fils d’une ligne vers leur largeur pleine', () => {
    expect(largeurOuverte(0)).toBeCloseTo(0.12)
    expect(largeurOuverte(1)).toBe(1)
    expect(largeurOuverte(5)).toBe(1)
  })

  it('cale la sculpture dans son cadre sans qu’elle saute d’une pose à l’autre', () => {
    const { min, max } = bornesVerticales()
    expect(max).toBeGreaterThan(min)
    for (const angle of [0, Math.PI / 4, Math.PI / 2]) {
      for (const f of extremites(NOMBRE_DE_FILS, angle)) {
        for (const p of [f.bas, f.haut]) {
          const y = projeter(p, { lacet: LACET_DE_REPOS, tangage: 0.16 }).y
          expect(y).toBeGreaterThanOrEqual(min - 1e-9)
          expect(y).toBeLessThanOrEqual(max + 1e-9)
        }
      }
    }
  })
})

describe('geometrieCourbe', () => {
  const rythme = () => calculerRythme(objectif(), SEANCES_REGULIERES, AUJOURDHUI)

  it('n’existe pas sans e1RM', () => {
    expect(geometrieCourbe(objectif(), [], null, AUJOURDHUI, 320, 120)).toBeNull()
    expect(geometrieCourbe(objectif(), [point('2026-11-04', null)], null, AUJOURDHUI, 320, 120)).toBeNull()
  })

  it('pose la cible au bord droit, au jour de l’échéance, au-dessus de la base', () => {
    const g = geometrieCourbe(objectif(), SEANCES_REGULIERES, rythme(), AUJOURDHUI, 320, 120)!
    expect(g.historique).toHaveLength(4)
    expect(g.cible[0]).toBeCloseTo(320 - 6)
    expect(g.cible[1]).toBeLessThan(g.base)
    expect(g.actuel).toEqual(g.historique.at(-1))
    // Le temps coule vers la droite, le lest monte vers le haut.
    expect(g.historique[3]![0]).toBeGreaterThan(g.historique[0]![0])
    expect(g.historique[3]![1]).toBeLessThan(g.historique[0]![1])
    expect(g.necessaire).toEqual([g.actuel, g.cible])
    expect(g.tendance?.[1][0]).toBeCloseTo(g.cible[0])
  })

  it('ne trace ni trajectoire ni tendance pour un objectif fini', () => {
    const g = geometrieCourbe(
      objectif({ statut: 'atteint' }),
      SEANCES_REGULIERES,
      null,
      AUJOURDHUI,
      320,
      120,
    )!
    expect(g.necessaire).toBeNull()
    expect(g.tendance).toBeNull()
  })

  it('ne trace que la trajectoire quand la pente est inconnue', () => {
    const g = geometrieCourbe(
      objectif(),
      SEANCES_REGULIERES,
      calculerRythme(objectif(), [], AUJOURDHUI),
      AUJOURDHUI,
      320,
      120,
    )!
    expect(g.necessaire).not.toBeNull()
    expect(g.tendance).toBeNull()
  })
})
