import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Conditions } from '../../../api/types'
import { ConditionsEtale } from './ConditionsEtale'
import { assistantFictif, conditionsFictives } from './fixture'
import vues from './index'
import meta from './meta'

/** Un contexte 2D dont toutes les méthodes ne font rien : jsdom ne dessine pas, on vérifie seulement le cycle de vie. */
function contexteMuet(): CanvasRenderingContext2D {
  const proprietes: Record<string | symbol, unknown> = {}
  return new Proxy(proprietes, {
    get: (cible, nom) => (nom in cible ? cible[nom] : () => ({ addColorStop: () => undefined })),
    set: (cible, nom, valeur) => {
      cible[nom] = valeur
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

function mesures(largeur: number) {
  return {
    width: largeur,
    height: 330,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: largeur,
    bottom: 330,
    toJSON: () => ({}),
  }
}

const curseur = () => screen.getByRole('slider')

function monter(conditions: Conditions = conditionsFictives()) {
  return render(<ConditionsEtale conditions={conditions} spotId={1} />)
}

describe('L’Étale : conditions de la mer', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.animations
    // L'assistant propose un créneau de 13h30 à 15h30 : il contient l'étale de pleine mer.
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json(assistantFictif()))
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(mesures(900))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => contexteMuet() as unknown as RenderingContext,
    )
  })

  afterEach(() => {
    delete document.documentElement.dataset.animations
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  })

  it('se déclare dans le registre : Conditions de Marine', () => {
    expect(meta).toMatchObject({ id: 'etale', espace: 'marine', nom: 'L’Étale' })
    expect(meta.description).not.toBe('')
    expect(Object.keys(vues)).toEqual(['Conditions'])
  })

  it('dit « Vas-y à l’étale. » avec le créneau en grand, les durées et le danger', async () => {
    monter()

    expect(await screen.findByRole('heading', { level: 2, name: 'Vas-y à l’étale.' })).toBeInTheDocument()
    expect(screen.getByLabelText('Créneau conseillé de 13h30 à 15h30')).toHaveTextContent('13h30 → 15h30')
    expect(screen.getByText('25 min conseillées · max 40 · eau 12 °C')).toBeInTheDocument()
    expect(screen.getByText(/étale vers 15h : le courant tombe à 0,2 km\/h/)).toBeInTheDocument()

    const danger = screen.getByRole('group', { name: 'Danger VERT à 10h40' })
    expect(within(danger).getByText('VERT')).toBeInTheDocument()
    expect(within(danger).getByText(/jusqu’à 17h/)).toBeInTheDocument()
    expect(within(danger).getByText('Vent de terre 18 km/h, sous le seuil de 20.')).toBeInTheDocument()
    expect(within(danger).getByText(/^ROUGE dès 17h : vent 31 km\/h/)).toBeInTheDocument()
  })

  it('donne la réponse commune quand l’assistant n’a rien à proposer', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json({ detail: 'Indisponible.' }, { status: 503 }),
    )
    monter()

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Vas-y avant 17h.')
    expect(screen.queryByLabelText(/Créneau conseillé/)).not.toBeInTheDocument()
    // Sans durées, il reste l'eau.
    expect(await screen.findByText('eau 12 °C')).toBeInTheDocument()
  })

  it('montre la plage en coupe avec la distance à marcher, écrite en texte', () => {
    monter()

    const coupe = screen.getByRole('img', {
      name: /^Coupe de la plage de Ouistreham à 10h40, eau à 2,\d m, \d+ m à marcher, danger vert$/,
    })
    expect(coupe).toBeInTheDocument()
    expect(within(coupe).getByText(/m à marcher/, { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText(/exagération verticale ×\d+/)).toBeInTheDocument()
    expect(screen.getByText('pied de digue')).toBeInTheDocument()
    expect(within(coupe).getByText('vent de terre · pousse au large')).toBeInTheDocument()
    expect(
      screen.getByText(/pleine mer : \d+ m à 14h52|pleine mer à 14h52 : au pied de la digue/),
    ).toBeInTheDocument()
    // Le dessin est décoratif : tout est aussi dit en texte.
    expect(coupe.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
    expect(coupe.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('dit la plage sans profil quand aucune distance n’est connue', () => {
    const sans = conditionsFictives()
    sans.heures = sans.heures.map((h) => ({ ...h, distance_eau_m: null }))
    sans.maintenant = { ...sans.maintenant, distance_eau_m: null }
    monter(sans)

    expect(screen.getByText(/profil de la plage indisponible/)).toBeInTheDocument()
  })

  it('garde tous les relevés de la page commune', () => {
    monter()

    for (const nom of ['Eau', 'Air', 'Vent', 'Vagues', 'Courant', 'Ciel', 'Marée']) {
      expect(screen.getByRole('heading', { level: 3, name: nom })).toBeInTheDocument()
    }
    expect(screen.getByText('ressenti 13 °C')).toBeInTheDocument()
    expect(screen.getByText(/15 °C choc thermique/)).toBeInTheDocument()
    expect(screen.getByText(/pleine mer à 14h52 · 6,9 m/)).toBeInTheDocument()
    expect(screen.getByText(/soleil 8h20 → 17h08/)).toBeInTheDocument()
    expect(screen.getByText(/Open-Meteo\. Horaires de marée arrondis/)).toBeInTheDocument()
  })

  it('met tout à l’heure choisie avec le curseur, et revient à maintenant', () => {
    monter()
    expect(screen.getByRole('button', { name: 'Revenir à maintenant' })).toBeDisabled()

    fireEvent.change(curseur(), { target: { value: '7' } })

    expect(curseur()).toHaveAttribute('aria-valuetext', expect.stringContaining('17h'))
    expect(screen.getByRole('group', { name: 'Danger ROUGE à 17h' })).toBeInTheDocument()
    expect(screen.getByText(/prévision de 17h/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Revenir à maintenant' }))
    expect(curseur()).toHaveValue('0')
    expect(screen.getByRole('group', { name: 'Danger VERT à 10h40' })).toBeInTheDocument()
  })

  it('annonce à chaque déplacement l’heure, la hauteur d’eau, la distance et le danger', () => {
    monter()
    fireEvent.change(curseur(), { target: { value: '7' } })

    const annonce = screen.getAllByRole('status').find((e) => e.classList.contains('sr-only'))!
    expect(annonce).toHaveAttribute('aria-live', 'polite')
    expect(annonce).toHaveTextContent(/^17h, eau à \d,\d m, .*danger rouge$/)
  })

  it('se pilote au clavier : Maj + flèche, N, [ et ]', () => {
    monter()
    const c = curseur()

    fireEvent.keyDown(c, { key: 'ArrowRight', shiftKey: true })
    expect(c).toHaveValue('6')
    fireEvent.keyDown(c, { key: 'ArrowLeft', shiftKey: true })
    expect(c).toHaveValue('0')
    fireEvent.keyDown(c, { key: 'ArrowRight', shiftKey: true })
    fireEvent.keyDown(c, { key: 'n' })
    expect(c).toHaveValue('0')

    fireEvent.keyDown(c, { key: ']' })
    expect(c).toHaveValue('24')
    fireEvent.keyDown(c, { key: ']' })
    expect(c).toHaveValue('24')
    fireEvent.keyDown(c, { key: '[' })
    expect(c).toHaveValue('0')
    expect(c).toHaveAttribute('aria-keyshortcuts', expect.stringContaining('N'))
  })

  it('passe d’un jour à l’autre en gardant l’heure', () => {
    monter()
    fireEvent.change(curseur(), { target: { value: '4' } })

    expect(screen.getByRole('button', { name: /^J, / })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /^J\+1, / }))

    expect(curseur()).toHaveValue('28')
    expect(screen.getByRole('button', { name: /^J\+1, / })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: /^J\+2, / })).not.toBeInTheDocument()
  })

  it('liste les heures en texte, et chacune place le curseur', () => {
    monter()

    fireEvent.click(screen.getByRole('button', { name: /17h, danger rouge/, hidden: true }))

    expect(curseur()).toHaveValue('7')
    expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument()
  })

  it('repart de maintenant quand on change de plage', () => {
    const { rerender } = monter()
    fireEvent.change(curseur(), { target: { value: '9' } })
    expect(curseur()).toHaveValue('9')

    const autre = conditionsFictives({ spot: { id: 2, nom: 'Colleville', latitude: 49.3, longitude: -0.3 } })
    rerender(<ConditionsEtale conditions={autre} spotId={2} />)

    expect(curseur()).toHaveValue('0')
    expect(screen.getByText(/Colleville/)).toBeInTheDocument()
  })

  it('signale les données en cache', () => {
    monter(conditionsFictives({ perimees: true }))

    expect(screen.getAllByText(/données en cache/i).length).toBeGreaterThan(0)
  })

  it('reste complète sans prévision heure par heure', () => {
    monter(conditionsFictives({ heures: [] }))

    expect(screen.getByText(/Aucune prévision heure par heure/)).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Vent' })).toBeInTheDocument()
  })

  it('nomme un danger noir par sa forme et par son mot', () => {
    monter(
      conditionsFictives({ danger: { niveau: 'noir', raisons: [{ niveau: 'noir', texte: 'Eau à 4 °C.' }] } }),
    )

    const danger = screen.getByRole('group', { name: /^Danger NOIR/ })
    expect(within(danger).getByText('NOIR')).toBeInTheDocument()
    expect(within(danger).getByText('Eau à 4 °C.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Mer interdite.')
  })

  describe('animations', () => {
    it('émousse le titre avec la houle en Cinéma, jamais en Sobre ni en Immobile', () => {
      const { unmount } = monter()
      expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('data-souplesse', '40')
      unmount()

      document.documentElement.dataset.animations = 'sobre'
      const sobre = monter()
      expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('data-souplesse', '0')
      sobre.unmount()

      document.documentElement.dataset.animations = 'immobile'
      monter()
      expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('data-souplesse', '0')
    })

    it('dessine en boucle en Cinéma et arrête sa boucle au démontage', () => {
      const demande = vi.spyOn(window, 'requestAnimationFrame')
      const annule = vi.spyOn(window, 'cancelAnimationFrame')
      const { unmount } = monter()

      expect(demande).toHaveBeenCalled()
      unmount()
      expect(annule).toHaveBeenCalled()
    })

    it('ne lance aucune boucle en Immobile : une image fixe', () => {
      document.documentElement.dataset.animations = 'immobile'
      const demande = vi.spyOn(window, 'requestAnimationFrame')
      monter()

      expect(demande).not.toHaveBeenCalled()
    })

    it('ne lance aucune boucle quand l’onglet est masqué', () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      const demande = vi.spyOn(window, 'requestAnimationFrame')
      monter()

      expect(demande).not.toHaveBeenCalled()
    })
  })
})
