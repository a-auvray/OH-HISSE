import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { rendre } from '../test/rendu'
import { Accueil } from './Accueil'

function afficher() {
  rendre(<Accueil />)
}

describe('Accueil', () => {
  it('propose les quatre espaces', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ statut: 'ok', version: '0.1.0' }))
    afficher()

    for (const nom of ['Vie courante', 'Streetlifting', 'Marine', 'Objectifs']) {
      expect(screen.getByRole('link', { name: nom })).toBeInTheDocument()
    }
  })

  it("affiche la version de l'API quand elle répond", async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ statut: 'ok', version: '0.1.0' }))
    afficher()

    expect(await screen.findByText('API en ligne · v0.1.0')).toBeInTheDocument()
  })

  it('signale une API injoignable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    afficher()

    expect(await screen.findByText('API injoignable')).toBeInTheDocument()
  })
})
