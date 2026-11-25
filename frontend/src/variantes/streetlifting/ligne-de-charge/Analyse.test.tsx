import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { rendre } from '../../../test/rendu'
import { AnalyseLigneDeCharge } from './Analyse'

const point = (id: number, date: string, e1rm: number, tonnage: number) => ({
  seance_id: id,
  date,
  e1rm_lest_kg: e1rm,
  e1rm_total_kg: e1rm + 74,
  tonnage_kg: tonnage,
  series: 4,
  reps: 12,
  rpe_moyen: 8,
  poids_du_corps_kg: 74,
})

function servir(evolution: () => Response) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
    const url = requete instanceof Request ? requete.url : String(requete)
    if (url.includes('/evolution/')) return evolution()
    return Response.json([
      { id: 1, nom: 'Traction' },
      { id: 2, nom: 'Dips' },
    ])
  })
}

const TROIS_SEANCES = () =>
  Response.json([
    point(1, '2026-11-04', 35.5, 1900),
    point(2, '2026-11-12', 40, 2100),
    point(3, '2026-11-21', 41.5, 2200),
  ])

describe('Analyse, « Ligne de charge »', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 900,
      height: 40,
      left: 0,
      top: 0,
      right: 900,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    document.documentElement.dataset.animations = 'immobile'
  })

  afterEach(() => {
    delete document.documentElement.dataset.animations
  })

  it('résume le 1RM, le meilleur et la progression', async () => {
    servir(TROIS_SEANCES)
    rendre(<AnalyseLigneDeCharge />)

    // Le dernier 1RM est aussi le meilleur : le chiffre apparaît deux fois.
    expect(await screen.findAllByText('+41,5 kg', { selector: 'dd' })).toHaveLength(2)
    expect(screen.getByText('+6 kg', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('depuis le 4 nov.', { selector: 'dd' })).toBeInTheDocument()
  })

  it('dit sa lecture en texte : un tableau des points et le point bas de la poutre', async () => {
    servir(TROIS_SEANCES)
    rendre(<AnalyseLigneDeCharge />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })

    // Sans rien survoler, la poutre porte le dernier point, comparé au meilleur (ici le même : 100 %).
    expect(await screen.findByText('41,5 kg de lest · 100 % du record')).toBeInTheDocument()
    const tableau = screen.getByRole('table', { name: /1RM estimé/ })
    expect(tableau.querySelectorAll('tbody tr')).toHaveLength(3)
    expect(screen.getByText(/Survole la courbe/)).toBeInTheDocument()
  })

  it('se parcourt aux flèches et annonce le point lu', async () => {
    servir(TROIS_SEANCES)
    rendre(<AnalyseLigneDeCharge />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })

    const courbe = screen.getByRole('group', { name: /Courbe : 1RM estimé/ })
    courbe.focus()
    fireEvent.keyDown(courbe, { key: 'ArrowLeft' })
    fireEvent.keyDown(courbe, { key: 'ArrowLeft' })

    const lecture = screen.getByText(/4 nov\. · 35,5 kg de lest/)
    expect(lecture).toHaveAttribute('aria-live', 'polite')
    // 35,5 / 41,5 = 86 % du record : la poutre se détend, l'étiquette suit.
    expect(screen.getByText('35,5 kg de lest · 86 % du record')).toBeInTheDocument()

    fireEvent.keyDown(courbe, { key: 'Escape' })
    expect(screen.getByText(/Survole la courbe/)).toBeInTheDocument()
  })

  it('compare au maximum de la période pour les autres grandeurs', async () => {
    servir(TROIS_SEANCES)
    rendre(<AnalyseLigneDeCharge />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })

    fireEvent.click(screen.getByRole('radio', { name: 'Tonnage' }))

    expect(screen.getByRole('radio', { name: 'Tonnage' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/Tonnage · kg/)).toBeInTheDocument()
    expect(await screen.findByText(/2\D?200 kg · 100 % du maximum/)).toBeInTheDocument()
  })

  it('change d’exercice et de période', async () => {
    servir(TROIS_SEANCES)
    rendre(<AnalyseLigneDeCharge />)
    await screen.findAllByText('+41,5 kg', { selector: 'dd' })

    fireEvent.click(screen.getByRole('radio', { name: 'Dips' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Mois' }))

    expect(screen.getByRole('radio', { name: 'Dips' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Mois' })).toHaveAttribute('aria-checked', 'true')
  })

  it('explique l’absence de données', async () => {
    servir(() => Response.json([]))
    rendre(<AnalyseLigneDeCharge />)

    expect(await screen.findByText(/Pas encore de données pour ce choix/)).toBeInTheDocument()
    expect(screen.getAllByText('—', { selector: 'dd' }).length).toBe(3)
    expect(screen.queryByRole('group', { name: /Courbe/ })).not.toBeInTheDocument()
  })

  it('annonce l’erreur de la courbe', async () => {
    servir(() => Response.json({ detail: 'Panne.' }, { status: 500 }))
    rendre(<AnalyseLigneDeCharge />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('annonce l’erreur de la liste des exercices', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ detail: 'Panne.' }, { status: 500 }))
    rendre(<AnalyseLigneDeCharge />)

    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0)
  })
})
