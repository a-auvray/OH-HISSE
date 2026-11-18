import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { type Session, useSession } from './contexte'
import { FournisseurSession } from './FournisseurSession'

/** Rend le fournisseur et renvoie la session courante. */
async function monter(): Promise<{ session: () => Session }> {
  let courante: Session | null = null
  function Sonde() {
    courante = useSession()
    return <p>{courante.etat.statut}</p>
  }
  render(
    <FournisseurSession>
      <Sonde />
    </FournisseurSession>,
  )
  await waitFor(() => expect(screen.queryByText('chargement')).not.toBeInTheDocument())
  return { session: () => courante! }
}

const reponse = (corps: unknown, status: number) =>
  new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), {
    status,
    headers: { 'Content-Type': typeof corps === 'string' ? 'text/html' : 'application/json' },
  })

describe('FournisseurSession', () => {
  it('relaie le message de l’API en cas de mauvais identifiants', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(reponse({ detail: 'Connexion requise.' }, 401))
      .mockResolvedValueOnce(reponse({ detail: 'Email ou mot de passe incorrect.' }, 401))
    const { session } = await monter()

    expect(await session().seConnecter('moi@oh-hisse.fr', 'faux')).toBe('Email ou mot de passe incorrect.')
  })

  it('signale un serveur injoignable quand la requête n’atteint pas l’API', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(reponse({ detail: 'Connexion requise.' }, 401))
      .mockResolvedValueOnce(reponse('<!doctype html>', 404))
    const { session } = await monter()

    expect(await session().seConnecter('moi@oh-hisse.fr', 'secret')).toMatch(/serveur ne répond pas/)
  })
})
