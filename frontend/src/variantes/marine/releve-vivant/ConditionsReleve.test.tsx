import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Conditions } from '../../../api/types'
import { rendre } from '../../../test/rendu'
import { ConditionsReleve } from './ConditionsReleve'
import vues from './index'
import meta from './meta'

/* Une journée de relevés : l'eau monte jusqu'à 15h puis redescend ; le danger passe au rouge à 17h. */
const heure = (h: number, danger: string, hauteur: number, vent: number, distance: number) => ({
  instant: `2026-11-23T${String(h).padStart(2, '0')}:00:00+01:00`,
  danger,
  hauteur_eau_m: hauteur,
  distance_eau_m: distance,
  vent_kmh: vent,
  air_c: 10 + h / 10,
  eau_c: 12,
  vagues_m: 0.5,
  courant_kmh: 1,
  code_meteo: 3,
  nuages_pct: 80,
  vent_direction_deg: 225,
  rafales_kmh: vent + 10,
  courant_direction_deg: 90,
})

const CONDITIONS = {
  spot: { id: 1, nom: 'Ouistreham', latitude: 49.2756, longitude: -0.2574 },
  maintenant: {
    instant: '2026-11-23T13:05:00+01:00',
    eau_c: 11.8,
    air_c: 6,
    ressenti_c: 3,
    vent_kmh: 12,
    rafales_kmh: 20,
    vent_direction_deg: 100,
    vagues_m: 0.8,
    periode_s: 7,
    houle_m: 0.6,
    courant_kmh: 2.6,
    courant_direction_deg: 110,
    code_meteo: 3,
    nuages_pct: 95,
    hauteur_eau_m: 4.6,
    tendance: 'montante',
    distance_eau_m: 50,
  },
  heures: [
    heure(13, 'vert', 4.6, 12, 50),
    heure(14, 'vert', 5.8, 14, 20),
    heure(15, 'vert', 6.9, 16, 0),
    heure(16, 'vert', 6.2, 18, 15),
    heure(17, 'rouge', 5.0, 40, 40),
    heure(18, 'rouge', 3.8, 42, 80),
  ],
  marees: [
    { type: 'PM', instant: '2026-11-23T14:52:00+01:00', hauteur_m: 6.9, coefficient: 87 },
    { type: 'BM', instant: '2026-11-23T21:08:00+01:00', hauteur_m: 1.1, coefficient: 87 },
  ],
  soleil: [{ lever: '2026-11-23T08:23:00+01:00', coucher: '2026-11-23T17:11:00+01:00' }],
  danger: { niveau: 'vert', raisons: [] },
  perimees: false,
  source: 'Open-Meteo',
} as unknown as Conditions

const avec = (surcharge: Partial<Conditions>): Conditions => ({ ...CONDITIONS, ...surcharge })

const ASSISTANT = {
  creneaux: [{ debut: '2026-11-23T13:30:00+01:00', fin: '2026-11-23T15:30:00+01:00' }],
  recommandations: { durees: { conseille_min: 25, maximum_min: 40 } },
}

describe('Conditions de la mer, Le Relevé Vivant', () => {
  beforeEach(() => {
    // Par défaut, l'assistant n'a pas de créneau : la réponse vient alors de la bascule du danger.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ creneaux: [] }))
  })

  it('est déclarée pour Marine et ne donne que la vue Conditions', () => {
    expect(meta).toMatchObject({ id: 'releve-vivant', espace: 'marine' })
    expect(Object.keys(vues)).toEqual(['Conditions'])
  })

  it('donne le verdict avant les chiffres, en premier titre de la page', () => {
    rendre(<ConditionsReleve conditions={CONDITIONS} spotId={1} />)

    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Vas-y avant 17h.')
    expect(screen.getByText('VERT · jusqu’à 17h')).toBeInTheDocument()
    expect(screen.getByText('Ouistreham')).toBeInTheDocument()
    expect(screen.getByText('49,276° N · 0,257° O')).toBeInTheDocument()
  })

  it('reprend le créneau et les durées de l’assistant dans la phrase', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(ASSISTANT))
    rendre(<ConditionsReleve conditions={CONDITIONS} spotId={1} />)

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Vas-y entre 13h30 et 15h30.' }),
    ).toBeVisible()
    expect(
      screen.getByText('VERT jusqu’à 17h · eau 11,8 °C · 25 min conseillées · 40 max'),
    ).toBeInTheDocument()
    expect(screen.getByText('Meilleur créneau : 13h30 à 15h30')).toBeInTheDocument()
  })

  it('garde toute la page quand l’assistant ne répond pas', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('réseau'))
    rendre(<ConditionsReleve conditions={CONDITIONS} spotId={1} />)

    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Vas-y avant 17h.')
    expect(screen.getByLabelText('Voyage dans le temps')).toBeInTheDocument()
  })

  it('montre tous les relevés', () => {
    rendre(<ConditionsReleve conditions={CONDITIONS} spotId={1} />)

    const releves = within(screen.getByRole('region', { name: 'Relevés' }))
    for (const nom of [
      'Eau',
      'Coefficient',
      'Pleine mer',
      'Basse mer',
      'Vent',
      'Vagues',
      'Courant',
      'Air',
      'Ciel',
      'Soleil',
    ]) {
      expect(releves.getByRole('heading', { level: 3, name: nom })).toBeInTheDocument()
    }
    expect(releves.getByText('14h52')).toBeInTheDocument()
    expect(releves.getByText('21h08')).toBeInTheDocument()
    expect(releves.getByText('87')).toBeInTheDocument()
    expect(releves.getByRole('img', { name: /sous le seuil de choc thermique/ })).toBeInTheDocument()
  })

  it('dessine la courbe de marée et la coupe de plage, décrites en texte', () => {
    rendre(<ConditionsReleve conditions={CONDITIONS} spotId={1} />)

    expect(
      screen.getByRole('img', { name: /Hauteur d’eau sur 6 h\. Pleine mer à 14h52, 6,9 m/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Coupe de la plage : l’eau est à 4,6 m, 50 m de sable jusqu’à l’eau/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/VERT jusqu’à 17h · ROUGE dès 17h/)).toBeInTheDocument()
  })

  it('remonte le temps avec le curseur, et revient à maintenant', () => {
    rendre(<ConditionsReleve conditions={CONDITIONS} spotId={1} />)

    expect(screen.getAllByRole('status')[0]).toHaveTextContent(/maintenant · eau à 4,6 m · la mer monte/)
    fireEvent.change(screen.getByLabelText('Voyage dans le temps'), { target: { value: '4' } })

    expect(screen.getAllByRole('status')[0]).toHaveTextContent(/17h · eau à 5 m/)
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(/danger rouge/)
    expect(screen.getByText('ROUGE · jusqu’à la fin des prévisions')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Revenir à maintenant' }))
    expect(screen.getByLabelText('Voyage dans le temps')).toHaveValue('0')
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(/maintenant/)
  })

  it('choisit une heure depuis la frise des 48 heures', () => {
    rendre(<ConditionsReleve conditions={CONDITIONS} spotId={1} />)

    fireEvent.click(screen.getByRole('button', { name: /48 heures/ }))
    fireEvent.click(screen.getByRole('button', { name: /17h, danger rouge/ }))

    expect(screen.getByLabelText('Voyage dans le temps')).toHaveValue('4')
    expect(screen.getByRole('button', { name: /17h, danger rouge/ })).toHaveAttribute('aria-current', 'true')
  })

  it('se règle sur la courbe : un appui à l’extrémité droite choisit la dernière heure', () => {
    rendre(<ConditionsReleve conditions={CONDITIONS} spotId={1} />)

    const courbe = screen.getByRole('img', { name: /Hauteur d’eau/ })
    fireEvent.pointerDown(courbe, { clientX: 5000, pointerId: 1 })
    fireEvent.pointerUp(courbe, { pointerId: 1 })

    expect(screen.getByLabelText('Voyage dans le temps')).toHaveValue('5')
  })

  it('dit les raisons du danger quand il y en a', () => {
    rendre(
      <ConditionsReleve
        conditions={avec({
          danger: { niveau: 'rouge', raisons: [{ niveau: 'rouge', texte: 'Vent de 40 km/h' }] },
        } as Partial<Conditions>)}
        spotId={1}
      />,
    )

    expect(screen.getByRole('list', { name: 'Pourquoi' })).toHaveTextContent('Vent de 40 km/h')
    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Pas avant')
  })

  it('barre la coupe et retire le créneau quand la mer est noire', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(ASSISTANT))
    rendre(
      <ConditionsReleve
        conditions={avec({
          danger: { niveau: 'noir', raisons: [{ niveau: 'noir', texte: 'Vent de 95 km/h' }] },
        } as Partial<Conditions>)}
        spotId={1}
      />,
    )

    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Mer interdite.')
    expect(screen.getByText('NOIR · NE PAS Y ALLER')).toBeInTheDocument()
    expect(document.querySelector('[data-niveau="noir"]')).not.toBeNull()
    // Laisse à l'assistant le temps de répondre : le créneau ne doit pas apparaître pour autant.
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByText(/Meilleur créneau/)).not.toBeInTheDocument()
  })

  it('signale des données en cache', () => {
    rendre(<ConditionsReleve conditions={avec({ perimees: true })} spotId={1} />)

    expect(screen.getByText('Données en cache : Open-Meteo ne répond pas.')).toBeInTheDocument()
  })

  it('dit que le profil est inconnu quand les prévisions ne donnent pas la distance', () => {
    const sansDistance = CONDITIONS.heures.map((h) => ({ ...h, distance_eau_m: null }))
    rendre(<ConditionsReleve conditions={avec({ heures: sansDistance })} spotId={1} />)

    expect(screen.getByText(/Le profil de la plage n’est pas connu/)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Coupe de la plage/ })).not.toBeInTheDocument()
  })

  it('tient sans prévision horaire, sans marée et sans soleil', () => {
    rendre(
      <ConditionsReleve
        conditions={avec({ heures: [], marees: [], soleil: [], danger: { niveau: 'vert', raisons: [] } })}
        spotId={null}
      />,
    )

    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('La mer est à toi.')
    expect(screen.queryByRole('img', { name: /Hauteur d’eau/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Soleil' })).not.toBeInTheDocument()
    expect(screen.getByText('Le profil de la plage n’est pas connu', { exact: false })).toBeInTheDocument()
  })
})
