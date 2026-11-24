import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rendre } from '../../../test/rendu'
import { AnalyseEstampe } from './Analyse'

const point = (date: string, e1rm: number, tonnage: number) => ({
  date,
  e1rm_lest_kg: e1rm,
  tonnage_kg: tonnage,
  series: 4,
  reps: 12,
  rpe_moyen: 8,
})

describe('Analyse, thème Estampe', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
      const url = requete instanceof Request ? requete.url : String(requete)
      if (url.includes('/evolution/')) {
        return Response.json([
          point('2026-11-04', 35.5, 1900),
          point('2026-11-12', 40, 2100),
          point('2026-11-21', 41.5, 2200),
        ])
      }
      return Response.json([
        { id: 1, nom: 'Traction' },
        { id: 2, nom: 'Dips' },
      ])
    })
  })

  it('résume le 1RM, le meilleur et la progression', async () => {
    rendre(<AnalyseEstampe />)

    // Le dernier 1RM est aussi le meilleur : le chiffre apparaît deux fois.
    expect(await screen.findAllByText('+41,5 kg', { selector: 'dd' })).toHaveLength(2)
    expect(screen.getByText('+6 kg', { selector: 'dd' })).toBeInTheDocument()
  })

  it('offre une miniature par grandeur et met la choisie sur la planche', async () => {
    rendre(<AnalyseEstampe />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })

    const rail = screen.getByRole('list', { name: 'Grandeurs' })
    expect(rail.querySelectorAll('button')).toHaveLength(5)
    expect(screen.getByText(/1RM estimé · kg de lest/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Tonnage/ }))

    expect(screen.getByText(/Tonnage · kg/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tonnage/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('change d’exercice et de période', async () => {
    rendre(<AnalyseEstampe />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })

    fireEvent.click(screen.getByRole('radio', { name: 'Dips' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Mois' }))

    expect(screen.getByRole('radio', { name: 'Dips' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Mois' })).toHaveAttribute('aria-checked', 'true')
  })
})
