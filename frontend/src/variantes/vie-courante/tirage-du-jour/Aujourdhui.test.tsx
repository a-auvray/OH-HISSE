import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EtatDuJour } from '../../../api/types'
import { aujourdhui } from '../../../commun/format'
import { rendre } from '../../../test/rendu'
import { Aujourdhui } from './Aujourdhui'
import vues from './index'

const ETAT: EtatDuJour = {
  instant: '2026-11-19T11:00:00+01:00',
  recuperation: {
    recupere: false,
    restant_h: 8 + 40 / 60,
    total_h: 48,
    progression: 0.82,
    fin: '2026-11-19T18:00:00+01:00',
    raisons: ['Séance volume mardi'],
    recup_active_conseillee: false,
  },
  cheat_meal: {
    verdict: 'petit',
    points: 2,
    phrase: 'Séance lourde mardi et nage mercredi.',
    details: ['séance mar. 17 · RPE 8 +1', 'nage mer. 30 min +1', 'eau 12 °C +0'],
  },
  sommeil: { derniere_nuit_h: 7.2, moyenne_h: 6.9, nuits_comptees: 7 },
  poids: { kg: 74.2, a_jour: true, derniere_pesee: '2026-11-16' },
}

function avec(surcharge: Partial<EtatDuJour>) {
  return { ...ETAT, ...surcharge }
}

const CLE = 'oh-hisse.variantes.tirage-du-jour'

describe('Aujourd’hui, Le Tirage du jour', () => {
  let appels: { url: string; methode: string }[]
  let etat: EtatDuJour
  let reponseEcriture: Response

  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.animations
    appels = []
    etat = ETAT
    reponseEcriture = Response.json({})
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-19T10:00:00Z'))
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
      const r = requete instanceof Request ? requete : new Request(String(requete))
      appels.push({ url: r.url, methode: r.method })
      return r.method === 'GET' ? Response.json(etat) : reponseEcriture.clone()
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    delete document.documentElement.dataset.animations
  })

  it('est la vue Aujourdhui de la variante', () => {
    expect(vues.Aujourdhui).toBe(Aujourdhui)
  })

  it('attend les données, puis dit le verdict en grand avec son barème', async () => {
    rendre(<Aujourdhui />)
    expect(screen.getByText('Un instant…')).toBeInTheDocument()

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Un petit écart, oui.')
    expect(screen.getByText('ÉCART · 2 PTS · SEUIL 3')).toBeInTheDocument()
    expect(screen.getByText('Séance lourde mardi et nage mercredi.')).toBeInTheDocument()
    const bareme = screen.getByRole('list', { name: 'Le détail des points' })
    expect(
      within(bareme)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(ETAT.cheat_meal.details)
    expect(screen.getByText(/sur 4/)).toHaveTextContent('2 points sur 4')
  })

  it('compose le folio avec le jour, le lever et le coucher du soleil, et l’édition', async () => {
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    const folio = screen.getByText(/^n° 323 · /)
    expect(folio.textContent).toMatch(
      /^n° 323 · jeudi 19 novembre 2026 · soleil \d{1,2} h \d{2} → \d{1,2} h \d{2} · édition du matin$/,
    )
  })

  it('montre la récupération en pourcentage, en temps restant et en colonne', async () => {
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByRole('img', { name: 'Récupération à 82 %' })).toBeInTheDocument()
    expect(screen.getByText(/^82/)).toBeInTheDocument()
    expect(screen.getByText(/Encore 8 h 40 · prochain effort intense conseillé jeudi/)).toBeInTheDocument()
    expect(screen.getByText('Le trait marque le seuil d’allègement : 24 h restantes.')).toBeInTheDocument()
    // Les raisons se déplient comme partout ailleurs.
    expect(screen.getByRole('button', { name: /Pourquoi/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('dit « Prêt » quand on est récupéré', async () => {
    etat = avec({
      recuperation: { ...ETAT.recuperation, recupere: true, restant_h: 0, progression: 1, raisons: [] },
    })
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByText('Prêt')).toBeInTheDocument()
    expect(screen.getByText('Tu es récupéré : la prochaine séance peut être intense.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pourquoi/ })).not.toBeInTheDocument()
  })

  it('met l’allègement à la une quand il reste plus de 24 h, et garde le verdict dans sa rubrique', async () => {
    etat = avec({
      recuperation: { ...ETAT.recuperation, progression: 0.3, restant_h: 31, raisons: ['Séance max lundi'] },
      cheat_meal: { verdict: 'non', points: 0, phrase: 'Pas de quoi mériter un écart.', details: [] },
    })
    rendre(<Aujourdhui />)

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Séance allégée aujourd’hui.')
    expect(screen.getByText('RÉCUPÉRATION · ENCORE 31 H')).toBeInTheDocument()
    // Le verdict descend dans la rubrique, écrit en toutes lettres.
    expect(screen.getByText('Pas cette fois.')).toBeInTheDocument()
    expect(
      screen.getByText(
        (_, el) => el?.tagName === 'P' && /^0 point sur 4 · Pas cette fois\.$/.test(el.textContent ?? ''),
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Le détail des points' })).not.toBeInTheDocument()
  })

  it('dit « Ce soir, t’as le droit. » quand l’écart est mérité', async () => {
    etat = avec({
      cheat_meal: { verdict: 'oui', points: 3, phrase: 'Séance lourde + 40 min de nage.', details: [] },
    })
    rendre(<Aujourdhui />)

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Ce soir, t’as le droit.')
    expect(screen.getByText('Jour 323 de l’année · écart mérité')).toBeInTheDocument()
  })

  it('note l’écart du jour et recompose la une', async () => {
    rendre(<Aujourdhui />)
    fireEvent.click(await screen.findByRole('button', { name: /J’ai pris mon écart/ }))

    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'POST' && a.url.includes('/vie-courante/cheat-meals'))).toBe(
        true,
      ),
    )
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Écart pris.'))
    expect(screen.getByText('Jour 323 de l’année · écart pris')).toBeInTheDocument()
  })

  it('note la nuit avec sa qualité', async () => {
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    fireEvent.change(screen.getByLabelText(/Heures dormies/), { target: { value: '7,5' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Qualité 4 sur 5' }))
    expect(screen.getByRole('radio', { name: 'Qualité 4 sur 5' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Noter' }))

    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'PUT' && a.url.includes('/nuits/'))).toBe(true),
    )
  })

  it('affiche l’erreur d’une nuit refusée', async () => {
    reponseEcriture = Response.json({ detail: 'Saisie impossible.' }, { status: 422 })
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    fireEvent.click(screen.getByRole('button', { name: 'Noter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Saisie impossible.')
  })

  it('note la pesée, vide le champ et affiche l’erreur d’une pesée refusée', async () => {
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })
    const champ = screen.getByLabelText(/Poids du jour en kg/)

    fireEvent.change(champ, { target: { value: '74,6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Peser' }))
    await waitFor(() =>
      expect(appels.some((a) => a.methode === 'POST' && a.url.includes('/pesees'))).toBe(true),
    )
    await waitFor(() => expect(champ).toHaveValue(''))
  })

  it('affiche l’erreur d’une pesée refusée', async () => {
    reponseEcriture = Response.json({ detail: 'Pesée impossible.' }, { status: 422 })
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    fireEvent.change(screen.getByLabelText(/Poids du jour en kg/), { target: { value: '74,6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Peser' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Pesée impossible.')
  })

  it('résume la nuit et le poids, et lie vers la tendance du sommeil', async () => {
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByText('7 h 12')).toBeInTheDocument()
    expect(screen.queryByText('courte')).not.toBeInTheDocument()
    expect(screen.getByText(/Moyenne sur 7 jours : 6,9 h \(7 nuits\)/)).toBeInTheDocument()
    expect(screen.getByText('74,2 kg')).toBeInTheDocument()
    expect(screen.getByText('Moyenne des pesées des trois dernières semaines.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /La tendance du sommeil/ })).toHaveAttribute(
      'href',
      '/vie-courante/sommeil',
    )
    expect(screen.queryByRole('link', { name: /l’assistant de sortie/ })).not.toBeInTheDocument()
  })

  it('propose l’assistant de sortie quand une récupération active est conseillée', async () => {
    etat = avec({ recuperation: { ...ETAT.recuperation, recup_active_conseillee: true } })
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByRole('link', { name: /l’assistant de sortie/ })).toHaveAttribute(
      'href',
      '/marine/assistant',
    )
  })

  it('marque une nuit de moins de 6 h comme courte', async () => {
    etat = avec({ sommeil: { derniere_nuit_h: 5.5, moyenne_h: 6.5, nuits_comptees: 1 } })
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByText('5 h 30')).toBeInTheDocument()
    expect(screen.getByText('courte')).toBeInTheDocument()
    expect(screen.getByText(/\(1 nuit\)/)).toBeInTheDocument()
  })

  it('n’invente rien quand il n’y a ni nuit ni pesée', async () => {
    etat = avec({
      sommeil: { derniere_nuit_h: null, moyenne_h: null, nuits_comptees: 0 },
      poids: null,
    })
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    expect(screen.getByText('Pas encore de nuit notée cette semaine.')).toBeInTheDocument()
    expect(screen.getByText(/une pesée par semaine/)).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.getByLabelText(/Heures dormies/)).toHaveValue('')
  })

  it('garde les pages de l’espace dans la marge, la page courante marquée', async () => {
    rendre(<Aujourdhui />)
    await screen.findByRole('heading', { level: 2 })

    const marge = screen.getByRole('navigation', { name: 'Pages de l’espace' })
    expect(
      within(marge)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Aujourd’hui', 'Sommeil', 'Briefings'])
    expect(within(marge).getByRole('link', { name: 'Sommeil' })).toHaveAttribute(
      'href',
      '/vie-courante/sommeil',
    )
  })

  it('affiche l’erreur quand les verdicts ne se chargent pas', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json({ detail: 'Serveur indisponible.' }, { status: 500 }),
    )
    rendre(<Aujourdhui />)

    expect(await screen.findByText('Serveur indisponible.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  describe('entrée de la feuille', () => {
    const feuille = () => screen.getByRole('article', { name: 'Le tirage du jour' })

    it('tire la feuille à la première ouverture du jour, puis la trouve sèche', async () => {
      rendre(<Aujourdhui />)
      await screen.findByRole('heading', { level: 2 })
      expect(feuille()).toHaveAttribute('data-entree', 'tirage')
      expect(localStorage.getItem(CLE)).toBe(aujourdhui())

      cleanup()
      rendre(<Aujourdhui />)
      await screen.findByRole('heading', { level: 2 })
      expect(feuille()).toHaveAttribute('data-entree', 'glisse')
    })

    it('se calme en Sobre et s’arrête en Immobile', async () => {
      document.documentElement.dataset.animations = 'sobre'
      rendre(<Aujourdhui />)
      await screen.findByRole('heading', { level: 2 })
      expect(feuille()).toHaveAttribute('data-entree', 'fondu')
    })

    it('affiche la page directement en Immobile', async () => {
      document.documentElement.dataset.animations = 'immobile'
      rendre(<Aujourdhui />)
      await screen.findByRole('heading', { level: 2 })
      expect(feuille()).toHaveAttribute('data-entree', 'fixe')
    })

    it('retrouve ses débords quand l’animation d’entrée est finie', async () => {
      rendre(<Aujourdhui />)
      await screen.findByRole('heading', { level: 2 })
      const masque = feuille().querySelector('[class*="masque"]')
      expect(masque).not.toBeNull()
      // jsdom n'a pas d'AnimationEvent : React écoute alors la variante préfixée.
      fireEvent(masque as Element, new Event('webkitAnimationEnd', { bubbles: true }))
      expect(feuille()).toHaveAttribute('data-entree', 'fixe')
    })

    it('fonctionne sans stockage', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('stockage refusé')
      })
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('stockage refusé')
      })
      rendre(<Aujourdhui />)
      await screen.findByRole('heading', { level: 2 })
      expect(feuille()).toHaveAttribute('data-entree', 'tirage')
    })
  })
})
