import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rendre } from '../../test/rendu'
import { AccueilPapier } from './Accueil'

describe('Accueil du thème Papier', () => {
  beforeEach(() => {
    localStorage.clear()
    // Sans données, les blocs affichent leurs états d'attente : la page reste complète.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ detail: 'Introuvable.' }, { status: 404 }),
    )
  })

  it('ouvre les quatre espaces par leurs rabats', () => {
    rendre(<AccueilPapier />)

    const rabats = {
      'Vie courante': '/vie-courante',
      Streetlifting: '/streetlifting',
      Marine: '/marine',
      Objectifs: '/objectifs',
    }
    for (const [nom, chemin] of Object.entries(rabats)) {
      expect(screen.getByRole('link', { name: `${nom} : ouvrir l’espace` })).toHaveAttribute('href', chemin)
    }
  })

  it('salue, et garde une jauge de progression par bloc qui en a une', () => {
    rendre(<AccueilPapier />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pas de séance prévue')
    expect(screen.getByText(/Bonjour, Antoine|Bonsoir, Antoine/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Récupération' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avancement du bloc' })).toBeInTheDocument()
  })

  it('passe du jour au soir et s’en souvient', async () => {
    rendre(<AccueilPapier />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '◐ Mode sombre' }))

    expect(screen.getByRole('main')).toHaveAttribute('data-ton', 'soir')
    expect(screen.getByRole('button', { name: '◑ Mode clair' })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('oh-hisse.ton')).toBe('soir')
  })

  it('reprend le ton mémorisé', () => {
    localStorage.setItem('oh-hisse.papier.ton', 'soir')

    rendre(<AccueilPapier />)

    expect(screen.getByRole('main')).toHaveAttribute('data-ton', 'soir')
  })

  it('ne propose « Se déconnecter » qu’hors démo', () => {
    rendre(<AccueilPapier />)

    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument()
  })
})
