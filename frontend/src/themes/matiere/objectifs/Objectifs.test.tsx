import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rendre } from '../../../test/rendu'
import { ObjectifsMatiere } from './Objectifs'

const objectif = (
  id: number,
  titre: string,
  principal: boolean,
  pourcentage: number,
  e1rm: number,
  cible: number,
) => ({
  id,
  titre,
  type: 'max',
  exercice_id: 1,
  exercice: 'Tractions',
  valeur_cible_kg: cible,
  date_cible: '2027-03-15',
  principal,
  statut: 'en_cours',
  jours_restants: 112,
  blocs: principal ? [{ id: 9, nom: 'Force' }] : [],
  progression: { e1rm_lest_kg: e1rm, le: '2026-11-21', pourcentage, cible_atteinte: false },
})

const OBJECTIFS = [
  objectif(1, 'Traction +50 kg', true, 64, 41.5, 50),
  objectif(2, 'Dips +70 kg', false, 71, 49.7, 70),
]

describe('Objectifs, thème Matiere', () => {
  let appels: { url: string; methode: string }[]

  beforeEach(() => {
    appels = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
      const r = requete instanceof Request ? requete : new Request(String(requete))
      appels.push({ url: r.url, methode: r.method })
      if (r.method !== 'GET') return Response.json({})
      if (r.url.includes('/exercices')) return Response.json([{ id: 1, nom: 'Tractions' }])
      return Response.json(OBJECTIFS)
    })
  })

  it('met le principal en grand, avec sa fiche', async () => {
    rendre(<ObjectifsMatiere />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })).toBeInTheDocument()
    expect(screen.getByText('+50 kg de lest')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Force' })).toHaveAttribute('href', '/streetlifting/blocs')
    expect(screen.getByText('J−112', { selector: 'strong' })).toBeInTheDocument()
  })

  it('dessine une drisse par objectif, avec sa progression', async () => {
    rendre(<ObjectifsMatiere />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    expect(screen.getByRole('progressbar', { name: 'Traction +50 kg' })).toHaveAttribute(
      'aria-valuenow',
      '64',
    )
    expect(screen.getByRole('progressbar', { name: 'Dips +70 kg' })).toHaveAttribute('aria-valuenow', '71')
  })

  it('marque l’objectif atteint, met un autre en avant, le supprime', async () => {
    rendre(<ObjectifsMatiere />)
    fireEvent.click(await screen.findByRole('button', { name: 'Marquer atteint' }))
    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'PATCH' && a.url.includes('/statut'))).toBe(true),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mettre en avant' }))
    await waitFor(() => expect(appels.some((a) => a.methode === 'PUT')).toBe(true))

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(appels.some((a) => a.methode === 'DELETE')).toBe(true))
  })

  it('crée un objectif depuis le formulaire', async () => {
    rendre(<ObjectifsMatiere />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    fireEvent.click(screen.getByRole('button', { name: '+ Nouvel objectif' }))
    fireEvent.change(await screen.findByLabelText('Intitulé'), { target: { value: 'Muscle-up +10 kg' } })
    fireEvent.change(screen.getByLabelText(/Cible/), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Date cible'), { target: { value: '2027-06-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fixer cet objectif' }))

    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'POST' && a.url.endsWith('/api/objectifs'))).toBe(true),
    )
  })

  it('invite à fixer un cap quand il n’y a rien', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
      const url = requete instanceof Request ? requete.url : String(requete)
      return url.includes('/exercices') ? Response.json([{ id: 1, nom: 'Tractions' }]) : Response.json([])
    })
    rendre(<ObjectifsMatiere />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Fixe un cap.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer mon premier objectif' })).toBeInTheDocument()
  })
})
