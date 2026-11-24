import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MOI } from '../../test/rendu'
import { ContexteSession } from '../../session/contexte'
import { FournisseurTheme } from '../FournisseurTheme'
import type { MetaTheme, Theme } from '../types'
import { AccueilEstampe } from './Accueil'
import { Coque } from './Coque'
import { SceneEstampe } from './Scene'

const vide = () => null
const theme: Theme = {
  Accueil: vide,
  Espaces: { streetlifting: vide, marine: vide, 'vie-courante': vide, objectifs: vide },
  Scene: vide,
}
const themes: MetaTheme[] = [
  {
    id: 'classique',
    nom: 'Classique',
    description: '',
    apercu: ['#000'],
    charger: async () => ({ default: theme }),
  },
]

const session = {
  etat: { statut: 'connecte', utilisateur: MOI },
  seConnecter: vi.fn(async () => null),
  entrerEnDemo: vi.fn(async () => null),
  seDeconnecter: vi.fn(async () => undefined),
} as const

function dans(ui: ReactNode) {
  render(
    <MemoryRouter>
      <ContexteSession value={session}>
        <FournisseurTheme themes={themes} dureeVoile={0}>
          {ui}
        </FournisseurTheme>
      </ContexteSession>
    </MemoryRouter>,
  )
}

describe('Accueil du thème Estampe', () => {
  beforeEach(() => {
    localStorage.clear()
    // Sans données, le briefing reste complet avec ses états d'attente ; le canvas, absent de jsdom, est ignoré.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ detail: 'Introuvable.' }, { status: 404 }),
    )
  })

  it('ouvre les quatre espaces par leurs bords', () => {
    dans(<AccueilEstampe />)

    const bords = {
      'Vie courante': '/vie-courante',
      Streetlifting: '/streetlifting',
      Marine: '/marine',
      Objectifs: '/objectifs',
    }
    for (const [nom, chemin] of Object.entries(bords)) {
      expect(screen.getByRole('link', { name: `${nom} : ouvrir l’espace` })).toHaveAttribute('href', chemin)
    }
  })

  it('salue et donne le briefing en titre', () => {
    dans(<AccueilEstampe />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pas de séance prévue')
    expect(screen.getByText(/Bonjour, Antoine|Bonsoir, Antoine/)).toBeInTheDocument()
  })

  it('passe du jour au sombre et s’en souvient', async () => {
    dans(<AccueilEstampe />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '◐ Mode sombre' }))

    expect(screen.getByRole('main')).toHaveAttribute('data-ton', 'soir')
    expect(localStorage.getItem('oh-hisse.ton')).toBe('soir')
  })
})

describe('Coque du thème Estampe', () => {
  beforeEach(() => localStorage.clear())

  it('montre le titre, les onglets et le retour à l’accueil', () => {
    dans(
      <Coque
        espace="marine"
        titre="Marine"
        onglets={[
          { chemin: '/marine', libelle: 'Conditions', fin: true },
          { chemin: '/marine/carte', libelle: 'Carte', fin: false },
        ]}
      >
        <p>contenu</p>
      </Coque>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Marine' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Carte' })).toHaveAttribute('href', '/marine/carte')
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/')
    expect(screen.getByText('contenu')).toBeInTheDocument()
  })

  it('reprend le ton choisi ailleurs', () => {
    localStorage.setItem('oh-hisse.ton', 'soir')

    dans(
      <Coque espace="objectifs" titre="Objectifs" onglets={[]}>
        <p>x</p>
      </Coque>,
    )

    expect(screen.getByRole('main')).toHaveAttribute('data-ton', 'soir')
    expect(screen.getByRole('button', { name: '◑ Mode clair' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Scène du thème Estampe', () => {
  it('montre la page, de l’accueil comme d’un espace', () => {
    dans(
      <SceneEstampe sens="droite" espace="marine">
        <p>page</p>
      </SceneEstampe>,
    )

    expect(screen.getByText('page')).toBeInTheDocument()
  })
})
