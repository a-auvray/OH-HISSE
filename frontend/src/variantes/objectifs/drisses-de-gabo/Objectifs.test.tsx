import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ObjectifLu } from '../../../api/types'
import { isoLocal } from '../../../commun/format'
import { rendre } from '../../../test/rendu'
import { ObjectifsDrisses } from './Objectifs'

function objectif(surcharge: Partial<ObjectifLu> & Pick<ObjectifLu, 'id' | 'titre'>): ObjectifLu {
  return {
    type: 'max',
    exercice_id: 1,
    exercice: 'Tractions',
    valeur_cible_kg: 50,
    date_cible: '2027-03-15',
    principal: false,
    statut: 'en_cours',
    jours_restants: 112,
    blocs: [],
    progression: { e1rm_lest_kg: 41.5, le: '2026-11-21', pourcentage: 83, cible_atteinte: false },
    ...surcharge,
  }
}

const TRACTION = objectif({
  id: 1,
  titre: 'Traction +50 kg',
  principal: true,
  blocs: [{ id: 9, nom: 'Force' }],
})
const DIPS = objectif({
  id: 2,
  titre: 'Dips +70 kg',
  exercice_id: 2,
  exercice: 'Dips',
  valeur_cible_kg: 70,
  progression: { e1rm_lest_kg: 49.7, le: '2026-11-21', pourcentage: 71, cible_atteinte: false },
})
const ATTEINT = objectif({ id: 3, titre: 'Muscle-up +10 kg', statut: 'atteint', valeur_cible_kg: 10 })
const DETENDU = objectif({ id: 4, titre: 'Squat +80 kg', statut: 'abandonne', valeur_cible_kg: 80 })

/** Quatre séances à une semaine d'écart, +0,5 kg par semaine, la dernière aujourd'hui : la pente réelle vaut +0,5. */
function seances() {
  return [21, 14, 7, 0].map((age, i) => {
    const jour = new Date()
    jour.setDate(jour.getDate() - age)
    return {
      seance_id: i + 1,
      date: isoLocal(jour),
      e1rm_lest_kg: 40 + i * 0.5,
      e1rm_total_kg: null,
      tonnage_kg: 0,
      series: 3,
      reps: 5,
      rpe_moyen: null,
      poids_du_corps_kg: null,
    }
  })
}

interface Appel {
  url: string
  methode: string
  corps: unknown
}

/** Un petit serveur en mémoire : les écritures changent ce que les lectures suivantes renvoient, comme la vraie API. */
function simuler(depart: ObjectifLu[], { evolutions = true }: { evolutions?: boolean } = {}) {
  let objectifs = depart.map((o) => ({ ...o }))
  const appels: Appel[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
    const r = requete instanceof Request ? requete : new Request(String(requete))
    const corps: unknown =
      r.method === 'GET'
        ? null
        : await r
            .clone()
            .json()
            .catch(() => null)
    appels.push({ url: r.url, methode: r.method, corps })
    const id = Number(/\/objectifs\/(\d+)/.exec(r.url)?.[1])
    if (r.method === 'PATCH') {
      objectifs = objectifs.map((o) => (o.id === id ? { ...o, ...(corps as Pick<ObjectifLu, 'statut'>) } : o))
      return Response.json({})
    }
    if (r.method === 'PUT') {
      objectifs = objectifs.map((o) => ({ ...o, principal: o.id === id }))
      return Response.json({})
    }
    if (r.method === 'DELETE') {
      objectifs = objectifs.filter((o) => o.id !== id)
      return Response.json({})
    }
    if (r.method !== 'GET') return Response.json({})
    if (r.url.includes('/evolution/')) return Response.json(evolutions ? seances() : [])
    if (r.url.includes('/exercices'))
      return Response.json([
        { id: 1, nom: 'Tractions' },
        { id: 2, nom: 'Dips' },
      ])
    return Response.json(objectifs)
  })
  return appels
}

const meter = (nom: string) => screen.getByRole('meter', { name: nom })

beforeEach(() => {
  // jsdom n'a pas de canvas 2D : la sculpture se tait, ce que ces tests n'ont pas à regarder.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  document.documentElement.dataset.animations = 'immobile'
  localStorage.clear()
})

describe('Objectifs, variante Drisses de Gabo', () => {
  it('annonce le chargement', () => {
    simuler([TRACTION])
    rendre(<ObjectifsDrisses />)
    expect(screen.getByText('Les drisses se tendent…')).toBeInTheDocument()
  })

  it('met le principal en lecture, avec la décision du jour calculée', async () => {
    simuler([TRACTION, DIPS])
    rendre(<ObjectifsDrisses />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })).toBeInTheDocument()
    const fiche = screen.getByRole('region', { name: 'Objectif principal' })
    // (50 − 41,5) / 16 semaines, et la pente des quatre dernières semaines.
    await waitFor(() => expect(within(fiche).getByText('+0,53')).toBeInTheDocument())
    expect(within(fiche).getByText('+0,5')).toBeInTheDocument()
    expect(within(fiche).getByText('il faut')).toBeInTheDocument()
    expect(within(fiche).getByText('tu fais')).toBeInTheDocument()
    expect(within(fiche).getByText('En retard')).toBeInTheDocument()
    expect(within(fiche).getByText('J−112', { selector: 'strong' })).toBeInTheDocument()
    expect(within(fiche).getByRole('link', { name: 'Force' })).toHaveAttribute('href', '/streetlifting/blocs')
    expect(within(fiche).getByText('Tractions')).toBeInTheDocument()
  })

  it('dit « données insuffisantes » plutôt que de deviner une pente', async () => {
    simuler([TRACTION], { evolutions: false })
    rendre(<ObjectifsDrisses />)

    expect(await screen.findByText('pente : données insuffisantes', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByText('En retard', { selector: 'span' })).not.toBeInTheDocument()
    expect(screen.queryByText('tu fais')).not.toBeInTheDocument()
  })

  it('porte la sculpture et une drisse par autre objectif, chacune avec tout son texte', async () => {
    simuler([TRACTION, DIPS])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    const sculpture = meter('Traction +50 kg')
    expect(sculpture).toHaveAttribute('aria-valuemin', '0')
    expect(sculpture).toHaveAttribute('aria-valuemax', '50')
    expect(sculpture).toHaveAttribute('aria-valuenow', '41.5')
    expect(sculpture).toHaveAttribute('aria-valuetext', expect.stringContaining('83 %'))
    expect(sculpture).toHaveAttribute('tabindex', '0')

    const drisse = meter('Dips +70 kg')
    expect(drisse).toHaveAttribute('aria-valuemax', '70')
    expect(drisse).toHaveAttribute('aria-valuenow', '49.7')
    expect(drisse).toHaveAttribute('aria-valuetext', expect.stringContaining('71 %'))
    expect(drisse).toHaveAttribute('aria-valuetext', expect.stringContaining('+49,7 / 70 kg'))
    expect(drisse).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('button', { name: 'Dips +70 kg' })).toBeInTheDocument()
  })

  it('ouvre la fiche d’une drisse au clic', async () => {
    simuler([TRACTION, DIPS])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    fireEvent.click(screen.getByRole('button', { name: 'Dips +70 kg' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Dips +70 kg' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Objectif' })).toBeInTheDocument()
    // Le principal prend alors la place de la drisse.
    expect(screen.getByRole('button', { name: 'Traction +50 kg' })).toBeInTheDocument()
  })

  it('ouvre la fiche d’une drisse à Entrée, et n’y réagit pas à Espace (qui la pince)', async () => {
    simuler([TRACTION, DIPS])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    fireEvent.keyDown(meter('Dips +70 kg'), { key: ' ' })
    expect(screen.getByRole('heading', { level: 2, name: 'Traction +50 kg' })).toBeInTheDocument()
    fireEvent.keyDown(meter('Dips +70 kg'), { key: 'Enter' })
    expect(screen.getByRole('heading', { level: 2, name: 'Dips +70 kg' })).toBeInTheDocument()
  })

  it('passe d’une drisse à l’autre avec les flèches', async () => {
    simuler([TRACTION, DIPS])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    meter('Traction +50 kg').focus()
    fireEvent.keyDown(meter('Traction +50 kg'), { key: 'ArrowRight' })
    expect(meter('Dips +70 kg')).toHaveFocus()
    fireEvent.keyDown(meter('Dips +70 kg'), { key: 'ArrowLeft' })
    expect(meter('Traction +50 kg')).toHaveFocus()
  })

  it('marque l’objectif atteint et l’annonce', async () => {
    const appels = simuler([TRACTION, DIPS])
    rendre(<ObjectifsDrisses />)
    fireEvent.click(await screen.findByRole('button', { name: 'Marquer atteint' }))

    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'PATCH' && a.url.includes('/1/statut'))).toBe(true),
    )
    expect(appels.find((a) => a.methode === 'PATCH')?.corps).toEqual({ statut: 'atteint' })
    expect(screen.getByText('Objectif verrouillé : Traction +50 kg')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Atteints/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('abandonne un objectif et l’annonce détendu, d’où on peut le reprendre', async () => {
    const appels = simuler([TRACTION])
    rendre(<ObjectifsDrisses />)
    fireEvent.click(await screen.findByRole('button', { name: 'Abandonner' }))

    await waitFor(() => expect(appels.some((a) => a.methode === 'PATCH')).toBe(true))
    expect(appels.find((a) => a.methode === 'PATCH')?.corps).toEqual({ statut: 'abandonne' })
    expect(screen.getByText('Objectif détendu : Traction +50 kg')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Détendus/ })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('button', { name: 'Reprendre' })).toBeInTheDocument()
  })

  it('reprend un objectif détendu', async () => {
    const appels = simuler([DETENDU])
    rendre(<ObjectifsDrisses />)
    fireEvent.keyDown(document.body, { key: '3' })
    fireEvent.click(await screen.findByRole('button', { name: 'Reprendre' }))

    await waitFor(() => expect(appels.some((a) => a.methode === 'PATCH')).toBe(true))
    expect(appels.find((a) => a.methode === 'PATCH')?.corps).toEqual({ statut: 'en_cours' })
    expect(screen.getByText('Objectif repris : Squat +80 kg')).toBeInTheDocument()
  })

  it('met en avant un objectif secondaire', async () => {
    const appels = simuler([TRACTION, DIPS])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })
    fireEvent.click(screen.getByRole('button', { name: 'Dips +70 kg' }))

    fireEvent.click(screen.getByRole('button', { name: 'Mettre en avant' }))
    await waitFor(() => expect(appels.some((a) => a.methode === 'PUT' && a.url.includes('/2'))).toBe(true))
    expect(appels.find((a) => a.methode === 'PUT')?.corps).toMatchObject({
      principal: true,
      titre: 'Dips +70 kg',
    })
    expect(screen.getByText('Objectif mis en avant : Dips +70 kg')).toBeInTheDocument()
    // Rechargé, il devient l'objectif principal.
    expect(await screen.findByRole('region', { name: 'Objectif principal' })).toBeInTheDocument()
  })

  it('supprime un objectif secondaire', async () => {
    const appels = simuler([TRACTION, DIPS])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })
    fireEvent.click(screen.getByRole('button', { name: 'Dips +70 kg' }))

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(appels.some((a) => a.methode === 'DELETE' && a.url.includes('/2'))).toBe(true))
    expect(screen.getByText('Objectif supprimé : Dips +70 kg')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('meter', { name: 'Dips +70 kg' })).not.toBeInTheDocument())
  })

  it('ne propose ni mise en avant ni suppression pour l’objectif principal', async () => {
    simuler([TRACTION])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    expect(screen.queryByRole('button', { name: 'Mettre en avant' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument()
  })

  it('crée un objectif depuis le formulaire', async () => {
    const appels = simuler([TRACTION])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    fireEvent.click(screen.getByRole('button', { name: 'Tendre une corde' }))
    expect(screen.getByRole('button', { name: 'Fermer' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.change(await screen.findByLabelText('Intitulé'), { target: { value: 'Muscle-up +10 kg' } })
    fireEvent.change(screen.getByLabelText(/Cible/), { target: { value: '10,5' } })
    fireEvent.change(screen.getByLabelText('Date cible'), { target: { value: '2027-06-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fixer cet objectif' }))

    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'POST' && a.url.endsWith('/api/objectifs'))).toBe(true),
    )
    expect(appels.find((a) => a.methode === 'POST')?.corps).toMatchObject({
      titre: 'Muscle-up +10 kg',
      valeur_cible_kg: 10.5,
      date_cible: '2027-06-01',
      type: 'max',
    })
    // Une fois créé, le formulaire se referme.
    await waitFor(() =>
      expect(screen.queryByRole('form', { name: 'Tendre une corde' })).not.toBeInTheDocument(),
    )
  })

  it('ouvre le formulaire avec la touche N, et ne change pas d’onglet depuis un champ de saisie', async () => {
    simuler([TRACTION, ATTEINT])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    fireEvent.keyDown(document.body, { key: 'n' })
    const champ = await screen.findByLabelText('Intitulé')
    expect(champ).toHaveFocus()
    fireEvent.keyDown(champ, { key: '2' })
    expect(screen.getByRole('tab', { name: /En cours/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('range les objectifs dans trois onglets, aux touches 1 à 3', async () => {
    simuler([TRACTION, ATTEINT, DETENDU])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    fireEvent.keyDown(document.body, { key: '2' })
    expect(await screen.findByRole('heading', { level: 2, name: 'Muscle-up +10 kg' })).toBeInTheDocument()
    expect(screen.getByText('Verrouillé', { selector: 'span' })).toBeInTheDocument()

    fireEvent.keyDown(document.body, { key: '3' })
    expect(await screen.findByRole('heading', { level: 2, name: 'Squat +80 kg' })).toBeInTheDocument()
    expect(screen.getByText('Détendu', { selector: 'span' })).toBeInTheDocument()

    fireEvent.keyDown(document.body, { key: '1' })
    expect(await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })).toBeInTheDocument()
  })

  it('se déplace dans les onglets avec les flèches', async () => {
    simuler([TRACTION, ATTEINT])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    fireEvent.keyDown(screen.getByRole('tab', { name: /En cours/ }), { key: 'ArrowDown' })
    expect(screen.getByRole('tab', { name: /Atteints/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'drisses-onglet-atteints')
  })

  it('invite à tendre une première corde quand il n’y a rien', async () => {
    simuler([])
    rendre(<ObjectifsDrisses />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Aucune corde tendue.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon premier objectif' }))
    expect(await screen.findByLabelText('Intitulé')).toBeInTheDocument()
    // Le premier objectif est d'office le principal.
    expect(screen.getByRole('checkbox', { name: /Objectif principal/ })).toBeChecked()
  })

  it('dit ce que contient un onglet vide', async () => {
    simuler([TRACTION])
    rendre(<ObjectifsDrisses />)
    await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })

    fireEvent.keyDown(document.body, { key: '2' })
    expect(await screen.findByText(/Aucun objectif atteint/)).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: '3' })
    expect(await screen.findByText(/Aucun objectif détendu/)).toBeInTheDocument()
  })

  it('affiche l’erreur du serveur en alerte', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json({ detail: 'Service indisponible.' }, { status: 500 }),
    )
    rendre(<ObjectifsDrisses />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Service indisponible.')
    expect(screen.queryByRole('heading', { name: 'Aucune corde tendue.' })).not.toBeInTheDocument()
  })

  it.each(['cinema', 'sobre', 'immobile'])('reste complète en animation « %s »', async (niveau) => {
    document.documentElement.dataset.animations = niveau
    simuler([TRACTION, DIPS])
    rendre(<ObjectifsDrisses />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })).toBeInTheDocument()
    expect(meter('Dips +70 kg')).toBeInTheDocument()
    // Les décors sont cachés des lecteurs d'écran : l'information est en texte.
    const decors = document.querySelectorAll('canvas, svg')
    expect(decors.length).toBeGreaterThan(0)
    for (const decor of decors) expect(decor).toHaveAttribute('aria-hidden', 'true')
  })
})
