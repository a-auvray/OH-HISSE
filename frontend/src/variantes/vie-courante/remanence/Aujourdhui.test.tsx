import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { aujourdhui, depuisIso, isoLocal } from '../../../commun/format'
import { rendre } from '../../../test/rendu'
import { AujourdhuiRemanence } from './Aujourdhui'
import { brancherFauxContexte } from './faussesToiles'
import vues from './index'

/** Le jour décalé de `n` jours par rapport à aujourd'hui, au format ISO local. */
function jourDecale(n: number) {
  const d = depuisIso(aujourdhui())
  d.setDate(d.getDate() + n)
  return isoLocal(d)
}

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

const NUITS = [
  { id: 1, date: jourDecale(-3), heures: 6.5, qualite: 3 },
  { id: 2, date: jourDecale(-2), heures: 8, qualite: 5 },
  { id: 3, date: jourDecale(-1), heures: 5.5, qualite: 1 },
  { id: 4, date: jourDecale(0), heures: 7.2, qualite: 4 },
]

const PESEES = [
  { id: 1, date: jourDecale(-21), poids_kg: 74.8 },
  { id: 2, date: jourDecale(-14), poids_kg: 74.5 },
  { id: 3, date: jourDecale(-7), poids_kg: 74.6 },
  { id: 4, date: jourDecale(0), poids_kg: 74.2 },
]

interface Appel {
  url: string
  methode: string
  corps: unknown
}

describe('Aujourd’hui, variante Rémanence', () => {
  let appels: Appel[]
  /** Les réponses de chaque lecture, que chaque test peut remplacer. */
  let reponses: {
    etat: () => Response
    nuits: () => Response
    pesees: () => Response
    ecriture: () => Response
  }

  beforeEach(() => {
    document.documentElement.dataset.animations = 'immobile'
    // jsdom n'a pas de canvas : un faux contexte laisse les dessins s'exécuter sans bruit.
    brancherFauxContexte()
    appels = []
    reponses = {
      etat: () => Response.json(ETAT),
      nuits: () => Response.json(NUITS),
      pesees: () => Response.json(PESEES),
      ecriture: () => Response.json({}),
    }
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
      const r = requete instanceof Request ? requete : new Request(String(requete))
      const texte = r.method === 'GET' ? '' : await r.text()
      appels.push({ url: r.url, methode: r.method, corps: texte ? (JSON.parse(texte) as unknown) : null })
      if (r.method !== 'GET') return reponses.ecriture()
      if (r.url.includes('/vie-courante/etat')) return reponses.etat()
      if (r.url.includes('/vie-courante/nuits')) return reponses.nuits()
      if (r.url.includes('/vie-courante/pesees')) return reponses.pesees()
      return Response.json({}, { status: 404 })
    })
  })

  afterEach(() => {
    delete document.documentElement.dataset.animations
  })

  it('est la vue « Aujourdhui » que la variante donne', () => {
    expect(vues.Aujourdhui).toBe(AujourdhuiRemanence)
  })

  it('attend les données avant de se montrer', async () => {
    rendre(<AujourdhuiRemanence />)
    expect(screen.getByText('Un instant…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('dit l’erreur quand l’état du jour ne vient pas', async () => {
    reponses.etat = () => Response.json({ detail: 'Base indisponible.' }, { status: 500 })
    rendre(<AujourdhuiRemanence />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('écrit la nuit en mots, avec le chiffre et l’écart à la moyenne à côté', async () => {
    rendre(<AujourdhuiRemanence />)

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Sept heures et quart.')
    expect(screen.getByText('7 h 12 · +18 min vs moy. 7 j (6 h 54)')).toBeInTheDocument()
  })

  it('invite à imprimer la nuit quand elle n’est pas encore notée', async () => {
    reponses.nuits = () => Response.json([])
    reponses.etat = () =>
      Response.json({ ...ETAT, sommeil: { derniere_nuit_h: null, moyenne_h: null, nuits_comptees: 0 } })
    rendre(<AujourdhuiRemanence />)

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Imprime ta nuit.')
    expect(screen.getAllByText('Aucune nuit notée cette semaine.').length).toBeGreaterThan(0)
    // Les sept créneaux existent quand même : un bouton par jour, tous « non notés ».
    const nuits = within(screen.getByRole('group', { name: 'Les sept dernières nuits' })).getAllByRole(
      'button',
    )
    expect(nuits).toHaveLength(7)
    // Six créneaux sans nuit, et celui du jour, proposé en contour : jamais pris pour une mesure.
    for (const n of nuits.slice(0, 6)) expect(n).toHaveAccessibleName(/nuit non notée/)
    expect(nuits[6]).toHaveAccessibleName(/nuit à imprimer, 7 h proposées/)
  })

  it('donne à chaque empreinte un nom lisible, du plus ancien au plus récent', async () => {
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    const nuits = within(screen.getByRole('group', { name: 'Les sept dernières nuits' })).getAllByRole(
      'button',
    )
    expect(nuits).toHaveLength(7)
    // La nuit d'hier (5 h 30, mauvais ressenti) et celle du jour (7 h 12, bon ressenti).
    expect(nuits[5]).toHaveAccessibleName(/5 h 30, ressenti difficile/)
    expect(nuits[6]).toHaveAccessibleName(/7 h 12, ressenti bon/)
    expect(nuits[0]).toHaveAccessibleName(/nuit non notée/)
  })

  it('montre la légende de l’empreinte au focus, puis passe d’une nuit à l’autre aux flèches', async () => {
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })
    const nuits = within(screen.getByRole('group', { name: 'Les sept dernières nuits' })).getAllByRole(
      'button',
    )

    act(() => nuits[5]?.focus())
    expect(screen.getByText(/5 h 30 · ressenti difficile/)).toBeInTheDocument()
    fireEvent.keyDown(nuits[5] as HTMLElement, { key: 'ArrowRight' })
    expect(nuits[6]).toHaveFocus()
    expect(screen.getByText(/7 h 12 · ressenti bon/)).toBeInTheDocument()
    fireEvent.keyDown(nuits[6] as HTMLElement, { key: 'ArrowLeft' })
    expect(nuits[5]).toHaveFocus()
  })

  it('montre la récupération en colonne, avec le palier écrit', async () => {
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByRole('img', { name: 'Récupération à 82 %' })).toBeInTheDocument()
    expect(screen.getByText(/Encore 6 h/)).toBeInTheDocument()
    expect(screen.getByText('frais', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /l’assistant de sortie/ })).toHaveAttribute(
      'href',
      '/marine/assistant',
    )
    expect(screen.getByText(/Pourquoi · Séance lourde hier/)).toBeInTheDocument()
  })

  it('dit « Prêt » quand on est récupéré', async () => {
    reponses.etat = () =>
      Response.json({
        ...ETAT,
        recuperation: { ...ETAT.recuperation, recupere: true, progression: 1, restant_h: 0, fin: null },
      })
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByText('Tu es récupéré : la prochaine séance peut être intense.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Récupération à 100 %' })).toBeInTheDocument()
  })

  it('écrit le palier « à plat » quand il reste plus de 48 h', async () => {
    reponses.etat = () =>
      Response.json({
        ...ETAT,
        recuperation: { ...ETAT.recuperation, restant_h: 60, progression: 0.2 },
      })
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByText('à plat', { selector: 'strong' })).toBeInTheDocument()
  })

  it('montre le verdict de l’écart, ses points et son détail', async () => {
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByText('Ce soir, t’as le droit.')).toBeInTheDocument()
    expect(screen.getByText('Séance lourde + 40 min de nage.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 points' })).toBeInTheDocument()
    expect(screen.getByText('Séance lourde : +2')).toBeInTheDocument()
  })

  it('note l’écart du jour : la braise s’éteint et la phrase passe au passé', async () => {
    rendre(<AujourdhuiRemanence />)

    fireEvent.click(await screen.findByRole('button', { name: /J’ai pris mon écart/ }))

    expect(await screen.findByText('Écart pris ce soir.')).toBeInTheDocument()
    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'POST' && a.url.includes('/vie-courante/cheat-meals'))).toBe(
        true,
      ),
    )
  })

  it('rallume la braise et dit l’erreur quand l’écart n’est pas enregistré', async () => {
    reponses.ecriture = () => Response.json({ detail: 'Écart refusé.' }, { status: 422 })
    rendre(<AujourdhuiRemanence />)

    fireEvent.click(await screen.findByRole('button', { name: /J’ai pris mon écart/ }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Ce soir, t’as le droit.')).toBeInTheDocument()
    expect(screen.queryByText('Écart pris ce soir.')).not.toBeInTheDocument()
  })

  /** Le réseau coupé : seules les écritures échouent, les lectures de la page ont déjà abouti. */
  function coupeLeReseauPourEcrire() {
    const lecture = vi.mocked(globalThis.fetch).getMockImplementation()
    vi.mocked(globalThis.fetch).mockImplementation(async (requete, options) => {
      const methode = requete instanceof Request ? requete.method : (options?.method ?? 'GET')
      if (methode !== 'GET') throw new TypeError('Failed to fetch')
      return (lecture as typeof fetch)(requete, options)
    })
  }

  it('rallume la braise, dit l’erreur et libère le bouton quand le réseau est coupé', async () => {
    rendre(<AujourdhuiRemanence />)
    const bouton = await screen.findByRole('button', { name: /J’ai pris mon écart/ })
    coupeLeReseauPourEcrire()

    fireEvent.click(bouton)

    expect(await screen.findByRole('alert')).toHaveTextContent('L’écart n’a pas pu être noté.')
    expect(screen.getByText('Ce soir, t’as le droit.')).toBeInTheDocument()
    expect(screen.queryByText('Écart pris ce soir.')).not.toBeInTheDocument()
    expect(bouton).toBeEnabled()
  })

  it('dit l’erreur quand la nuit ne part pas faute de réseau', async () => {
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })
    coupeLeReseauPourEcrire()

    fireEvent.click(screen.getByRole('button', { name: 'Noter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La nuit n’a pas pu être notée.')
  })

  it('dit l’erreur quand la pesée ne part pas faute de réseau', async () => {
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })
    coupeLeReseauPourEcrire()

    fireEvent.change(screen.getByLabelText(/Poids du jour en kg/), { target: { value: '74,6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Peser' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La pesée n’a pas pu être notée.')
  })

  it('note la nuit saisie au formulaire, avec son ressenti', async () => {
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    fireEvent.change(screen.getByLabelText(/Heures dormies/), { target: { value: '7,5' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Qualité 5 sur 5' }))
    // La phrase suit la saisie en direct.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Sept heures et demie.')
    expect(screen.getByText(/Ressenti : bon/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Noter' }))

    await waitFor(() => {
      const appel = appels.find((a) => a.methode === 'PUT' && a.url.includes('/nuits/'))
      expect(appel?.corps).toEqual({ heures: 7.5, qualite: 5 })
    })
  })

  it('dit l’erreur quand la nuit n’est pas enregistrée', async () => {
    reponses.ecriture = () => Response.json({ detail: 'Durée impossible.' }, { status: 422 })
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    fireEvent.click(screen.getByRole('button', { name: 'Noter' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('imprime la nuit avec la poignée : flèches pour la durée, Entrée pour noter', async () => {
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })
    const poignee = screen.getByRole('slider', { name: 'Durée de la nuit du jour' })
    expect(poignee).toHaveAttribute('aria-valuetext', '7 h 12')

    // Haut : +5 min (7 h 12 → 7 h 15 se cale sur la grille de 5 minutes).
    fireEvent.keyDown(poignee, { key: 'ArrowUp' })
    expect(screen.getByLabelText(/Heures dormies/)).toHaveValue('7,25')
    expect(poignee).toHaveAttribute('aria-valuetext', '7 h 15')
    // Maj + bas : −30 min.
    fireEvent.keyDown(poignee, { key: 'ArrowDown', shiftKey: true })
    expect(screen.getByLabelText(/Heures dormies/)).toHaveValue('6,75')

    fireEvent.keyDown(poignee, { key: 'Enter' })
    await waitFor(() => {
      const appel = appels.find((a) => a.methode === 'PUT' && a.url.includes('/nuits/'))
      expect(appel?.corps).toEqual({ heures: 6.75, qualite: 4 })
    })
  })

  it('pose la poignée à la moyenne quand la nuit du jour n’est pas encore notée', async () => {
    reponses.nuits = () => Response.json(NUITS.slice(0, 3))
    reponses.etat = () =>
      Response.json({ ...ETAT, sommeil: { derniere_nuit_h: null, moyenne_h: 6.5, nuits_comptees: 3 } })
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByRole('slider', { name: 'Durée de la nuit du jour' })).toHaveAttribute(
      'aria-valuetext',
      '6 h 30',
    )
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Imprime ta nuit.')
  })

  it('dit que les nuits n’ont pas pu être lues, sans perdre le reste de la page', async () => {
    reponses.nuits = () => Response.json({ detail: 'Nuits indisponibles.' }, { status: 500 })
    rendre(<AujourdhuiRemanence />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Les nuits de la semaine n’ont pas pu être lues.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /J’ai pris mon écart/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Peser' })).toBeInTheDocument()
  })

  it('montre le poids, sa ligne sur douze semaines, et note la pesée', async () => {
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByText('74,2 kg')).toBeInTheDocument()
    expect(screen.getByText('Moyenne des pesées des trois dernières semaines.')).toBeInTheDocument()
    expect(
      await screen.findByRole('img', { name: /Poids sur douze semaines : 4 pesées/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('−0,4 kg')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Poids du jour en kg/), { target: { value: '74,6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Peser' }))
    await waitFor(() => {
      const appel = appels.find((a) => a.methode === 'POST' && a.url.includes('/pesees'))
      expect(appel?.corps).toMatchObject({ poids_kg: 74.6 })
    })
  })

  it('dit quand la pesée n’est pas à jour ou n’existe pas encore', async () => {
    reponses.etat = () => Response.json({ ...ETAT, poids: { ...ETAT.poids, a_jour: false } })
    reponses.pesees = () => Response.json([])
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    expect(
      screen.getByText('Dernière pesée de plus de trois semaines : non mise à jour.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Poids sur douze semaines/ })).not.toBeInTheDocument()
  })

  it('dit comment commencer quand aucune pesée n’existe', async () => {
    reponses.etat = () => Response.json({ ...ETAT, poids: null })
    reponses.pesees = () => Response.json([])
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByText(/une pesée par semaine, le lundi matin à jeun/)).toBeInTheDocument()
  })

  it('dit la pesée qui n’est pas enregistrée', async () => {
    reponses.ecriture = () => Response.json({ detail: 'Poids impossible.' }, { status: 422 })
    rendre(<AujourdhuiRemanence />)
    await screen.findByRole('heading', { level: 2 })

    fireEvent.change(screen.getByLabelText(/Poids du jour en kg/), { target: { value: '74,6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Peser' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it.each(['cinema', 'sobre', 'immobile'])('se monte en mode d’animation « %s »', async (niveau) => {
    document.documentElement.dataset.animations = niveau
    rendre(<AujourdhuiRemanence />)

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Sept heures et quart.')
  })
})
