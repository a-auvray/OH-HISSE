import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import type { IdEspace } from '../../espaces/espaces'
import { rendre } from '../../test/rendu'
import { Coque } from './Coque'
import { Plaque } from './Plaque'

const ONGLETS = [
  { chemin: '/marine', libelle: 'Conditions', fin: true },
  { chemin: '/marine/carte', libelle: 'Carte', fin: false },
] as const

describe('Coque du thème Papier', () => {
  beforeEach(() => localStorage.clear())

  it('montre le titre, les onglets et le retour à l’accueil', () => {
    rendre(
      <Coque espace="marine" titre="Marine" onglets={ONGLETS}>
        <p>contenu</p>
      </Coque>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Marine' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conditions' })).toHaveAttribute('href', '/marine')
    expect(screen.getByRole('link', { name: 'Carte' })).toHaveAttribute('href', '/marine/carte')
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/')
    expect(screen.getByText('contenu')).toBeInTheDocument()
  })

  it.each([
    ['marine', 'gauche'],
    ['streetlifting', 'droite'],
    ['vie-courante', 'bas'],
    ['objectifs', 'haut'],
  ] as const)('place le dos du pli de %s du côté de l’accueil (%s)', (espace, cote) => {
    rendreCoque(espace)

    expect(screen.getByRole('main')).toHaveAttribute('data-dos', cote)
  })

  it('change de ton et le garde pour les autres pages', async () => {
    rendreCoque('streetlifting')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '◐ Mode sombre' }))

    expect(screen.getByRole('main')).toHaveAttribute('data-ton', 'soir')
    expect(localStorage.getItem('oh-hisse.papier.ton')).toBe('soir')
  })

  it('affiche les pages pas encore refaites sur une plaque', () => {
    rendre(
      <Coque espace="objectifs" titre="Objectifs" onglets={[]}>
        <Plaque>
          <p>ancienne page</p>
        </Plaque>
      </Coque>,
    )

    expect(screen.getByText('ancienne page')).toBeInTheDocument()
  })
})

function rendreCoque(espace: IdEspace) {
  rendre(
    <Coque espace={espace} titre="Titre" onglets={[]}>
      <p>x</p>
    </Coque>,
  )
}
