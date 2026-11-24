import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { Panneau } from './Panneau'

function rendre(ouvertParDefaut = false) {
  return render(
    <Panneau id="essai" titre="Détail" resume="en bref" ouvertParDefaut={ouvertParDefaut}>
      <p>le contenu</p>
    </Panneau>,
  )
}

describe('Panneau', () => {
  beforeEach(() => localStorage.clear())

  it('est fermé par défaut, avec son résumé visible', () => {
    rendre()

    expect(screen.getByRole('button', { name: /Détail/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('en bref')).toBeInTheDocument()
    expect(screen.getByText('le contenu')).not.toBeVisible()
  })

  it('s’ouvre et se referme au clic', async () => {
    rendre()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Détail/ }))
    expect(screen.getByText('le contenu')).toBeVisible()
    expect(screen.getByRole('button', { name: /Détail/ })).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: /Détail/ }))
    expect(screen.getByText('le contenu')).not.toBeVisible()
  })

  it('retient le choix d’une visite à l’autre', async () => {
    rendre().unmount()
    localStorage.setItem('oh-hisse.papier.panneaux', JSON.stringify({ essai: true }))

    rendre()

    expect(screen.getByText('le contenu')).toBeVisible()
  })

  it('s’ouvre d’emblée si on le demande', () => {
    rendre(true)

    expect(screen.getByText('le contenu')).toBeVisible()
  })

  it('mémorise l’ouverture', async () => {
    rendre()

    await userEvent.setup().click(screen.getByRole('button', { name: /Détail/ }))

    expect(JSON.parse(localStorage.getItem('oh-hisse.papier.panneaux') ?? '{}')).toEqual({ essai: true })
  })
})
