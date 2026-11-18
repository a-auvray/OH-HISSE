import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MOI, rendre } from '../test/rendu'
import { Accueil } from './Accueil'

describe('Accueil', () => {
  beforeEach(() => {
    // Le briefing interroge l'API : sans données, il affiche ses états d'attente.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ detail: 'Introuvable.' }, { status: 404 }),
    )
  })

  it('ouvre les quatre espaces d’un clic', () => {
    rendre(<Accueil />)

    const liens = {
      'Vie courante': '/vie-courante',
      Streetlifting: '/streetlifting',
      Marine: '/marine',
      Objectifs: '/objectifs',
    }
    for (const [nom, chemin] of Object.entries(liens)) {
      expect(screen.getByRole('link', { name: new RegExp(`^${nom}`) })).toHaveAttribute('href', chemin)
    }
  })

  it('salue l’utilisateur et présente le briefing du jour', () => {
    rendre(<Accueil />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Antoine')
    expect(screen.getByRole('heading', { name: 'Briefing du jour' })).toBeInTheDocument()
  })

  it('ne propose pas « Se déconnecter » en démo (le bandeau s’en charge)', () => {
    rendre(<Accueil />, { etat: { statut: 'connecte', utilisateur: { ...MOI, est_demo: true } } })

    expect(screen.queryByRole('button', { name: 'Se déconnecter' })).not.toBeInTheDocument()
  })
})

describe('Briefing du jour', () => {
  it('affiche la séance du jour, la mer et l’objectif principal', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
      const url = requete instanceof Request ? requete.url : String(requete)
      if (url.includes('marine/conditions')) {
        return Response.json({
          spot: { nom: 'Colleville-Montgomery' },
          maintenant: { eau_c: 12.3 },
          danger: { niveau: 'rouge', raisons: [{ niveau: 'rouge', texte: 'Vent moyen de 32 km/h' }] },
        })
      }
      if (url.includes('seance-du-jour')) {
        return Response.json({
          bloc: { id: 1, nom: 'Force', type: 'force', numero: 4, total: 18, rang_modele: 0 },
          nom: 'A — Tirage lourd',
          poids: { kg: 75, a_jour: true },
          propositions: [{}, {}],
        })
      }
      return Response.json([
        {
          id: 1,
          titre: '55 kg aux tractions',
          principal: true,
          statut: 'en_cours',
          valeur_cible_kg: 55,
          progression: { e1rm_lest_kg: 42.1, pourcentage: 76.5, le: '2026-11-16', cible_atteinte: false },
        },
      ])
    })
    rendre(<Accueil />)

    expect(await screen.findByText('A — Tirage lourd')).toBeInTheDocument()
    expect(screen.getByText('Séance 4 / 18 · 2 exercices')).toBeInTheDocument()
    expect(screen.getByText('+42,1 / 55 kg')).toBeInTheDocument()
    expect(screen.getByText('55 kg aux tractions · 77 %')).toBeInTheDocument()
    expect(screen.getByText('Rouge · eau 12 °C')).toBeInTheDocument()
    expect(screen.getByText('Vent moyen de 32 km/h')).toBeInTheDocument()
  })
})
