import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rendre } from '../../../test/rendu'
import { SeanceDuJourBanc } from './SeanceDuJour'

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

const point = (date: string, lest: number | null, total: number | null) => ({
  seance_id: 1,
  date,
  e1rm_lest_kg: lest,
  e1rm_total_kg: total,
  tonnage_kg: 2000,
  series: 4,
  reps: 12,
  rpe_moyen: 8,
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
  progression: null,
  blocs: [],
}

function simuler(seance: unknown = SEANCE, evolutions: Record<string, unknown[]> = {}) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
    const url = requete instanceof Request ? requete.url : String(requete)
    if (url.includes('/seance-du-jour')) return Response.json(seance)
    if (url.includes('/api/objectifs')) return Response.json([OBJECTIF])
    const id = /\/evolution\/(\d+)/.exec(url)?.[1]
    if (id) return Response.json(evolutions[id] ?? [])
    return new Response('introuvable', { status: 404 })
  })
}

const EVOLUTIONS = {
  '1': [point('2026-11-04', 35.5, 109.7), point('2026-11-21', 41.5, 115.7)],
  '2': [point('2026-11-10', 10, 84.2)],
}

describe('Séance du jour, variante Banc d’essai', () => {
  beforeEach(() => simuler(SEANCE, EVOLUTIONS))

  it('titre le procès-verbal d’après le bloc et montre l’avancement', async () => {
    rendre(<SeanceDuJourBanc />)

    expect(await screen.findByRole('heading', { level: 1, name: /Force · S3\/12/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'A — Tirage lourd' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avancement du bloc' })).toHaveAttribute(
      'aria-valuenow',
      '3',
    )
    expect(screen.getByText('74,2 kg')).toBeInTheDocument()
  })

  it('calcule l’intensité du jour à partir des séries et des 1RM, et la met sur une réglette', async () => {
    rendre(<SeanceDuJourBanc />)

    // Traction : 106,7 / 115,7 ; Muscle-up au poids du corps : 74,2 / 84,2 ; Dips : 5 reps à RPE 8 = 81,1 % (table).
    const attendu = Math.round(((4 * (106.7 / 115.7) + 5 * (74.2 / 84.2) + 4 * 0.811) / 13) * 100)
    expect(await screen.findByText(`Intensité ${attendu} % e1RM`)).toBeInTheDocument()
    const reglette = screen.getByRole('meter', { name: 'Intensité du jour' })
    expect(reglette).toHaveAttribute('aria-valuenow', String(attendu))
    expect(reglette).toHaveAttribute('aria-valuetext', `${attendu} % du 1RM estimé`)
  })

  it('met un bloc par série, avec son RPE en chiffre', async () => {
    rendre(<SeanceDuJourBanc />)
    await screen.findByRole('heading', { level: 3, name: 'Traction' })

    const quatre = screen.getAllByLabelText('4 séries prévues')
    expect(quatre).toHaveLength(2)
    expect(within(quatre[0] as HTMLElement).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByLabelText('5 séries prévues').children).toHaveLength(5)
    expect(
      within(quatre[0] as HTMLElement).getAllByText('8', { selector: 'span[aria-hidden]' }),
    ).toHaveLength(4)
    // La hauteur d'un bloc est l'intensité de la série : 106,7 / 115,7, une fois le 1RM de l'exercice lu.
    await waitFor(() => {
      const premier = screen.getAllByLabelText('4 séries prévues')[0]?.firstElementChild
      expect(premier).toBeInstanceOf(HTMLElement)
      expect((premier as HTMLElement).style.getPropertyValue('--hauteur')).toBe(String(106.7 / 115.7))
    })
    expect(screen.getByText(/4×3 @ \+32,5 kg · RPE cible 8/)).toBeInTheDocument()
    expect(screen.getByText(/5×2 @ PDC/)).toBeInTheDocument()
    expect(screen.getByText(/4×5 · charge à choisir/)).toBeInTheDocument()
  })

  it('donne la justification de l’algorithme sous la rangée', async () => {
    rendre(<SeanceDuJourBanc />)

    expect(await screen.findByText('+2,5 kg depuis mardi')).toBeVisible()
  })

  it('trace la courbe caractéristique de l’exercice, sa limite et la limite visée', async () => {
    rendre(<SeanceDuJourBanc />)

    const courbe = await screen.findByRole('group', { name: /Courbe caractéristique de Traction/ })
    expect(courbe).toBeInTheDocument()
    expect(screen.getByText('Limite : +41,5 kg en lest (115,7 kg au total).')).toBeInTheDocument()
    expect(screen.getByText('Reste 8,5 kg avant la limite visée de +50 kg.')).toBeInTheDocument()
    expect(document.querySelector('svg text')?.textContent).toBeTruthy()
    expect(screen.getByText('LIMITE VISÉE +50 kg')).toBeInTheDocument()
    expect(screen.getByText('+41,5 kg', { selector: 'text' })).toBeInTheDocument()
  })

  it('lit la courbe au clavier, par demi-points d’effort', async () => {
    rendre(<SeanceDuJourBanc />)
    const courbe = await screen.findByRole('group', { name: /Courbe caractéristique de Traction/ })

    courbe.focus()
    fireEvent.keyDown(courbe, { key: 'ArrowRight' })
    // On part de 12 d'effort : 11,5 reps éq. est le premier cran vers la limite.
    expect(screen.getByText(/^11,5 reps éq\. · /)).toBeInTheDocument()
    fireEvent.keyDown(courbe, { key: 'Escape' })
    expect(screen.getByText(/^Limite : /)).toBeInTheDocument()
  })

  it('change de courbe quand on choisit un autre exercice', async () => {
    rendre(<SeanceDuJourBanc />)
    await screen.findByRole('group', { name: /Courbe caractéristique de Traction/ })

    const bouton = screen.getByRole('button', { name: 'Voir la courbe de Muscle-up' })
    expect(bouton).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(bouton)

    expect(
      await screen.findByRole('group', { name: /Courbe caractéristique de Muscle-up/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voir la courbe de Muscle-up' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Limite : +10 kg en lest (84,2 kg au total).')).toBeInTheDocument()
  })

  it('dit quand la limite d’un exercice est inconnue', async () => {
    rendre(<SeanceDuJourBanc />)
    await screen.findByRole('group', { name: /Courbe caractéristique de Traction/ })

    fireEvent.click(screen.getByRole('button', { name: 'Voir la courbe de Dips' }))

    expect(await screen.findByText(/La limite de l’éprouvette n’est pas encore connue/)).toBeInTheDocument()
    expect(screen.getAllByText(/Pas encore de 1RM estimé/).length).toBeGreaterThan(0)
  })

  it('rappelle la forme du jour et propose de commencer', async () => {
    rendre(<SeanceDuJourBanc />)

    expect(await screen.findByRole('note')).toHaveTextContent('Récupération incomplète')
    expect(screen.getByRole('link', { name: /Voir ma récupération/ })).toHaveAttribute(
      'href',
      '/vie-courante',
    )
    expect(screen.getByRole('button', { name: /Commencer la séance/ })).toBeInTheDocument()
  })

  it('propose la pesée rapide quand le poids est périmé', async () => {
    simuler({ ...SEANCE, poids: { kg: 74.2, a_jour: false } }, EVOLUTIONS)
    rendre(<SeanceDuJourBanc />)

    expect(await screen.findByText('Ta dernière pesée date de plus de trois semaines.')).toBeInTheDocument()
    expect(screen.getByText(/pesée à refaire/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Poids du jour/ })).toBeInTheDocument()
  })

  it('reste utile quand l’historique d’un exercice ne se lit pas', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
      const url = requete instanceof Request ? requete.url : String(requete)
      if (url.includes('/seance-du-jour')) return Response.json(SEANCE)
      if (url.includes('/api/objectifs')) return Response.json([])
      return Response.json({ detail: 'Panne' }, { status: 500 })
    })
    rendre(<SeanceDuJourBanc />)

    expect(await screen.findByRole('heading', { level: 3, name: 'Traction' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText(/La limite de l’éprouvette n’est pas encore connue/)).toBeInTheDocument(),
    )
    // Les blocs gardent la hauteur de la table RPE.
    expect(screen.getAllByLabelText('4 séries prévues')[0]?.children).toHaveLength(4)
  })

  it('invite à importer un bloc quand il n’y en a pas', async () => {
    simuler({ bloc: null, nom: null, poids: null, propositions: [], message: 'Aucun bloc actif.' })
    rendre(<SeanceDuJourBanc />)

    expect(await screen.findByRole('heading', { name: 'Pas de bloc en cours' })).toBeInTheDocument()
    expect(screen.getByText('Aucun bloc actif.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Importer un bloc' })).toHaveAttribute(
      'href',
      '/streetlifting/blocs',
    )
    expect(screen.getByRole('link', { name: 'Saisir une séance libre' })).toHaveAttribute(
      'href',
      '/streetlifting/saisie',
    )
  })

  it('annonce le chargement puis l’erreur', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ detail: 'Base indisponible.' }, { status: 500 }),
    )
    rendre(<SeanceDuJourBanc />)

    expect(screen.getByRole('status')).toHaveTextContent('Calcul de la séance…')
    expect(await screen.findByRole('alert')).toHaveTextContent('Base indisponible.')
  })
})
