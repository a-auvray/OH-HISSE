import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MOI, rendre } from '../test/rendu'
import { Accueil } from './Accueil'

describe('Accueil', () => {
  it('ouvre les quatre espaces d’un clic', () => {
    rendre(<Accueil />)

    const liens = {
      'Vie courante': '/vie-courante',
      Streetlifting: '/streetlifting',
      Marine: '/marine',
      Objectifs: '/objectifs',
    }
    for (const [nom, chemin] of Object.entries(liens)) {
      expect(screen.getByRole('link', { name: new RegExp(nom) })).toHaveAttribute('href', chemin)
    }
  })

  it('salue l’utilisateur et présente le briefing du jour', () => {
    rendre(<Accueil />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Antoine')
    expect(screen.getByRole('heading', { name: 'Briefing du jour' })).toBeInTheDocument()
  })

  it('ne propose pas « Se déconnecter » en démo (le bandeau s’en charge)', () => {
    rendre(<Accueil />, { etat: { statut: 'connecte', utilisateur: { ...MOI, est_demo: true } } })

    expect(screen.queryByRole('button', { name: 'Se déconnecter' })).not.toBeInTheDocument()
  })
})
