import { describe, expect, it } from 'vitest'

import { conditionsFictives, heureFictive } from './fixture'
import {
  annonce,
  distanceChoisie,
  indexJour,
  jourDe,
  joursDesHeures,
  lectureA,
  nomDeJour,
  phraseBascule,
  phraseDistance,
  phraseDurees,
  phraseMarche,
  phraseVent,
  rangPourJour,
  verdict,
} from './lecture'
import { profilEstran } from './modele'

const conditions = conditionsFictives()
const creneau = { debut: '2026-11-20T13:30:00+01:00', fin: '2026-11-20T15:30:00+01:00' }

describe('lecture à l’heure choisie', () => {
  it('lit l’instant présent au rang 0 et la prévision ailleurs', () => {
    const maintenant = lectureA(conditions, 0)
    expect(maintenant.surMaintenant).toBe(true)
    expect(maintenant.ressentiC).toBe(13)
    expect(maintenant.hauteurM).toBe(conditions.maintenant.hauteur_eau_m)

    const plus_tard = lectureA(conditions, 3)
    expect(plus_tard.surMaintenant).toBe(false)
    expect(plus_tard.instant).toBe(conditions.heures[3]!.instant)
    expect(plus_tard.ressentiC).toBeNull()
    // La période de la houle n'existe que pour l'instant présent : elle est gardée pour toutes les heures.
    expect(plus_tard.periodeS).toBe(7)
    expect(plus_tard.danger).toBe('vert')
    expect(lectureA(conditions, 10).danger).toBe('rouge')
  })

  it('prend le danger de la mer entière au rang 0', () => {
    expect(lectureA({ ...conditions, danger: { niveau: 'noir', raisons: [] } }, 0).danger).toBe('noir')
  })

  it('préfère la distance de l’API, sinon la tire du profil', () => {
    const profil = profilEstran(conditions.heures)
    const l = lectureA(conditions, 2)
    expect(distanceChoisie(l, profil)).toBe(l.distanceM)
    const sans = { ...l, distanceM: null }
    expect(distanceChoisie(sans, profil)).toBeGreaterThan(0)
    expect(distanceChoisie(sans, null)).toBeNull()
    expect(distanceChoisie({ ...sans, hauteurM: null }, profil)).toBeNull()
  })
})

describe('phrases', () => {
  it('écrit la distance à marcher, ou l’eau au pied de la digue', () => {
    expect(phraseDistance(214)).toBe('214 m à marcher')
    expect(phraseDistance(0.4)).toBe('L’eau au pied de la digue')
    expect(phraseMarche(200)).toBe('≈ 3 min à pied')
    expect(phraseMarche(0)).toBe('')
  })

  it('nomme le vent par rapport à la plage', () => {
    expect(phraseVent(26, 225)).toBe('vent de terre · pousse au large')
    expect(phraseVent(26, 0)).toBe('vent de mer · pousse vers la plage')
    expect(phraseVent(26, 90)).toBe('vent le long de la côte')
    expect(phraseVent(1, 225)).toBe('presque pas de vent')
    expect(phraseVent(null, 225)).toBe('')
    expect(phraseVent(10, null)).toBe('')
  })

  it('écrit les durées conseillées avec l’eau', () => {
    expect(phraseDurees({ conseille_min: 25, maximum_min: 40, texte: '' }, 12)).toBe(
      '25 min conseillées · max 40 · eau 12 °C',
    )
    expect(phraseDurees(null, 11.8)).toBe('eau 11,8 °C')
    expect(phraseDurees({ conseille_min: null, maximum_min: null, texte: 'Pas de durée.' }, null)).toBe(
      'Pas de durée.',
    )
    expect(phraseDurees(null, null)).toBe('')
  })

  it('dit quand le danger bascule, avec les valeurs de cette heure et la nuit', () => {
    const phrase = phraseBascule(conditions, 0)!
    expect(phrase.startsWith('ROUGE dès 17h : vent 31 km/h, rafales 42 km/h, vagues 0,8 m')).toBe(true)
    expect(phrase).toContain('nuit dès 17h08')
    expect(phraseBascule({ ...conditions, heures: conditions.heures.slice(0, 5) }, 0)).toBeNull()
  })

  it('n’ajoute pas la nuit quand le soleil est encore haut à la bascule', () => {
    const tot = {
      ...conditions,
      heures: conditions.heures.map((h, i) => (i >= 2 ? { ...h, danger: 'rouge' as const } : h)),
    }
    expect(phraseBascule(tot, 0)).not.toContain('nuit')
  })

  it('annonce l’heure, la hauteur d’eau, la distance et le danger', () => {
    const l = lectureA(conditions, 0)
    expect(annonce(l, 214)).toMatch(/^10h40, eau à 2,\d m, 214 m à marcher, danger vert$/)
    expect(annonce(l, 0)).toContain('l’eau au pied de la digue')
    expect(annonce({ ...l, hauteurM: null }, null)).toBe('10h40, danger vert')
  })
})

describe('verdict', () => {
  it('se dit « à l’étale » quand le créneau contient un courant presque nul', () => {
    const v = verdict(conditions, creneau)
    expect(v.titre).toBe('Vas-y à l’étale.')
    expect(v.etale?.courant_kmh).toBeLessThanOrEqual(0.3)
  })

  it('reprend la réponse commune sans étale dans le créneau', () => {
    expect(
      verdict(conditions, { debut: '2026-11-20T10:00:00+01:00', fin: '2026-11-20T11:00:00+01:00' }).titre,
    ).toBe('Vas-y entre 10h et 11h.')
    expect(verdict(conditions, null)).toMatchObject({ titre: 'Vas-y avant 17h.', etale: null })
  })

  it('ne promet pas l’étale quand la mer est rouge ou noire', () => {
    const rouge = verdict({ ...conditions, danger: { niveau: 'rouge', raisons: [] } }, creneau)
    expect(rouge.titre).toMatch(/^Pas avant \d+h\.$/)
    expect(rouge.etale).toBeNull()
    expect(verdict({ ...conditions, danger: { niveau: 'noir', raisons: [] } }, creneau).titre).toBe(
      'Mer interdite.',
    )
  })
})

describe('jours de la prévision', () => {
  const heures = conditions.heures

  it('les range dans l’ordre avec le rang de leur première heure', () => {
    const jours = joursDesHeures(heures)
    expect(jours.map((j) => j.jour)).toEqual(['2026-11-20', '2026-11-21'])
    expect(jours.map((j) => j.rang)).toEqual([0, 14])
    expect(jourDe('2026-11-20T23:30:00+01:00')).toBe('2026-11-20')
    expect(joursDesHeures([])).toEqual([])
  })

  it('garde la même heure en changeant de jour, sinon la première heure du jour', () => {
    expect(rangPourJour(heures, 1, 4)).toBe(28)
    expect(rangPourJour(heures, 0, 28)).toBe(4)
    expect(rangPourJour(heures, 0, 20)).toBe(0)
    expect(rangPourJour(heures, 5, 3)).toBe(3)
    expect(rangPourJour([], 0, 0)).toBe(0)
  })

  it('dit dans quel jour tombe une heure et le nomme J, J+1…', () => {
    expect(indexJour(heures, 13)).toBe(0)
    expect(indexJour(heures, 14)).toBe(1)
    expect(nomDeJour(0)).toBe('J')
    expect(nomDeJour(2)).toBe('J+2')
  })

  it('reste cohérent pour une seule heure', () => {
    expect(joursDesHeures([heureFictive(0)])).toHaveLength(1)
  })
})
