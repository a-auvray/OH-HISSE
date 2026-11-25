import { describe, expect, it } from 'vitest'

import type { Nuit } from '../../../api/types'
import {
  allumage,
  analyserCouleur,
  avancementColonne,
  avancementFantome,
  BANDE_BASSE,
  choisirEncres,
  contraste,
  dureeDeOrdonnee,
  dureeEnMots,
  type Empreinte,
  ecartEnMinutes,
  empreintesAffichees,
  empreintesDeLaSemaine,
  flouDuBord,
  formaterDuree,
  geometrieChamp,
  heuresEnSaisie,
  legende,
  lireHeures,
  moyenneDesEmpreintes,
  niveauBraise,
  nomAccessible,
  OPACITE_MINIMALE,
  opaciteDeLAge,
  ordonneeDeDuree,
  palierSouffle,
  phraseEcart,
  pointsDeBalance,
  pousserDuree,
  rectangleDeNuit,
  ressentiDeQualite,
  souffle,
  tracerBalance,
  variationDePesee,
} from './modele'

const nuit = (date: string, heures: number, qualite: number | null = null): Nuit => ({
  id: 1,
  date,
  heures,
  qualite,
})

describe('durées en mots et en chiffres', () => {
  it('arrondit la phrase au quart d’heure', () => {
    expect(dureeEnMots(7)).toBe('Sept heures.')
    expect(dureeEnMots(7.1)).toBe('Sept heures.')
    expect(dureeEnMots(7.2)).toBe('Sept heures et quart.')
    expect(dureeEnMots(7.25)).toBe('Sept heures et quart.')
    expect(dureeEnMots(6.5)).toBe('Six heures et demie.')
    expect(dureeEnMots(6.75)).toBe('Six heures trois quarts.')
    expect(dureeEnMots(7.9)).toBe('Huit heures.')
  })

  it('accorde les petites durées', () => {
    expect(dureeEnMots(1)).toBe('Une heure.')
    expect(dureeEnMots(1.5)).toBe('Une heure et demie.')
    expect(dureeEnMots(0.25)).toBe('Un quart d’heure.')
    expect(dureeEnMots(0.5)).toBe('Une demi-heure.')
    expect(dureeEnMots(0.75)).toBe('Trois quarts d’heure.')
    expect(dureeEnMots(0)).toBe('Nuit blanche.')
  })

  it('met un accent de nombre sur les longues nuits', () => {
    expect(dureeEnMots(12)).toBe('Douze heures.')
    expect(dureeEnMots(21)).toBe('Vingt et une heures.')
  })

  it('écrit la durée exacte à la minute', () => {
    expect(formaterDuree(7.2)).toBe('7 h 12')
    expect(formaterDuree(8)).toBe('8 h')
    expect(formaterDuree(6.9)).toBe('6 h 54')
    expect(formaterDuree(0.1)).toBe('0 h 06')
  })

  it('compare la nuit à la moyenne en minutes', () => {
    expect(ecartEnMinutes(7.2, 6.9)).toBe(18)
    expect(phraseEcart(7.2, 6.9)).toBe('+18 min vs moy. 7 j (6 h 54)')
    expect(phraseEcart(6.5, 6.9)).toBe('−24 min vs moy. 7 j (6 h 54)')
    expect(phraseEcart(6.9, 6.9)).toBe('= moy. 7 j (6 h 54)')
  })
})

describe('saisie de la durée', () => {
  it('lit une durée plausible, avec une virgule ou un point', () => {
    expect(lireHeures('7,5')).toBe(7.5)
    expect(lireHeures(' 6.25 ')).toBe(6.25)
    expect(lireHeures('')).toBeNull()
    expect(lireHeures('abc')).toBeNull()
    expect(lireHeures('0')).toBeNull()
    expect(lireHeures('30')).toBeNull()
  })

  it('écrit la durée glissée avec une virgule et deux décimales au plus', () => {
    expect(heuresEnSaisie(7.0833333)).toBe('7,08')
    expect(heuresEnSaisie(7.5)).toBe('7,5')
    expect(heuresEnSaisie(8)).toBe('8')
  })

  it('pousse par pas de 5 minutes, 30 avec Maj, sans sortir des bornes', () => {
    expect(pousserDuree(7, 1, false)).toBeCloseTo(7 + 5 / 60, 6)
    expect(pousserDuree(7, -1, false)).toBeCloseTo(7 - 5 / 60, 6)
    expect(pousserDuree(7, 1, true)).toBeCloseTo(7.5, 6)
    expect(pousserDuree(12, 1, true)).toBe(12)
    expect(pousserDuree(5 / 60, -1, false)).toBeCloseTo(5 / 60, 6)
  })
})

describe('ressenti', () => {
  it('ramène la qualité de 1 à 5 aux trois niveaux de la pastille', () => {
    expect(ressentiDeQualite(1)).toBe('difficile')
    expect(ressentiDeQualite(2)).toBe('difficile')
    expect(ressentiDeQualite(3)).toBe('moyen')
    expect(ressentiDeQualite(4)).toBe('bon')
    expect(ressentiDeQualite(5)).toBe('bon')
    expect(ressentiDeQualite(null)).toBeNull()
    expect(ressentiDeQualite(undefined)).toBeNull()
  })

  it('durcit le bord quand le ressenti est mauvais et l’adoucit quand il est bon', () => {
    expect(flouDuBord('difficile')).toBe(0)
    expect(flouDuBord('moyen')).toBeGreaterThan(0)
    expect(flouDuBord('bon')).toBeGreaterThan(flouDuBord('moyen'))
    expect(flouDuBord(null)).toBe(flouDuBord('moyen'))
  })
})

describe('les sept empreintes', () => {
  const nuits = [nuit('2026-11-24', 7.2, 4), nuit('2026-11-22', 5.5, 2), nuit('2026-11-20', 8)]
  const semaine = empreintesDeLaSemaine(nuits, '2026-11-24')

  it('couvre sept jours finissant aujourd’hui, du plus ancien au plus récent', () => {
    expect(semaine.map((e) => e.date)).toEqual([
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
      '2026-11-24',
    ])
    expect(semaine.map((e) => e.age)).toEqual([6, 5, 4, 3, 2, 1, 0])
  })

  it('laisse vides les nuits non notées et garde le ressenti des autres', () => {
    expect(semaine[3]?.heures).toBeNull()
    expect(semaine[2]).toMatchObject({ heures: 8, ressenti: null })
    expect(semaine[4]).toMatchObject({ heures: 5.5, ressenti: 'difficile' })
    expect(semaine[6]).toMatchObject({ heures: 7.2, ressenti: 'bon' })
  })

  it('traverse un changement de mois', () => {
    const fin = empreintesDeLaSemaine([], '2026-12-02')
    expect(fin[0]?.date).toBe('2026-11-26')
    expect(fin[6]?.date).toBe('2026-12-02')
  })

  it('moyenne les nuits notées seulement', () => {
    expect(moyenneDesEmpreintes(semaine)).toBeCloseTo((7.2 + 5.5 + 8) / 3, 6)
    expect(moyenneDesEmpreintes(empreintesDeLaSemaine([], '2026-11-24'))).toBeNull()
  })

  it('nomme chaque empreinte pour un lecteur d’écran', () => {
    const jeudi = empreintesDeLaSemaine([nuit('2026-11-19', 6.8, 5)], '2026-11-24')[1]
    if (!jeudi) throw new Error('empreinte attendue')
    expect(nomAccessible(jeudi)).toBe('jeudi 19 novembre : 6 h 48, ressenti bon')
    expect(legende(jeudi)).toBe('jeu. 19 · 6 h 48 · ressenti bon')
    const vide = semaine[3]
    if (!vide) throw new Error('empreinte attendue')
    expect(nomAccessible(vide)).toBe('samedi 21 novembre : nuit non notée')
    expect(legende(vide)).toBe('sam. 21 · nuit non notée')
    const sansRessenti = semaine[2]
    if (!sansRessenti) throw new Error('empreinte attendue')
    expect(nomAccessible(sansRessenti)).toBe('vendredi 20 novembre : 8 h, ressenti non noté')
  })

  it('dit que la nuit du jour pas encore imprimée n’est qu’une proposition', () => {
    const proposee = { ...(semaine[0] as Empreinte), date: '2026-11-24', heures: 7, provisoire: true }
    expect(nomAccessible(proposee)).toBe('mardi 24 novembre : nuit à imprimer, 7 h proposées')
    expect(legende(proposee)).toBe('mar. 24 · 7 h proposées · nuit à imprimer')
    expect(nomAccessible({ ...proposee, heures: null })).toBe('mardi 24 novembre : nuit à imprimer')
    expect(legende({ ...proposee, heures: null })).toBe('mar. 24 · nuit à imprimer')
  })

  it('fait pâlir les nuits avec l’âge sans jamais les effacer', () => {
    expect(opaciteDeLAge(0)).toBe(1)
    expect(opaciteDeLAge(1)).toBeCloseTo(0.85, 6)
    expect(opaciteDeLAge(2)).toBeLessThan(opaciteDeLAge(1))
    expect(opaciteDeLAge(6)).toBeGreaterThanOrEqual(OPACITE_MINIMALE)
    expect(opaciteDeLAge(30)).toBe(OPACITE_MINIMALE)
  })
})

describe('la nuit du jour suit la saisie', () => {
  const base = empreintesDeLaSemaine([nuit('2026-11-23', 6), nuit('2026-11-24', 7, 3)], '2026-11-24')

  it('reste un contour en tirets tant que la nuit n’est pas notée, posé à la hauteur par défaut', () => {
    const sansNuit = empreintesDeLaSemaine([nuit('2026-11-23', 6)], '2026-11-24')
    const jour = empreintesAffichees(sansNuit, { heures: null, qualite: null, parDefaut: 6.9 }).at(-1)
    expect(jour).toMatchObject({ heures: 6.9, provisoire: true })
  })

  it('montre la nuit notée telle quelle, sans tirets', () => {
    const jour = empreintesAffichees(base, { heures: null, qualite: 3, parDefaut: 7 }).at(-1)
    expect(jour).toMatchObject({ heures: 7, provisoire: false, ressenti: 'moyen' })
  })

  it('repasse en tirets quand la durée glissée diffère de la nuit notée', () => {
    const jour = empreintesAffichees(base, { heures: 7.5, qualite: 3, parDefaut: 7 }).at(-1)
    expect(jour).toMatchObject({ heures: 7.5, provisoire: true })
  })

  it('durcit le bord en direct quand on choisit un ressenti', () => {
    const jour = empreintesAffichees(base, { heures: null, qualite: 1, parDefaut: 7 }).at(-1)
    expect(jour?.ressenti).toBe('difficile')
  })

  it('ne touche pas aux six autres nuits', () => {
    const autres = empreintesAffichees(base, { heures: 9, qualite: 5, parDefaut: 7 }).slice(0, 6)
    expect(autres.every((e) => !e.provisoire)).toBe(true)
    expect(autres[5]?.heures).toBe(6)
  })
})

describe('géométrie du champ', () => {
  const g = geometrieChamp(700, 400)

  it('pose la ligne de sol au-dessus de la bande des dates', () => {
    expect(g.sol).toBe(400 - BANDE_BASSE)
  })

  it('pose chaque rectangle sur le sol, dans son créneau', () => {
    for (let rang = 0; rang < 7; rang++) {
      const r = rectangleDeNuit(g, rang, 7.2)
      expect(r.y + r.hauteur).toBeCloseTo(g.sol, 6)
      expect(r.hauteur).toBeCloseTo(7.2 * g.pxParHeure, 6)
      expect(r.x).toBeGreaterThanOrEqual(g.marge + g.creneau * rang)
      expect(r.x + r.largeur).toBeLessThanOrEqual(g.marge + g.creneau * (rang + 1))
    }
  })

  it('range les créneaux sans chevauchement et dans la largeur', () => {
    const derniere = rectangleDeNuit(g, 6, 5)
    expect(derniere.x + derniere.largeur).toBeLessThanOrEqual(700 - g.marge)
    const un = rectangleDeNuit(g, 0, 5)
    const deux = rectangleDeNuit(g, 1, 5)
    expect(deux.x).toBeGreaterThan(un.x + un.largeur)
  })

  it('écrête une nuit plus longue que la règle et reste lisible sur un petit écran', () => {
    const r = rectangleDeNuit(g, 0, 14)
    expect(r.y).toBeGreaterThanOrEqual(0)
    const petit = geometrieChamp(300, 320)
    expect(petit.creneau).toBeGreaterThan(0)
    expect(petit.largeurEmpreinte).toBeLessThanOrEqual(petit.creneau)
    expect(petit.pxParHeure).toBeGreaterThan(0)
  })

  it('place les repères sur la même règle que les empreintes, et lit une ordonnée en durée', () => {
    expect(ordonneeDeDuree(g, 8)).toBeLessThan(ordonneeDeDuree(g, 6))
    expect(ordonneeDeDuree(g, 0)).toBe(g.sol)
    expect(dureeDeOrdonnee(g, ordonneeDeDuree(g, 7.5))).toBeCloseTo(7.5, 6)
    expect(dureeDeOrdonnee(g, g.sol + 50)).toBe(0)
  })
})

describe('le souffle de la récupération', () => {
  it('suit les trois paliers du cahier des charges, aux frontières comprises', () => {
    expect(palierSouffle(0)).toMatchObject({ nom: 'frais', periodeS: 12, amplitude: 0.03 })
    expect(palierSouffle(24)).toMatchObject({ nom: 'frais' })
    expect(palierSouffle(24.1)).toMatchObject({ nom: 'entamé', periodeS: 8, amplitude: 0.04 })
    expect(palierSouffle(48)).toMatchObject({ nom: 'entamé' })
    expect(palierSouffle(48.1)).toMatchObject({ nom: 'à plat', periodeS: 6, amplitude: 0.06 })
  })

  it('respire à une fréquence qui reste sous 0,17 Hz et dans son amplitude', () => {
    for (const restant of [3, 30, 60]) {
      const p = palierSouffle(restant)
      expect(1 / p.periodeS).toBeLessThanOrEqual(0.17)
      for (let t = 0; t < p.periodeS; t += 0.25) {
        expect(Math.abs(souffle(p, t))).toBeLessThanOrEqual(p.amplitude + 1e-9)
      }
      expect(souffle(p, 0)).toBeCloseTo(0, 9)
      expect(souffle(p, p.periodeS / 4)).toBeCloseTo(p.amplitude, 9)
    }
  })
})

describe('la braise', () => {
  it('a un palier par verdict', () => {
    expect(niveauBraise('non')).toBe('eteinte')
    expect(niveauBraise('petit')).toBe('rougeoyante')
    expect(niveauBraise('oui')).toBe('vive')
  })
})

describe('l’allumage d’entrée', () => {
  it('allume les empreintes une à une, de la plus ancienne à la plus récente', () => {
    const t = 0.2
    const intensites = [0, 1, 2, 3, 4, 5, 6].map((rang) => allumage(t, rang, 'cinema'))
    for (let i = 1; i < intensites.length; i++) {
      expect(intensites[i] ?? 0).toBeLessThanOrEqual(intensites[i - 1] ?? 0)
    }
    expect(allumage(0, 0, 'cinema')).toBe(0)
    expect(allumage(0, 6, 'cinema')).toBe(0)
  })

  it('rejoue la semaine en moins d’une demi-seconde puis reste allumé', () => {
    expect(allumage(0.7, 6, 'cinema')).toBe(1)
    expect(allumage(10, 6, 'cinema')).toBe(1)
    expect(allumage(0.06 * 6 + 0.28, 6, 'cinema')).toBeCloseTo(1, 9)
  })

  it('allume tout ensemble en sobre, et laisse tout allumé en immobile', () => {
    expect(allumage(0.1, 0, 'sobre')).toBe(allumage(0.1, 6, 'sobre'))
    expect(allumage(0.25, 3, 'sobre')).toBe(1)
    expect(allumage(0, 3, 'immobile')).toBe(1)
    expect(allumage(Number.POSITIVE_INFINITY, 3, 'cinema')).toBe(1)
  })

  it('trace la moyenne fantôme et remplit la colonne après les empreintes', () => {
    expect(avancementFantome(0.3, 'cinema')).toBe(0)
    expect(avancementFantome(1.2, 'cinema')).toBe(1)
    expect(avancementColonne(0.5, 'cinema')).toBe(0)
    expect(avancementColonne(0.8 + 0.35, 'cinema')).toBeGreaterThan(0)
    expect(avancementColonne(0.8 + 0.35, 'cinema')).toBeLessThan(1)
    expect(avancementColonne(3, 'cinema')).toBe(1)
    expect(avancementColonne(0, 'immobile')).toBe(1)
    expect(avancementFantome(0, 'immobile')).toBe(1)
  })
})

describe('la balance', () => {
  const pesees = [
    { date: '2026-11-23', poids_kg: 74.2 },
    { date: '2026-11-16', poids_kg: 74.6 },
    { date: '2026-11-09', poids_kg: 74.8 },
    { date: '2026-10-26', poids_kg: 75.4 },
    { date: '2025-01-01', poids_kg: 90 },
  ]
  const points = pointsDeBalance(pesees, '2026-11-24')

  it('garde les douze dernières semaines, dans l’ordre du temps', () => {
    expect(points.map((p) => p.date)).toEqual(['2026-10-26', '2026-11-09', '2026-11-16', '2026-11-23'])
  })

  it('calcule la moyenne mobile sur les trois semaines qui précèdent chaque pesée', () => {
    expect(points[0]?.moyenne).toBeCloseTo(75.4, 6)
    // 23/11 : les pesées des 9, 16 et 23 novembre sont à moins de 21 jours ; celle du 26/10 non.
    expect(points[3]?.moyenne).toBeCloseTo((74.8 + 74.6 + 74.2) / 3, 6)
  })

  it('donne la variation depuis la pesée précédente, avec un vrai signe moins', () => {
    expect(variationDePesee(points)).toBe('−0,4')
    expect(variationDePesee(points.slice(0, 1))).toBeNull()
    expect(variationDePesee([])).toBeNull()
    expect(
      variationDePesee([
        { date: 'a', kg: 74, moyenne: 74 },
        { date: 'b', kg: 74.6, moyenne: 74 },
      ]),
    ).toBe('+0,6')
    expect(
      variationDePesee([
        { date: 'a', kg: 74, moyenne: 74 },
        { date: 'b', kg: 74, moyenne: 74 },
      ]),
    ).toBe('0')
  })

  it('met la ligne à l’échelle dans son cadre, le temps vers la droite et le poids vers le bas', () => {
    const trace = tracerBalance(points, '2026-11-24', 160, 36)
    expect(trace.points).toHaveLength(4)
    for (const p of [...trace.ligne, ...trace.points]) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(160)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(36)
    }
    const xs = trace.points.map((p) => p.x)
    expect([...xs].sort((a, b) => a - b)).toEqual(xs)
    // La pesée la plus lourde (75,4) est la plus haute du dessin, donc a la plus petite ordonnée.
    expect(trace.points[0]?.y).toBeLessThan(trace.points[3]?.y ?? 0)
  })

  it('reste dessinable sans pesée et avec une seule valeur', () => {
    expect(tracerBalance([], '2026-11-24', 160, 36)).toEqual({ ligne: [], points: [] })
    const seule = tracerBalance([{ date: '2026-11-23', kg: 74, moyenne: 74 }], '2026-11-24', 160, 36)
    expect(seule.points).toHaveLength(1)
    expect(Number.isFinite(seule.points[0]?.y)).toBe(true)
  })
})

describe('les couleurs du mur dans chaque thème et chaque ton', () => {
  it('lit les formes que le navigateur rend', () => {
    expect(analyserCouleur('rgb(23, 24, 28)')).toEqual({ r: 23, g: 24, b: 28, a: 1 })
    expect(analyserCouleur('rgb(23 24 28 / 0.5)')).toEqual({ r: 23, g: 24, b: 28, a: 0.5 })
    expect(analyserCouleur('rgba(23, 24, 28, 0.25)')).toEqual({ r: 23, g: 24, b: 28, a: 0.25 })
    expect(analyserCouleur('#ece7da')).toEqual({ r: 236, g: 231, b: 218, a: 1 })
    expect(analyserCouleur('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    const mixte = analyserCouleur('color(srgb 0.5 0.25 1 / 0.8)')
    expect(mixte?.r).toBeCloseTo(127.5, 6)
    expect(mixte?.b).toBeCloseTo(255, 6)
    expect(mixte?.a).toBeCloseTo(0.8, 6)
    expect(analyserCouleur('')).toBeNull()
    expect(analyserCouleur('var(--x)')).toBeNull()
  })

  /** Les jetons --fond et --texte de chaque thème, dans chaque ton (voir les Coque et styles/tokens.css). */
  const THEMES: readonly [string, string, string][] = [
    ['Classique', '#0b0d10', '#e9ecef'],
    ['Papier jour', '#efe9dd', '#141414'],
    ['Papier soir', '#121110', '#efe9dd'],
    ['Estampe jour', '#ece7da', '#17181c'],
    ['Estampe sombre', '#0e1014', '#e8e4d8'],
    ['Matière jour', '#cfccc4', '#17181b'],
    ['Matière soir', '#131416', '#e9e7e1'],
  ]

  it.each(THEMES)('« %s » : un mur sombre et une lumière claire, lisibles (AA)', (_nom, fond, texte) => {
    const f = analyserCouleur(fond)
    const t = analyserCouleur(texte)
    if (!f || !t) throw new Error('couleur illisible')
    const { mur, lumiere } = choisirEncres(f, t)
    // Le mur est le plus sombre des deux, quel que soit le sens du thème.
    expect(contraste(lumiere, mur)).toBeGreaterThanOrEqual(7)
    // Le texte secondaire (78 % de lumière sur le mur) reste au-dessus de 4,5:1.
    const doux = {
      r: lumiere.r * 0.78 + mur.r * 0.22,
      g: lumiere.g * 0.78 + mur.g * 0.22,
      b: lumiere.b * 0.78 + mur.b * 0.22,
      a: 1,
    }
    expect(contraste(doux, mur)).toBeGreaterThanOrEqual(4.5)
    // Les empreintes les plus pâles (opacité minimale) se distinguent encore du mur.
    const pale = {
      r: lumiere.r * OPACITE_MINIMALE + mur.r * (1 - OPACITE_MINIMALE),
      g: lumiere.g * OPACITE_MINIMALE + mur.g * (1 - OPACITE_MINIMALE),
      b: lumiere.b * OPACITE_MINIMALE + mur.b * (1 - OPACITE_MINIMALE),
      a: 1,
    }
    expect(contraste(pale, mur)).toBeGreaterThanOrEqual(3)
  })

  it('garde le même mur si l’on échange les deux jetons', () => {
    const clair = analyserCouleur('#efe9dd')
    const sombre = analyserCouleur('#141414')
    if (!clair || !sombre) throw new Error('couleur illisible')
    expect(choisirEncres(clair, sombre)).toEqual(choisirEncres(sombre, clair))
  })

  it('garde lisibles les encres de donnée posées sur le mur (ressentis)', () => {
    const mur = choisirEncres(analyserCouleur('#efe9dd')!, analyserCouleur('#141414')!).mur
    for (const encre of ['#2fd67b', '#ff9f1c', '#ff4a3d']) {
      const c = analyserCouleur(encre)
      if (!c) throw new Error('couleur illisible')
      expect(contraste(c, mur)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
