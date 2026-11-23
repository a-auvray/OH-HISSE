import { act, configure, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTheme } from './contexte'
import { FournisseurTheme } from './FournisseurTheme'
import { Selecteur } from './Selecteur'
import type { MetaTheme, Theme } from './types'

// Sous charge (CI, machine occupée), le premier rendu peut dépasser la seconde par défaut.
configure({ asyncUtilTimeout: 4000 })

const vide = () => null

function fabrique(id: string, liberer?: () => void): { meta: MetaTheme; theme: Theme } {
  const theme: Theme = {
    Accueil: vide,
    Espaces: { streetlifting: vide, marine: vide, 'vie-courante': vide, objectifs: vide },
    Scene: vide,
    liberer,
  }
  const meta: MetaTheme = {
    id,
    nom: id.toUpperCase(),
    description: `Thème ${id}`,
    apercu: ['#000', '#fff'],
    charger: vi.fn(async () => ({ default: theme })),
  }
  return { meta, theme }
}

function Sonde() {
  const { id, theme, enChangement, erreur, animation, favoris } = useTheme()
  return (
    <p data-testid="etat">
      {[
        id,
        theme ? 'charge' : 'attente',
        enChangement ? 'change' : 'repos',
        erreur ?? '-',
        animation,
        favoris.join('+'),
      ].join('|')}
    </p>
  )
}

const etat = () => screen.getByTestId('etat').textContent

describe('FournisseurTheme', () => {
  const CLE = 'oh-hisse.themes.v2'
  const partirDeClassique = () => localStorage.setItem(CLE, JSON.stringify({ theme: 'classique' }))

  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('charge le thème par défaut au démarrage et le pose sur la page', async () => {
    const a = fabrique('classique')
    render(
      <FournisseurTheme themes={[a.meta]} dureeVoile={0}>
        <Sonde />
      </FournisseurTheme>,
    )
    await waitFor(() => expect(etat()).toBe('classique|charge|repos|-|cinema|'))
    expect(document.documentElement.dataset.theme).toBe('classique')
  })

  it('démarre sur Papier sans rien mémoriser tant qu’on n’a rien choisi', async () => {
    const a = fabrique('classique')
    const b = fabrique('papier')
    render(
      <FournisseurTheme themes={[a.meta, b.meta]} dureeVoile={0}>
        <Sonde />
      </FournisseurTheme>,
    )

    await waitFor(() => expect(etat()).toBe('papier|charge|repos|-|cinema|'))
    expect(a.meta.charger).not.toHaveBeenCalled()
    expect(localStorage.getItem(CLE)).toBeNull()
  })

  it('retombe sur Classique si Papier ne se charge pas', async () => {
    const a = fabrique('classique')
    const b = fabrique('papier')
    b.meta.charger = vi.fn(async () => {
      throw new Error('réseau')
    })
    render(
      <FournisseurTheme themes={[a.meta, b.meta]} dureeVoile={0}>
        <Sonde />
      </FournisseurTheme>,
    )

    await waitFor(() => expect(etat()).toBe('classique|charge|repos|-|cinema|'))
  })

  it('reprend le thème mémorisé, et ignore un thème devenu inconnu', async () => {
    const a = fabrique('classique')
    const b = fabrique('papier')
    localStorage.setItem(
      'oh-hisse.themes.v2',
      JSON.stringify({ theme: 'papier', favoris: ['papier', 'disparu'], animation: 'sobre' }),
    )
    render(
      <FournisseurTheme themes={[a.meta, b.meta]} dureeVoile={0}>
        <Sonde />
      </FournisseurTheme>,
    )
    await waitFor(() => expect(etat()).toBe('papier|charge|repos|-|sobre|papier'))
    expect(a.meta.charger).not.toHaveBeenCalled()

    localStorage.setItem('oh-hisse.themes.v2', JSON.stringify({ theme: 'disparu' }))
  })

  it('retombe sur le thème par défaut si le thème mémorisé ne se charge pas', async () => {
    const a = fabrique('classique')
    const b = fabrique('papier')
    b.meta.charger = vi.fn(async () => {
      throw new Error('réseau')
    })
    localStorage.setItem('oh-hisse.themes.v2', JSON.stringify({ theme: 'papier' }))
    render(
      <FournisseurTheme themes={[a.meta, b.meta]} dureeVoile={0}>
        <Sonde />
      </FournisseurTheme>,
    )
    await waitFor(() => expect(etat()).toBe('classique|charge|repos|-|cinema|'))
  })

  it('change de thème, mémorise le choix et libère l’ancien', async () => {
    partirDeClassique()
    const liberer = vi.fn()
    const a = fabrique('classique', liberer)
    const b = fabrique('papier')
    render(
      <FournisseurTheme themes={[a.meta, b.meta]} dureeVoile={0}>
        <Sonde />
        <Selecteur />
      </FournisseurTheme>,
    )
    await waitFor(() => expect(etat()).toContain('classique|charge'))
    expect(b.meta.charger).not.toHaveBeenCalled()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Réglages du thème' }))
    await user.click(screen.getByRole('button', { name: /^PAPIER/ }))

    await waitFor(() => expect(etat()).toBe('papier|charge|repos|-|cinema|'))
    expect(document.documentElement.dataset.theme).toBe('papier')
    expect(liberer).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem('oh-hisse.themes.v2') ?? '{}')).toMatchObject({ theme: 'papier' })
  })

  it('garde le thème en place quand le nouveau ne se charge pas, puis réessaie', async () => {
    partirDeClassique()
    const a = fabrique('classique')
    const b = fabrique('papier')
    let echec = true
    b.meta.charger = vi.fn(async () => {
      if (echec) throw new Error('réseau')
      return { default: b.theme }
    })
    render(
      <FournisseurTheme themes={[a.meta, b.meta]} dureeVoile={0}>
        <Sonde />
        <Selecteur />
      </FournisseurTheme>,
    )
    await waitFor(() => expect(etat()).toContain('classique|charge'))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Réglages du thème' }))
    await user.click(screen.getByRole('button', { name: /^PAPIER/ }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Le précédent reste en place'))
    expect(etat()).toContain('classique|charge')

    echec = false
    await user.click(screen.getByRole('button', { name: /^PAPIER/ }))
    await waitFor(() => expect(etat()).toContain('papier|charge|repos'))
  })

  it('télécharge un thème au survol sans l’activer', async () => {
    partirDeClassique()
    const a = fabrique('classique')
    const b = fabrique('papier')
    render(
      <FournisseurTheme themes={[a.meta, b.meta]} dureeVoile={0}>
        <Sonde />
        <Selecteur />
      </FournisseurTheme>,
    )
    await waitFor(() => expect(etat()).toContain('classique|charge'))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Réglages du thème' }))
    await user.hover(screen.getByRole('button', { name: /^PAPIER/ }))

    expect(b.meta.charger).toHaveBeenCalledTimes(1)
    expect(etat()).toContain('classique|charge')
  })

  it('met les favoris en tête et règle le niveau d’animation', async () => {
    partirDeClassique()
    const a = fabrique('classique')
    const b = fabrique('papier')
    render(
      <FournisseurTheme themes={[a.meta, b.meta]} dureeVoile={0}>
        <Sonde />
        <Selecteur />
      </FournisseurTheme>,
    )
    await waitFor(() => expect(etat()).toContain('classique|charge'))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Réglages du thème' }))

    await user.click(screen.getByRole('button', { name: 'Ajouter aux favoris : PAPIER' }))
    const noms = screen.getAllByRole('button', { name: /^(CLASSIQUE|PAPIER)/ })
    expect(noms[0]).toHaveTextContent('PAPIER')

    await user.click(screen.getByRole('radio', { name: 'Immobile' }))
    await act(async () => undefined)
    expect(document.documentElement.dataset.animations).toBe('immobile')
    expect(etat()).toContain('immobile|papier')
  })
})
