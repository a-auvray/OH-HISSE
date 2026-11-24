import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Conditions } from '../../../api/types'
import { rendre } from '../../../test/rendu'
import { ConditionsPapier } from './Conditions'

const heure = (h: number, danger: string, hauteur: number, vent: number) => ({
  instant: `2026-11-23T${String(h).padStart(2, '0')}:00:00+01:00`,
  danger,
  hauteur_eau_m: hauteur,
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
  spot: { id: 1, nom: 'Ouistreham' },
  maintenant: {
    instant: '2026-11-23T13:05:00+01:00',
    eau_c: 11.8,
    air_c: 6,
    vent_kmh: 12,
    rafales_kmh: 20,
    vent_direction_deg: 100,
    vagues_m: 0.3,
    periode_s: 4,
    houle_m: 0.3,
    courant_kmh: 2.6,
    courant_direction_deg: 110,
    code_meteo: 3,
    nuages_pct: 95,
    hauteur_eau_m: 4.6,
    tendance: 'montante',
    distance_eau_m: 50,
  },
  heures: [heure(13, 'vert', 4.6, 12), heure(14, 'vert', 5.8, 14), heure(17, 'rouge', 6.9, 40)],
  marees: [{ type: 'PM', instant: '2026-11-23T14:52:00+01:00', hauteur_m: 6.9, coefficient: 87 }],
  soleil: [{ lever: '2026-11-23T08:23:00+01:00', coucher: '2026-11-23T17:11:00+01:00' }],
  danger: { niveau: 'vert', raisons: [] },
  perimees: false,
  source: 'Open-Meteo',
} as unknown as Conditions

describe('Conditions de la mer, thème Papier', () => {
  beforeEach(() => {
    // L'assistant n'a pas de créneau à proposer : la réponse vient alors de la bascule du danger.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ creneaux: [] }))
  })

  it('donne la réponse avant les chiffres', () => {
    rendre(<ConditionsPapier conditions={CONDITIONS} spotId={1} />)

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Vas-y avant 17h.')
    expect(screen.getByText('VERT')).toBeInTheDocument()
  })

  it('montre les cinq instruments et la distance jusqu’à l’eau', () => {
    rendre(<ConditionsPapier conditions={CONDITIONS} spotId={1} />)

    for (const nom of ['Eau', 'Vent', 'Vagues', 'Courant', 'Ciel']) {
      expect(screen.getByRole('heading', { level: 3, name: nom })).toBeInTheDocument()
    }
    expect(screen.getByRole('img', { name: /Coupe de la plage/ })).toBeInTheDocument()
    expect(screen.getByText(/50 m de sable jusqu’à l’eau/)).toBeInTheDocument()
  })

  it('remonte le temps avec le curseur, et revient à maintenant', () => {
    rendre(<ConditionsPapier conditions={CONDITIONS} spotId={1} />)

    fireEvent.change(screen.getByLabelText('Voyage dans le temps'), { target: { value: '2' } })

    expect(screen.getByText(/17h/, { selector: 'figcaption span' })).toBeInTheDocument()
    expect(screen.queryByText(/de sable jusqu’à l’eau/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Revenir à maintenant' }))

    expect(screen.getByText(/50 m de sable jusqu’à l’eau/)).toBeInTheDocument()
  })

  it('choisit une heure depuis la frise', () => {
    rendre(<ConditionsPapier conditions={CONDITIONS} spotId={1} />)

    fireEvent.click(screen.getByRole('button', { name: /48 heures/ }))
    fireEvent.click(screen.getByRole('button', { name: /17h, danger rouge/ }))

    expect(screen.getByLabelText('Voyage dans le temps')).toHaveValue('2')
  })
})
