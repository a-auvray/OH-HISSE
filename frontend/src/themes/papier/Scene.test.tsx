import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FournisseurTheme } from '../FournisseurTheme'
import type { MetaTheme, Theme } from '../types'
import { ScenePapier } from './Scene'

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
    apercu: ['#000', '#fff'],
    charger: async () => ({ default: theme }),
  },
]

function afficher(espace: 'marine' | null) {
  render(
    <FournisseurTheme themes={themes} dureeVoile={0}>
      <ScenePapier sens={null} espace={espace}>
        <p>page</p>
      </ScenePapier>
    </FournisseurTheme>,
  )
}

describe('Scène du thème Papier', () => {
  it('montre la page de l’accueil', () => {
    afficher(null)

    expect(screen.getByText('page')).toBeInTheDocument()
    expect(document.querySelector('[class*="ombre"]')).toBeNull()
  })

  it('montre la page d’un espace avec l’ombre de son pli', () => {
    afficher('marine')

    expect(screen.getByText('page')).toBeInTheDocument()
    expect(document.querySelector('[class*="ombre"]')).not.toBeNull()
  })
})
