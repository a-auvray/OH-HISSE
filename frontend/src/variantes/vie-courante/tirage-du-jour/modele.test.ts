import { describe, expect, it } from 'vitest'

import type { EtatDuJour } from '../../../api/types'
import {
  barreNuit,
  celluleDeTrame,
  choisirUne,
  colonneRecuperation,
  dureeEnClair,
  impressionDuVerdict,
  jourDeLAnnee,
  legendeDeLaPile,
  rayonDeTrame,
  reglette,
} from './modele'

function etat(surcharge: Partial<EtatDuJour> = {}): EtatDuJour {
  return {
    instant: '2026-11-19T11:00:00+01:00',
    recuperation: {
      recupere: false,
      restant_h: 8 + 40 / 60,
      total_h: 48,
      progression: 0.82,
      fin: '2026-11-19T18:00:00+01:00',
      raisons: ['Séance lourde mardi'],
      recup_active_conseillee: false,
    },
    cheat_meal: {
      verdict: 'petit',
      points: 2,
      phrase: 'Un petit écart.',
      details: ['Séance : +1', 'Nage : +1'],
    },
    sommeil: { derniere_nuit_h: 7.2, moyenne_h: 6.9, nuits_comptees: 7 },
    poids: { kg: 74.2, a_jour: true, derniere_pesee: '2026-11-16' },
    ...surcharge,
  }
}

describe('dureeEnClair', () => {
  it('écrit les heures et les minutes', () => {
    expect(dureeEnClair(8 + 40 / 60)).toBe('8 h 40')
    expect(dureeEnClair(7.2)).toBe('7 h 12')
    expect(dureeEnClair(2)).toBe('2 h 00')
  })

  it('passe en minutes sous une heure et ne descend pas sous zéro', () => {
    expect(dureeEnClair(0.5)).toBe('30 min')
    expect(dureeEnClair(-3)).toBe('0 min')
  })

  it('arrondit à la minute sans écrire 60 minutes', () => {
    expect(dureeEnClair(1.9999)).toBe('2 h 00')
  })
})

describe('colonneRecuperation', () => {
  it('lit le pourcentage et respire lentement quand le corps est reposé', () => {
    const c = colonneRecuperation(etat().recuperation)
    expect(c.pourcentage).toBe(82)
    expect(c.dette).toBe(0)
    expect(c.periodeS).toBe(12)
  })

  it('place le seuil d’allègement là où il resterait 24 h, d’après le budget déduit', () => {
    // Budget de 48 h : le seuil des 24 h restantes est à mi-parcours.
    const c = colonneRecuperation(etat().recuperation)
    expect(c.seuil).toBeCloseTo(0.5, 1)
  })

  it('respire deux fois plus vite en pleine dette', () => {
    const c = colonneRecuperation({ ...etat().recuperation, progression: 0.3, restant_h: 33, total_h: 47 })
    expect(c.dette).toBe(1)
    expect(c.periodeS).toBe(6)
  })

  it('interpole la période entre les deux', () => {
    const c = colonneRecuperation({ ...etat().recuperation, progression: 0.5, restant_h: 12 })
    expect(c.dette).toBeCloseTo(0.5)
    expect(c.periodeS).toBeCloseTo(9)
  })

  it('sans seuil quand le budget est court ou que le corps est récupéré', () => {
    expect(
      colonneRecuperation({ ...etat().recuperation, progression: 0.5, restant_h: 6, total_h: 12 }).seuil,
    ).toBeNull()
    expect(
      colonneRecuperation({
        ...etat().recuperation,
        recupere: true,
        progression: 1,
        restant_h: 0,
        total_h: 48,
      }).seuil,
    ).toBeNull()
  })

  it('borne une progression hors de l’intervalle', () => {
    expect(colonneRecuperation({ ...etat().recuperation, progression: 1.4 }).pourcentage).toBe(100)
  })
})

describe('choisirUne', () => {
  it('donne le verdict avec l’impression qu’il mérite', () => {
    const oui = choisirUne(
      etat({ cheat_meal: { verdict: 'oui', points: 3, phrase: '', details: [] } }),
      false,
    )
    expect(oui).toMatchObject({ titre: 'Ce soir, t’as le droit.', impression: 'aplat', allegee: false })
    expect(oui.surTitre).toBe('ÉCART · 3 PTS · SEUIL 3')

    const petit = choisirUne(etat(), false)
    expect(petit).toMatchObject({ titre: 'Un petit écart, oui.', impression: 'trame' })
    expect(petit.surTitre).toBe('ÉCART · 2 PTS · SEUIL 3')

    const non = choisirUne(
      etat({ cheat_meal: { verdict: 'non', points: 1, phrase: '', details: [] } }),
      false,
    )
    expect(non).toMatchObject({ titre: 'Pas cette fois.', impression: 'vide' })
    expect(non.surTitre).toBe('ÉCART · 1 PT · SEUIL 3')
  })

  it('met la récupération devant quand il reste plus de 24 h, sans rose', () => {
    const une = choisirUne(
      etat({
        recuperation: { ...etat().recuperation, progression: 0.3, restant_h: 31 },
        cheat_meal: { verdict: 'oui', points: 3, phrase: '', details: [] },
      }),
      false,
    )
    expect(une).toMatchObject({ titre: 'Séance allégée aujourd’hui.', impression: 'vide', allegee: true })
    expect(une.surTitre).toBe('RÉCUPÉRATION · ENCORE 31 H')
  })

  it('ne parle pas d’allègement quand on est récupéré', () => {
    const une = choisirUne(
      etat({ recuperation: { ...etat().recuperation, recupere: true, restant_h: 40, progression: 1 } }),
      false,
    )
    expect(une.allegee).toBe(false)
  })

  it('annonce l’écart pris et sèche le rose en trame', () => {
    const une = choisirUne(etat({ cheat_meal: { verdict: 'oui', points: 3, phrase: '', details: [] } }), true)
    expect(une).toMatchObject({ titre: 'Écart pris.', impression: 'trame', allegee: false })
  })
})

describe('impressionDuVerdict', () => {
  it('suit les trois verdicts', () => {
    expect(impressionDuVerdict('oui')).toBe('aplat')
    expect(impressionDuVerdict('petit')).toBe('trame')
    expect(impressionDuVerdict('non')).toBe('vide')
  })
})

describe('reglette', () => {
  const remplies = (points: number) => reglette(points).map((c) => c.remplie)

  it('ne remplit aucune case sous deux points', () => {
    expect(remplies(0)).toEqual([false, false, false, false, false])
    expect(remplies(1)).toEqual([false, false, false, false, false])
  })

  it('remplit les cases atteintes à partir de deux points', () => {
    expect(remplies(2)).toEqual([false, true, true, false, false])
    expect(remplies(3)).toEqual([false, true, true, true, false])
    expect(remplies(4)).toEqual([false, true, true, true, true])
    expect(remplies(7)).toEqual([false, true, true, true, true])
  })

  it('repère la case courante et les deux seuils', () => {
    const cases = reglette(3)
    expect(cases.findIndex((c) => c.courante)).toBe(3)
    expect(cases[2]?.repere).toBe('petit écart')
    expect(cases[3]?.repere).toBe('feu vert')
    expect(cases[0]?.repere).toBeNull()
    expect(reglette(-2).findIndex((c) => c.courante)).toBe(0)
  })
})

describe('barreNuit', () => {
  it('place la nuit et la moyenne sur 10 h', () => {
    const barre = barreNuit(7.2, 6.9)
    expect(barre?.longueur).toBeCloseTo(0.72)
    expect(barre?.moyenne).toBeCloseTo(0.69)
    expect(barre?.courte).toBe(false)
  })

  it('dit courte une nuit sous 6 h', () => {
    expect(barreNuit(5.5, null)).toEqual({ longueur: 0.55, moyenne: null, courte: true })
    expect(barreNuit(6, null)?.courte).toBe(false)
  })

  it('n’invente rien sans nuit notée', () => {
    expect(barreNuit(null, 7)).toBeNull()
    expect(barreNuit(undefined, undefined)).toBeNull()
  })

  it('borne une nuit hors échelle', () => {
    expect(barreNuit(14, null)?.longueur).toBe(1)
  })
})

describe('trame', () => {
  it('couvre la part demandée de la cellule, sans que deux points se chevauchent', () => {
    const c = 6
    const surface = Math.PI * rayonDeTrame(c, 0.35) ** 2
    expect(surface / c ** 2).toBeCloseTo(0.35, 5)
    expect(rayonDeTrame(c, 5)).toBeLessThanOrEqual(c / 2)
    expect(rayonDeTrame(c, -1)).toBe(0)
  })

  it('arrondit la cellule aux pixels physiques', () => {
    expect(celluleDeTrame(1)).toBe(6)
    expect(celluleDeTrame(1.25)).toBeCloseTo(8 / 1.25)
    expect(celluleDeTrame(1.5)).toBe(6)
    expect(celluleDeTrame(0)).toBe(6)
    expect(celluleDeTrame(Number.NaN)).toBe(6)
    // La cellule occupe toujours un nombre entier de pixels physiques.
    for (const dpr of [1, 1.25, 1.5, 2, 2.25]) {
      const pixels = celluleDeTrame(dpr) * dpr
      expect(pixels).toBeCloseTo(Math.round(pixels), 9)
    }
  })
})

describe('jourDeLAnnee', () => {
  it('compte les jours à l’heure de Paris', () => {
    expect(jourDeLAnnee(new Date('2026-01-01T12:00:00+01:00'))).toBe(1)
    expect(jourDeLAnnee(new Date('2026-11-19T12:00:00+01:00'))).toBe(323)
    expect(jourDeLAnnee(new Date('2026-12-31T12:00:00+01:00'))).toBe(365)
  })

  it('suit le jour de Paris et non celui du temps universel', () => {
    // 23 h 30 à Paris le 1er janvier, c'est encore le 1er ; 0 h 30 le lendemain à Paris est le 2.
    expect(jourDeLAnnee(new Date('2026-01-01T23:30:00+01:00'))).toBe(1)
    expect(jourDeLAnnee(new Date('2026-01-02T00:30:00+01:00'))).toBe(2)
  })
})

describe('legendeDeLaPile', () => {
  it('dit ce que raconte la ligne du jour', () => {
    expect(legendeDeLaPile(323, 'aplat', false)).toBe('Jour 323 de l’année · écart mérité')
    expect(legendeDeLaPile(323, 'trame', false)).toBe('Jour 323 de l’année · petit écart')
    expect(legendeDeLaPile(323, 'vide', false)).toBe('Jour 323 de l’année')
    expect(legendeDeLaPile(323, 'vide', true)).toBe('Jour 323 de l’année · écart pris')
  })
})
