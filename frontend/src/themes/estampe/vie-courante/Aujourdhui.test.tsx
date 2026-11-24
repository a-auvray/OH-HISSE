import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rendre } from '../../../test/rendu'
import { AujourdhuiEstampe } from './Aujourdhui'

const ETAT = {
  recuperation: {
    recupere: false,
    restant_h: 5.6,
    progression: 0.82,
    fin: '2026-11-24T06:00:00+01:00',
    raisons: ['Séance lourde hier'],
    recup_active_conseillee: true,
  },
  cheat_meal: {
    verdict: 'oui',
    points: 3,
    phrase: 'Séance lourde + 40 min de nage.',
    details: ['Séance lourde : +2'],
  },
  sommeil: { derniere_nuit_h: 7.2, moyenne_h: 6.9, nuits_comptees: 7 },
  poids: { kg: 74.2, a_jour: true, derniere_pesee: '2026-11-23' },
}

describe('Aujourd’hui, thème Estampe', () => {
  let appels: { url: string; methode: string }[]

  beforeEach(() => {
    appels = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
      const r = requete instanceof Request ? requete : new Request(String(requete))
      appels.push({ url: r.url, methode: r.method })
      return r.method === 'GET' ? Response.json(ETAT) : Response.json({})
    })
  })

  it('dit la phrase du jour avant tout', async () => {
    rendre(<AujourdhuiEstampe />)

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Ce soir, t’as le droit.')
    expect(screen.getByText('Séance lourde + 40 min de nage.')).toBeInTheDocument()
  })

  it('montre la récupération, l’assiette, la nuit et le poids', async () => {
    rendre(<AujourdhuiEstampe />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByRole('img', { name: 'Récupération à 82 %' })).toBeInTheDocument()
    expect(screen.getByText('6 h')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 points' })).toBeInTheDocument()
    expect(screen.getByText('74,2 kg')).toBeInTheDocument()
    expect(screen.getByText(/Moyenne sur 7 jours : 6,9 h \(7 nuits\)/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /l’assistant de sortie/ })).toHaveAttribute(
      'href',
      '/marine/assistant',
    )
  })

  it('note l’écart du jour', async () => {
    rendre(<AujourdhuiEstampe />)

    fireEvent.click(await screen.findByRole('button', { name: /J’ai pris mon écart/ }))

    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'POST' && a.url.includes('/vie-courante/cheat-meals'))).toBe(
        true,
      ),
    )
  })

  it('note la nuit et la pesée', async () => {
    rendre(<AujourdhuiEstampe />)
    await screen.findByRole('heading', { level: 2 })

    fireEvent.change(screen.getByLabelText(/Heures dormies/), { target: { value: '7,5' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Qualité 4 sur 5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Noter' }))
    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'PUT' && a.url.includes('/nuits/'))).toBe(true),
    )

    fireEvent.change(screen.getByLabelText(/Poids du jour en kg/), { target: { value: '74,6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Peser' }))
    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'POST' && a.url.includes('/pesees'))).toBe(true),
    )
  })
})
