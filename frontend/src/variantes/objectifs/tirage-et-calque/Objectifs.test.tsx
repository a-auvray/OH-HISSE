import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ObjectifLu, PointEvolution } from '../../../api/types'
import { rendre } from '../../../test/rendu'
import { bloc, iso, objectif, point } from './fabriques'
import { CLE_VISITE } from './visite'
import { ObjectifsTirage } from './Objectifs'

/* Le 25 novembre 2026 : la traction est à +38,5 kg, loin derrière un plan qui devait l'amener à +41,2 kg. */
const TRACTION = objectif({
  id: 1,
  progression: { e1rm_lest_kg: 38.5, le: iso(324), pourcentage: 77, cible_atteinte: false },
  blocs: [{ id: 9, nom: 'Force' }],
})
const DIPS = objectif({
  id: 2,
  titre: 'Dips +70 kg',
  exercice_id: 2,
  exercice: 'Dips',
  valeur_cible_kg: 70,
  principal: false,
  progression: { e1rm_lest_kg: 49.7, le: iso(324), pourcentage: 71, cible_atteinte: false },
})
const MUSCLE_UP = objectif({
  id: 3,
  titre: 'Muscle-up +10 kg',
  exercice_id: 3,
  exercice: 'Muscle-up',
  valeur_cible_kg: 10,
  principal: false,
  statut: 'atteint',
  progression: { e1rm_lest_kg: 10, le: iso(300), pourcentage: 100, cible_atteinte: true },
})

const EVOLUTIONS: Record<string, PointEvolution[]> = {
  '1': [point(131, 26.4), point(215, 33), point(299, 37.5), point(324, 38.5)],
  '2': [point(140, 45), point(324, 49.7)],
  '3': [],
}

interface Appel {
  url: string
  methode: string
}

interface Simulation {
  objectifs?: ObjectifLu[] | 'erreur'
  evolution?: 'erreur'
}

function simuler({ objectifs = [TRACTION, DIPS, MUSCLE_UP], evolution }: Simulation = {}) {
  const appels: Appel[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (requete) => {
    const r = requete instanceof Request ? requete : new Request(String(requete))
    appels.push({ url: r.url, methode: r.method })
    if (r.method !== 'GET') return Response.json({})
    const chemin = new URL(r.url).pathname
    if (chemin.endsWith('/exercices')) return Response.json([{ id: 1, nom: 'Tractions' }])
    if (chemin.includes('/evolution/')) {
      if (evolution === 'erreur') return Response.json({ detail: 'Indisponible' }, { status: 500 })
      return Response.json(EVOLUTIONS[chemin.split('/').at(-1) ?? ''] ?? [])
    }
    if (chemin.endsWith('/blocs'))
      return Response.json([bloc({ objectif_id: 1, debut: iso(250), fin: iso(300) })])
    if (objectifs === 'erreur') return Response.json({ detail: 'Base indisponible' }, { status: 500 })
    return Response.json(objectifs)
  })
  return appels
}

async function attendreEnsemble() {
  return screen.findByRole('list', { name: 'Planches en cours' })
}

describe('Objectifs, variante Tirage et Calque', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-25T10:00:00'))
    document.documentElement.dataset.animations = 'immobile'
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete document.documentElement.dataset.animations
    localStorage.clear()
  })

  describe('ensemble', () => {
    it('montre une colonne par objectif en cours, avec son pourcentage et son statut', async () => {
      simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      const traction = screen.getByRole('meter', { name: 'Traction +50 kg' })
      expect(traction).toHaveAttribute('aria-valuenow', '77')
      expect(traction.getAttribute('aria-valuetext')).toMatch(
        /^Traction \+50 kg, 77 %, 38,5 kilos sur 50,0, en retard de \d+ jours, échéance le 15 mars 2027$/,
      )
      expect(screen.getByRole('meter', { name: 'Dips +70 kg' })).toHaveAttribute('aria-valuenow', '71')
      // Une planche atteinte est rangée dans les archives, pas dans l'ensemble.
      expect(screen.queryByRole('meter', { name: 'Muscle-up +10 kg' })).not.toBeInTheDocument()
      // Le statut s'écrit en toutes lettres, avec sa forme : on ne le devine pas à la seule couleur.
      expect(screen.getAllByText('EN RETARD', { selector: 'span' })).toHaveLength(2)
    })

    it('résume le portefeuille dans le bandeau d’état', async () => {
      simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      expect(screen.getByRole('status')).toHaveTextContent('2 en retard')
    })

    it('annonce les prochains paliers calculés à partir des e1RM', async () => {
      simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      const paliers = screen.getByRole('complementary', { name: 'Prochains paliers' })
      expect(within(paliers).getByText('Traction +50 kg')).toBeInTheDocument()
      expect(within(paliers).getByText('NIV. +40,0 kg')).toBeInTheDocument()
      expect(within(paliers).getByText('à +1,5 kg')).toBeInTheDocument()
    })

    it('met en avant un autre objectif', async () => {
      const appels = simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      expect(screen.getByText('Objectif principal')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Mettre en avant' }))
      await waitFor(() => expect(appels.some((a) => a.methode === 'PUT')).toBe(true))
    })

    it('passe en règles d’échelle au-delà de cinq objectifs', async () => {
      const beaucoup = Array.from({ length: 6 }, (_, i) =>
        objectif({ id: i + 1, titre: `Objectif ${i + 1}`, principal: i === 0, exercice_id: 1 }),
      )
      simuler({ objectifs: beaucoup })
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      expect(screen.getAllByRole('meter')).toHaveLength(6)
      expect(screen.getAllByRole('button', { name: /^Objectif \d$/ })).toHaveLength(6)
    })
  })

  describe('fiche', () => {
    async function ouvrirFiche() {
      const appels = simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()
      fireEvent.click(screen.getByRole('button', { name: 'Traction +50 kg' }))
      await screen.findByRole('heading', { level: 2, name: 'Traction +50 kg' })
      return appels
    }

    it('ouvre la planche d’une colonne, avec tout le diagnostic écrit dans le bandeau', async () => {
      await ouvrirFiche()

      expect(screen.getByRole('tab', { name: /Fiche/, selected: true })).toBeInTheDocument()
      const bandeau = screen.getByRole('status')
      expect(bandeau).toHaveTextContent('EN RETARD')
      expect(bandeau).toHaveTextContent('échéance 15.03.2027')
      expect(bandeau).toHaveTextContent(/\+\d+ j sur le plan/)
      expect(bandeau).toHaveTextContent('prochain palier NIV. +40,0 kg, à +1,5 kg')
      expect(bandeau).toHaveTextContent('J−110')
      expect(screen.getByText('77 %', { selector: 'p' })).toBeInTheDocument()
      expect(screen.getByText('+38,5 / 50,0 kg')).toBeInTheDocument()
      expect(screen.getByText('reste 11,5 kg')).toBeInTheDocument()
    })

    it('porte le cartouche de l’objectif et ses blocs', async () => {
      await ouvrirFiche()

      const cartouche = screen.getByText('Mouvement').closest('dl')!
      expect(within(cartouche).getByText('Tractions')).toBeInTheDocument()
      expect(within(cartouche).getByText('+50 kg de lest')).toBeInTheDocument()
      expect(within(cartouche).getByText('J−110', { selector: 'strong' })).toBeInTheDocument()
      expect(within(cartouche).getByText(/^\+26,4 kg · 12\.05\.2026$/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Force' })).toHaveAttribute('href', '/streetlifting/blocs')
    })

    it('dessine le calque comme un curseur vertical, qu’on tire au clavier et qu’on relâche avec Échap', async () => {
      await ouvrirFiche()

      const calque = screen.getByRole('slider', { name: 'Calque du plan' })
      expect(calque).toHaveAttribute('aria-orientation', 'vertical')
      expect(calque.getAttribute('aria-valuetext')).toMatch(
        /^Calque du plan, recalé \d,\d kilos? sous le calage$/,
      )
      const repos = Number(calque.getAttribute('aria-valuenow'))
      expect(repos).toBeGreaterThan(0)

      fireEvent.keyDown(calque, { key: 'ArrowUp' })
      await waitFor(() => expect(Number(calque.getAttribute('aria-valuenow'))).toBeLessThan(repos))
      expect(calque.getAttribute('aria-valuetext')).toMatch(/^Calque du plan, /)

      fireEvent.keyDown(calque, { key: 'Escape' })
      await waitFor(() => expect(Number(calque.getAttribute('aria-valuenow'))).toBeCloseTo(repos, 1))
    })

    it('écrit la légende du fil tendu et décrit l’élévation', async () => {
      await ouvrirFiche()

      expect(screen.getByRole('group', { name: 'Élévation de l’e1RM, Traction +50 kg' })).toBeInTheDocument()
      expect(screen.getByText(/Le calque est recalé sur ton e1RM actuel : le plan finit/)).toBeInTheDocument()
    })

    it('écrit la légende des trames : chaque densité de hachure dit un type de bloc', async () => {
      await ouvrirFiche()

      const cle = screen.getByRole('list', { name: 'Légende des trames' })
      expect(within(cle).getByText('Force')).toBeInTheDocument()
      expect(within(cle).getByText('Hors bloc rattaché')).toBeInTheDocument()
    })

    it('marque l’objectif atteint, l’abandonne, ou le supprime', async () => {
      const appels = await ouvrirFiche()

      fireEvent.click(screen.getByRole('button', { name: 'Marquer atteint' }))
      await waitFor(() =>
        expect(appels.some((a) => a.methode === 'PATCH' && a.url.includes('/statut'))).toBe(true),
      )

      fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }))
      await waitFor(() => expect(appels.filter((a) => a.methode === 'PATCH')).toHaveLength(2))

      fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
      await waitFor(() => expect(appels.some((a) => a.methode === 'DELETE')).toBe(true))
    })

    it('feuillette les planches avec les boutons et avec les flèches', async () => {
      await ouvrirFiche()
      expect(screen.getByRole('group', { name: 'Planche 1 sur 3' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Planche suivante' }))
      expect(await screen.findByRole('heading', { level: 2, name: 'Dips +70 kg' })).toBeInTheDocument()
      // La planche numéro deux n'est pas la principale : on peut la mettre en avant.
      expect(screen.getByRole('button', { name: 'Mettre en avant' })).toBeInTheDocument()

      fireEvent.keyDown(screen.getByRole('button', { name: 'Planche suivante' }), { key: 'ArrowDown' })
      expect(await screen.findByRole('heading', { level: 2, name: 'Muscle-up +10 kg' })).toBeInTheDocument()
      // Une planche atteinte se reprend.
      expect(screen.getByRole('button', { name: 'Reprendre' })).toBeInTheDocument()

      fireEvent.keyDown(screen.getByRole('button', { name: 'Planche précédente' }), { key: 'ArrowUp' })
      expect(await screen.findByRole('heading', { level: 2, name: 'Dips +70 kg' })).toBeInTheDocument()
    })

    it('dit pourquoi il n’y a pas de calque quand l’historique manque', async () => {
      simuler({ evolution: 'erreur' })
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()
      fireEvent.click(screen.getByRole('button', { name: 'Traction +50 kg' }))

      expect(await screen.findByText(/L’historique d’e1RM n’a pas pu être lu/)).toBeInTheDocument()
      expect(screen.queryByRole('slider', { name: 'Calque du plan' })).not.toBeInTheDocument()
      // Le pourcentage et les gestes, eux, viennent de l'objectif : ils restent.
      expect(screen.getByRole('button', { name: 'Marquer atteint' })).toBeInTheDocument()
    })
  })

  describe('archives', () => {
    it('range les planches atteintes ou abandonnées, qu’on peut reprendre ou supprimer', async () => {
      const appels = simuler({
        objectifs: [
          TRACTION,
          MUSCLE_UP,
          objectif({ id: 4, titre: 'Pompes', statut: 'abandonne', principal: false, exercice_id: 3 }),
        ],
      })
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      fireEvent.click(screen.getByRole('tab', { name: /Archives/ }))
      const tiroir = await screen.findByRole('list', { name: 'Planches archivées' })
      expect(within(tiroir).getByText('Muscle-up +10 kg')).toBeInTheDocument()
      expect(within(tiroir).getByText('ATTEINT')).toBeInTheDocument()
      expect(within(tiroir).getByText('ABANDONNÉ')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('1 planche atteinte · 1 planche abandonnée')

      fireEvent.click(within(tiroir).getAllByRole('button', { name: 'Reprendre' })[0]!)
      await waitFor(() => expect(appels.some((a) => a.methode === 'PATCH')).toBe(true))
      fireEvent.click(within(tiroir).getAllByRole('button', { name: 'Supprimer' })[0]!)
      await waitFor(() => expect(appels.some((a) => a.methode === 'DELETE')).toBe(true))
    })

    it('annonce un tiroir vide', async () => {
      simuler({ objectifs: [TRACTION] })
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      fireEvent.click(screen.getByRole('tab', { name: /Archives/ }))
      expect(await screen.findByText(/Le tiroir est vide/)).toBeInTheDocument()
    })
  })

  describe('intercalaires et clavier', () => {
    it('change d’intercalaire avec les touches 1 à 3, sauf dans un champ', async () => {
      simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      fireEvent.keyDown(document.body, { key: '3' })
      expect(await screen.findByRole('tab', { name: /Archives/, selected: true })).toBeInTheDocument()
      fireEvent.keyDown(document.body, { key: '2' })
      expect(await screen.findByRole('tab', { name: /Fiche/, selected: true })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '+ Nouvelle planche' }))
      const champ = await screen.findByLabelText('Intitulé')
      fireEvent.keyDown(champ, { key: '3' })
      expect(screen.getByRole('tab', { name: /Fiche/, selected: true })).toBeInTheDocument()
    })

    it('parcourt les intercalaires avec les flèches', async () => {
      simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      const ensemble = screen.getByRole('tab', { name: /Ensemble/ })
      fireEvent.keyDown(ensemble, { key: 'ArrowDown' })
      expect(screen.getByRole('tab', { name: /Fiche/, selected: true })).toBeInTheDocument()
      fireEvent.keyDown(screen.getByRole('tab', { name: /Fiche/ }), { key: 'End' })
      expect(screen.getByRole('tab', { name: /Archives/, selected: true })).toBeInTheDocument()
      fireEvent.keyDown(screen.getByRole('tab', { name: /Archives/ }), { key: 'ArrowDown' })
      expect(screen.getByRole('tab', { name: /Ensemble/, selected: true })).toBeInTheDocument()
    })
  })

  describe('nouvelle planche', () => {
    it('crée un objectif depuis le formulaire commun', async () => {
      const appels = simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      fireEvent.click(screen.getByRole('button', { name: '+ Nouvelle planche' }))
      fireEvent.change(await screen.findByLabelText('Intitulé'), { target: { value: 'Pompes +20 kg' } })
      fireEvent.change(screen.getByLabelText(/Cible/), { target: { value: '20' } })
      fireEvent.change(screen.getByLabelText('Date cible'), { target: { value: '2027-06-01' } })
      fireEvent.click(screen.getByRole('button', { name: 'Fixer cet objectif' }))

      await waitFor(() =>
        expect(appels.some((a) => a.methode === 'POST' && a.url.endsWith('/api/objectifs'))).toBe(true),
      )
    })

    it('s’ouvre avec Ctrl+K et se referme avec le bouton', async () => {
      simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      expect(await screen.findByLabelText('Intitulé')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
      await waitFor(() => expect(screen.queryByLabelText('Intitulé')).not.toBeInTheDocument())
    })
  })

  describe('états', () => {
    it('invite à fixer un cap quand il n’y a rien', async () => {
      simuler({ objectifs: [] })
      rendre(<ObjectifsTirage />)

      expect(await screen.findByRole('heading', { level: 2, name: 'Fixe un cap.' })).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('aucune planche en cours')
      fireEvent.click(screen.getByRole('button', { name: 'Créer mon premier objectif' }))
      expect(await screen.findByLabelText('Intitulé')).toBeInTheDocument()
    })

    it('montre l’attente, puis dit que les planches sont illisibles, avec de quoi réessayer', async () => {
      const appels = simuler({ objectifs: 'erreur' })
      rendre(<ObjectifsTirage />)

      expect(screen.getByText('Mise en place des planches…')).toBeInTheDocument()
      const alerte = await screen.findByRole('alert')
      expect(alerte).toHaveTextContent('Base indisponible')
      const avant = appels.filter((a) => a.url.endsWith('/api/objectifs')).length
      fireEvent.click(within(alerte).getByRole('button', { name: 'Réessayer' }))
      await waitFor(() =>
        expect(appels.filter((a) => a.url.endsWith('/api/objectifs')).length).toBeGreaterThan(avant),
      )
    })

    it.each(['cinema', 'sobre'] as const)('se dessine aussi au niveau d’animation « %s »', async (niveau) => {
      document.documentElement.dataset.animations = niveau
      simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()
      fireEvent.click(screen.getByRole('button', { name: 'Traction +50 kg' }))

      // Le pourcentage compte jusqu'à sa valeur, et le calque est là, à sa place, quelle que soit l'animation.
      expect(await screen.findByText('77 %', { selector: 'p' }, { timeout: 4000 })).toBeInTheDocument()
      expect(screen.getByRole('slider', { name: 'Calque du plan' })).toBeInTheDocument()
    })

    it('ne rejoue pas le passage en tireuse quand rien n’a changé depuis la dernière visite', async () => {
      simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()
      await waitFor(() => expect(localStorage.getItem(CLE_VISITE)).not.toBeNull())
      const premiere = localStorage.getItem(CLE_VISITE)

      // Même jour, mêmes données : la visite enregistrée est identique.
      simuler()
      rendre(<ObjectifsTirage />)
      await waitFor(() => expect(screen.getAllByRole('list', { name: 'Planches en cours' })).toHaveLength(2))
      expect(localStorage.getItem(CLE_VISITE)).toBe(premiere)
    })

    it('mémorise la visite pour la prochaine fois', async () => {
      simuler()
      rendre(<ObjectifsTirage />)
      await attendreEnsemble()

      await waitFor(() => expect(localStorage.getItem(CLE_VISITE)).not.toBeNull())
      const visite = JSON.parse(localStorage.getItem(CLE_VISITE) ?? '{}') as {
        jour: string
        pourcentages: Record<string, number>
      }
      expect(visite.jour).toBe('2026-11-25')
      expect(visite.pourcentages['1']).toBe(77)
    })
  })
})
