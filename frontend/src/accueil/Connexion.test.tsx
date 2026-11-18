import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { rendre } from '../test/rendu'
import { Connexion } from './Connexion'

const ANONYME = { statut: 'anonyme' } as const

describe('Connexion', () => {
  it('transmet les identifiants saisis', async () => {
    const seConnecter = vi.fn(async () => null)
    rendre(<Connexion />, { etat: ANONYME, seConnecter })

    await userEvent.type(screen.getByLabelText('Email'), 'moi@oh-hisse.fr')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(seConnecter).toHaveBeenCalledWith('moi@oh-hisse.fr', 'secret')
  })

  it('affiche le message renvoyé par l’API', async () => {
    rendre(<Connexion />, {
      etat: ANONYME,
      seConnecter: vi.fn(async () => 'Email ou mot de passe incorrect.'),
    })

    await userEvent.type(screen.getByLabelText('Email'), 'moi@oh-hisse.fr')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'faux')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect.')
  })

  it('ouvre la démo sans identifiants', async () => {
    const entrerEnDemo = vi.fn(async () => null)
    rendre(<Connexion />, { etat: ANONYME, entrerEnDemo })

    await userEvent.click(screen.getByRole('button', { name: /Explorer en mode démo/ }))

    expect(entrerEnDemo).toHaveBeenCalledOnce()
  })
})
