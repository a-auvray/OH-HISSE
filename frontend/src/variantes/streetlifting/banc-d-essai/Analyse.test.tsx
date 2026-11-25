import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rendre } from '../../../test/rendu'
import { AnalyseBanc } from './Analyse'

const point = (date: string, lest: number, total: number, tonnage: number, rpe: number) => ({
  seance_id: 1,
  date,
  e1rm_lest_kg: lest,
  e1rm_total_kg: total,
  tonnage_kg: tonnage,
  series: 4,
  reps: 12,
  rpe_moyen: rpe,
  poids_du_corps_kg: 74.2,
})

const OBJECTIF = {
  titre: 'Cap +50',
  type: 'max',
  exercice_id: 1,
  valeur_cible_kg: 50,
  date_cible: '2027-01-01',
  principal: true,
  id: 7,
  statut: 'en_cours',
  exercice: 'Traction',
  jours_restants: 30,
  progression: { e1rm_lest_kg: 41.5, le: '2026-11-21', pourcentage: 83, cible_atteinte: false },
  blocs: [],
}

function simuler(objectifs: unknown[] = [OBJECTIF]) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
    const url = requete instanceof Request ? requete.url : String(requete)
    if (url.includes('/evolution/')) {
      return Response.json([
        point('2026-11-04', 35.5, 109.7, 1900, 8),
        point('2026-11-12', 40, 114.2, 2100, 8.5),
        point('2026-11-21', 41.5, 115.7, 2200, 8),
      ])
    }
    if (url.includes('/api/objectifs')) return Response.json(objectifs)
    return Response.json([
      { id: 1, nom: 'Traction' },
      { id: 2, nom: 'Dips' },
    ])
  })
}

describe('Analyse, variante Banc d’essai', () => {
  beforeEach(() => simuler())

  it('résume le 1RM, le meilleur et la progression', async () => {
    rendre(<AnalyseBanc />)

    // Le dernier 1RM est aussi le meilleur : le chiffre apparaît deux fois.
    expect(await screen.findAllByText('+41,5 kg', { selector: 'dd' })).toHaveLength(2)
    expect(screen.getByText('+6 kg', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('depuis le 4 nov.', { selector: 'dd' })).toBeInTheDocument()
  })

  it('trace la courbe caractéristique et la limite visée de l’exercice', async () => {
    rendre(<AnalyseBanc />)

    expect(
      await screen.findByRole('group', { name: /Courbe caractéristique de Traction/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('LIMITE VISÉE +50 kg')).toBeInTheDocument()
    expect(screen.getByText('Limite : +41,5 kg en lest (115,7 kg au total).')).toBeInTheDocument()
  })

  it('met la progression vers l’objectif sur une réglette, avec la phrase calculée', async () => {
    rendre(<AnalyseBanc />)

    expect(await screen.findByText('Vers +50 kg : 83 % du lest')).toBeInTheDocument()
    const reglette = screen.getByRole('meter', { name: /limite visée de \+50 kg/ })
    expect(reglette).toHaveAttribute('aria-valuenow', '83')
    // Le 1RM arrive avec l'évolution, un peu après l'objectif : la phrase se calcule alors.
    expect(await screen.findByText('Reste 8,5 kg avant la limite visée de +50 kg.')).toBeInTheDocument()
  })

  it('n’affiche ni réglette ni ligne visée sans objectif', async () => {
    simuler([])
    rendre(<AnalyseBanc />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })

    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    expect(screen.queryByText(/LIMITE VISÉE/)).not.toBeInTheDocument()
  })

  it('offre une miniature par grandeur et met la choisie sur le graphique', async () => {
    rendre(<AnalyseBanc />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })

    const rail = screen.getByRole('list', { name: 'Grandeurs' })
    expect(rail.querySelectorAll('button')).toHaveLength(5)
    expect(screen.getByText(/1RM estimé · kg de lest/, { selector: 'figcaption span' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Tonnage/ }))

    expect(screen.getByText(/Tonnage · kg/, { selector: 'figcaption span' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tonnage/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('imprime le RPE moyen au-dessus de chaque barre de tonnage', async () => {
    rendre(<AnalyseBanc />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })
    fireEvent.click(screen.getByRole('button', { name: /Tonnage/ }))

    const barres = document.querySelectorAll('svg rect')
    expect(barres).toHaveLength(3)
    // Les graduations de la courbe caractéristique (« 8 reps éq. ») sont aussi des textes SVG : on ne
    // prend que le texte placé juste après chaque barre.
    const rpe = [...document.querySelectorAll('svg rect + text')].map((t) => t.textContent)
    expect(rpe).toEqual(['8', '8,5', '8'])
  })

  it('lit les valeurs au clavier et en tableau pour les lecteurs d’écran', async () => {
    rendre(<AnalyseBanc />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })

    const zone = screen.getByRole('group', { name: /1RM estimé dans le temps/ })
    fireEvent.keyDown(zone, { key: 'ArrowRight' })
    expect(screen.getByText('4 nov. · 35,5 kg de lest')).toBeInTheDocument()
    fireEvent.keyDown(zone, { key: 'ArrowRight' })
    expect(screen.getByText('12 nov. · 40 kg de lest')).toBeInTheDocument()

    const tableau = screen.getByRole('table')
    expect(within(tableau).getAllByRole('row')).toHaveLength(4)
  })

  it('change d’exercice et de période', async () => {
    rendre(<AnalyseBanc />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })

    fireEvent.click(screen.getByRole('radio', { name: 'Dips' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Mois' }))

    expect(screen.getByRole('radio', { name: 'Dips' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Mois' })).toHaveAttribute('aria-checked', 'true')
  })

  it('dit quand il n’y a pas encore de données', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
      const url = requete instanceof Request ? requete.url : String(requete)
      if (url.includes('/evolution/')) return Response.json([])
      if (url.includes('/api/objectifs')) return Response.json([])
      return Response.json([{ id: 1, nom: 'Traction' }])
    })
    rendre(<AnalyseBanc />)

    expect(await screen.findByText(/Pas encore de données pour ce choix/)).toBeInTheDocument()
    expect(screen.getByText(/La courbe caractéristique demande un RPE/)).toBeInTheDocument()
    expect(screen.getByText('pas encore estimé', { selector: 'dd' })).toBeInTheDocument()
  })

  it('montre l’erreur de lecture de l’évolution', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
      const url = requete instanceof Request ? requete.url : String(requete)
      if (url.includes('/evolution/')) return Response.json({ detail: 'Panne de base.' }, { status: 500 })
      if (url.includes('/api/objectifs')) return Response.json([])
      return Response.json([{ id: 1, nom: 'Traction' }])
    })
    rendre(<AnalyseBanc />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Panne de base.')
  })
})
