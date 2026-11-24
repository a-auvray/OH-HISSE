import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rendre } from '../../../test/rendu'
import { SeanceDuJourPapier } from './SeanceDuJour'

const SEANCE = {
  bloc: { id: 1, nom: 'Force — cap 55 kg', type: 'force', numero: 3, total: 12, rang_modele: 0 },
  nom: 'A — Tirage lourd',
  poids: { kg: 74.2, a_jour: true },
  forme: { consignes: ['Récupération incomplète : séance allégée'] },
  propositions: [
    {
      exercice_id: 1,
      exercice: 'Traction',
      series: 4,
      reps: 3,
      rpe_cible: 8,
      lest_kg: 32.5,
      justifications: ['+2,5 kg depuis mardi'],
    },
    {
      exercice_id: 2,
      exercice: 'Muscle-up',
      series: 5,
      reps: 2,
      rpe_cible: 7,
      lest_kg: 0,
      justifications: [],
    },
    { exercice_id: 3, exercice: 'Dips', series: 4, reps: 5, rpe_cible: 8, lest_kg: null, justifications: [] },
  ],
}

describe('Séance du jour, thème Papier', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(SEANCE))
  })

  it('montre le bloc, l’avancement et le nom de la séance', async () => {
    rendre(<SeanceDuJourPapier />)

    expect(await screen.findByRole('heading', { level: 2, name: 'A — Tirage lourd' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avancement du bloc' })).toHaveAttribute(
      'aria-valuenow',
      '3',
    )
    expect(screen.getByText('Force', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('74,2 kg')).toBeInTheDocument()
  })

  it('met une ligne par exercice, avec ses cases et sa charge', async () => {
    rendre(<SeanceDuJourPapier />)

    expect(await screen.findByRole('heading', { level: 3, name: 'Traction' })).toBeInTheDocument()
    const quatre = screen.getAllByLabelText('4 séries à faire')
    expect(quatre).toHaveLength(2)
    expect(quatre[0]?.children).toHaveLength(4)
    expect(screen.getByLabelText('5 séries à faire').children).toHaveLength(5)
    await waitFor(() => expect(screen.getByText(/\+32,5/)).toBeInTheDocument())
    expect(screen.getByText('PDC')).toBeInTheDocument()
    expect(screen.getByText('À choisir')).toBeInTheDocument()
    // Les raisons de l'auto-régulation sont dans un panneau, fermé tant qu'on ne l'ouvre pas.
    const pourquoi = screen.getAllByRole('button', { name: /Pourquoi cette charge/ })
    expect(pourquoi[0]).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(pourquoi[0] as HTMLElement)
    expect(screen.getAllByText('+2,5 kg depuis mardi')[0]).toBeVisible()
  })

  it('rappelle la forme du jour et propose de commencer', async () => {
    rendre(<SeanceDuJourPapier />)

    expect(await screen.findByRole('note')).toHaveTextContent('Récupération incomplète')
    expect(screen.getByRole('button', { name: /Commencer la séance/ })).toBeInTheDocument()
  })

  it('invite à importer un bloc quand il n’y en a pas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ bloc: null, nom: null, poids: null, propositions: [], message: 'Aucun bloc actif.' }),
    )
    rendre(<SeanceDuJourPapier />)

    expect(await screen.findByRole('heading', { name: 'Pas de bloc en cours.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Importer un bloc' })).toHaveAttribute(
      'href',
      '/streetlifting/blocs',
    )
  })
})
