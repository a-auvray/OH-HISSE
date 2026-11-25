import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { rendre } from '../../../test/rendu'
import { SeanceDuJourLigneDeCharge } from './SeanceDuJour'

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

const point = (id: number, date: string, lest: number, total: number) => ({
  seance_id: id,
  date,
  e1rm_lest_kg: lest,
  e1rm_total_kg: total,
  tonnage_kg: 2000,
  series: 4,
  reps: 12,
  rpe_moyen: 8,
  poids_du_corps_kg: 74.2,
})

const EVOLUTIONS: Record<string, unknown[]> = {
  '1': [point(1, '2026-10-20', 38, 112.2), point(2, '2026-11-21', 41.5, 115.7)],
  '2': [point(3, '2026-11-02', 8, 82.2), point(4, '2026-11-20', 12, 86.2)],
}

const OBJECTIFS = [
  {
    id: 7,
    titre: 'Traction +50 kg',
    type: 'max',
    exercice_id: 1,
    exercice: 'Traction',
    valeur_cible_kg: 50,
    date_cible: '2027-03-15',
    principal: true,
    statut: 'en_cours',
    jours_restants: 112,
    progression: { e1rm_lest_kg: 41.5, le: '2026-11-21', pourcentage: 64, cible_atteinte: false },
    blocs: [],
  },
]

/** Une réponse par adresse de l'API, comme le ferait le serveur. */
function servir(seance: unknown = SEANCE, { evolutionsEnPanne = false } = {}) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
    const url = requete instanceof Request ? requete.url : String(requete)
    if (url.includes('/seance-du-jour')) return Response.json(seance)
    if (url.includes('/api/objectifs')) return Response.json(OBJECTIFS)
    const evolution = /\/evolution\/(\d+)/.exec(url)
    if (evolution) {
      if (evolutionsEnPanne) return Response.json({ detail: 'Panne.' }, { status: 500 })
      return Response.json(EVOLUTIONS[evolution[1] ?? ''] ?? [])
    }
    return Response.json({ detail: 'Introuvable.' }, { status: 404 })
  })
}

describe('Séance du jour, « Ligne de charge »', () => {
  beforeEach(() => {
    // jsdom ne mesure rien : une largeur fixe fait apparaître la poutre. « Immobile » : les chiffres sont tout de suite à leur valeur.
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

  it('attend la séance puis montre le bloc, l’avancement et le nom', async () => {
    servir()
    rendre(<SeanceDuJourLigneDeCharge />)

    expect(screen.getByText('Calcul de la séance…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'A — Tirage lourd' })).toBeInTheDocument()
    expect(screen.getByText(/Force · séance 3 \/ 12/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avancement du bloc' })).toHaveAttribute(
      'aria-valuenow',
      '3',
    )
    expect(screen.getByText('Force — cap 55 kg')).toBeInTheDocument()
    expect(screen.getAllByText('74,2 kg').length).toBeGreaterThan(0)
  })

  it('met en héros la charge du premier exercice et dit sa flèche en texte', async () => {
    servir()
    rendre(<SeanceDuJourLigneDeCharge />)

    expect(await screen.findByText('Lest de 32,5 kg')).toBeInTheDocument()
    expect(screen.getByText('Traction · 4×3 · RPE 8')).toBeInTheDocument()
    expect(screen.getByLabelText('4 séries à faire').children).toHaveLength(4)
    expect(screen.getByText('+2,5 kg depuis mardi')).toBeInTheDocument()
    // Le record (e1RM total 115,7) vient de l'historique : la phrase n'apparaît qu'une fois lu.
    expect(
      await screen.findByText('Traction : charge totale 106,7 kg, 92 % de ton record estimé.'),
    ).toBeInTheDocument()
    // La poutre dit la même chose à l'œil : l'étiquette du point bas.
    expect(await screen.findByText('106,7 kg · 92 % du record')).toBeInTheDocument()
  })

  it('pend chaque exercice à son pourcentage d’e1RM, dans l’ordre d’exécution', async () => {
    servir()
    rendre(<SeanceDuJourLigneDeCharge />)

    const liste = await screen.findByRole('list', { name: /dans l’ordre d’exécution/ })
    const lignes = within(liste).getAllByRole('listitem')
    expect(lignes).toHaveLength(3)
    expect(await within(lignes[0] as HTMLElement).findByText('92 % de l’e1RM')).toBeInTheDocument()
    expect(await within(lignes[1] as HTMLElement).findByText('86 % de l’e1RM')).toBeInTheDocument()
    expect(within(lignes[1] as HTMLElement).getByText('PDC')).toBeInTheDocument()
    expect(within(lignes[2] as HTMLElement).getByText('charge à choisir')).toBeInTheDocument()
    expect(within(lignes[2] as HTMLElement).getByText('À choisir')).toBeInTheDocument()
  })

  it('trace la cible de l’objectif et mène à l’espace Objectifs', async () => {
    servir()
    rendre(<SeanceDuJourLigneDeCharge />)

    const lien = await screen.findByRole('link', { name: /Objectifs : Traction, cible \+50 kg, 107 %/ })
    expect(lien).toHaveAttribute('href', '/objectifs')
    expect(lien).toHaveTextContent('Cible +50 kg · 107 %')
    expect(lien).toHaveTextContent('64 % du chemin · J−112')
  })

  it('met en héros l’exercice qu’on choisit', async () => {
    servir()
    rendre(<SeanceDuJourLigneDeCharge />)
    await screen.findByText('Lest de 32,5 kg')

    fireEvent.click(screen.getByRole('button', { name: /Muscle-up/ }))

    expect(screen.getByText('Poids du corps', { selector: 'span.sr-only' })).toBeInTheDocument()
    expect(screen.getByText('Muscle-up · 5×2 · RPE 7')).toBeInTheDocument()
    expect(screen.getByLabelText('5 séries à faire').children).toHaveLength(5)
    expect(screen.getByRole('button', { name: /Muscle-up/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Traction/ })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: /Dips/ }))
    expect(screen.getByText('Charge à choisir')).toBeInTheDocument()
    expect(screen.getByText('Dips : charge totale inconnue, la ligne reste à plat.')).toBeInTheDocument()
  })

  it('rappelle la forme du jour et propose de commencer', async () => {
    servir()
    rendre(<SeanceDuJourLigneDeCharge />)

    expect(await screen.findByRole('note')).toHaveTextContent('Récupération incomplète')
    expect(screen.getByRole('link', { name: 'Voir ma récupération →' })).toHaveAttribute(
      'href',
      '/vie-courante',
    )
    expect(screen.getByRole('button', { name: 'Commencer la séance →' })).toBeInTheDocument()
  })

  it('demande la pesée quand elle manque, et ne devine aucune charge', async () => {
    servir({ ...SEANCE, poids: null })
    rendre(<SeanceDuJourLigneDeCharge />)

    expect(
      await screen.findByText('Sans ton poids, les charges ne peuvent pas être calculées.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Poids du jour en kg/ })).toBeInTheDocument()
    expect(screen.getByText('Traction : charge totale inconnue, la ligne reste à plat.')).toBeInTheDocument()
  })

  it('signale une pesée trop ancienne', async () => {
    servir({ ...SEANCE, poids: { kg: 74.2, a_jour: false } })
    rendre(<SeanceDuJourLigneDeCharge />)

    expect(await screen.findByText('pesée à refaire')).toBeInTheDocument()
    expect(screen.getByText('Ta dernière pesée date de plus de trois semaines.')).toBeInTheDocument()
  })

  it('le dit quand l’historique ne se lit pas, sans cacher la séance', async () => {
    servir(SEANCE, { evolutionsEnPanne: true })
    rendre(<SeanceDuJourLigneDeCharge />)

    expect(await screen.findByRole('status')).toHaveTextContent('n’a pas pu être lue')
    expect(screen.getByRole('heading', { level: 1, name: 'A — Tirage lourd' })).toBeInTheDocument()
    expect(screen.getAllByText('pas encore d’e1RM').length).toBeGreaterThan(0)
  })

  it('invite à importer un bloc quand il n’y en a pas', async () => {
    servir({ bloc: null, nom: null, poids: null, propositions: [], message: 'Aucun bloc actif.' })
    rendre(<SeanceDuJourLigneDeCharge />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Pas de bloc en cours' })).toBeInTheDocument()
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

  it('annonce l’erreur du serveur', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ detail: 'Panne.' }, { status: 500 }))
    rendre(<SeanceDuJourLigneDeCharge />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
