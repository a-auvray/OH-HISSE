import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ESPACES, type IdEspace } from '../espaces/espaces'
import { ContexteVariantes } from './contexte'
import { FournisseurVariantes } from './FournisseurVariantes'
import { CLE_VARIANTES, lireChoix } from './preferences'
import { SelecteurVariantes } from './SelecteurVariantes'
import { Vue } from './Vue'
import type { MetaVariante } from './types'
import { useContext } from 'react'

const Theme = () => <p>vue du thème</p>
const Autre = () => <p>vue de la variante</p>

const aucune = Object.fromEntries(ESPACES.map((e) => [e.id, []])) as unknown as Record<
  IdEspace,
  MetaVariante[]
>
const variantes = {
  ...aucune,
  objectifs: [
    {
      id: 'drisses',
      espace: 'objectifs',
      nom: 'Drisses',
      description: 'Des drisses',
      charger: async () => ({ default: { Objectifs: Autre } }),
    },
    {
      id: 'cassee',
      espace: 'objectifs',
      nom: 'Cassée',
      description: 'Ne se charge pas',
      charger: () => Promise.reject(new Error('réseau')),
    },
  ],
} satisfies Record<IdEspace, MetaVariante[]>

function Page() {
  return <Vue espace="objectifs" nom="Objectifs" parDefaut={Theme} />
}

function rendre() {
  return render(
    <FournisseurVariantes variantes={variantes}>
      <Page />
      <SelecteurVariantes />
    </FournisseurVariantes>,
  )
}

describe('variantes', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('montre la vue du thème tant qu’aucune variante n’est choisie', () => {
    rendre()
    expect(screen.getByText('vue du thème')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Du thème' })).toBeChecked()
  })

  it('sans fournisseur, la vue du thème s’affiche', () => {
    render(<Page />)
    expect(screen.getByText('vue du thème')).toBeInTheDocument()
  })

  it('charge la variante choisie, la mémorise, et revient au thème à la demande', async () => {
    const u = userEvent.setup()
    rendre()
    await u.click(screen.getByRole('radio', { name: 'Drisses' }))
    expect(await screen.findByText('vue de la variante')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(CLE_VARIANTES) ?? '{}')).toEqual({ objectifs: 'drisses' })

    await u.click(screen.getByRole('radio', { name: 'Du thème' }))
    expect(screen.getByText('vue du thème')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(CLE_VARIANTES) ?? '{}')).toEqual({})
  })

  it('retrouve la variante mémorisée au démarrage', async () => {
    localStorage.setItem(CLE_VARIANTES, JSON.stringify({ objectifs: 'drisses' }))
    rendre()
    expect(await screen.findByText('vue de la variante')).toBeInTheDocument()
  })

  it('oublie une variante disparue ou un stockage abîmé', () => {
    localStorage.setItem(CLE_VARIANTES, JSON.stringify({ objectifs: 'fantome', marine: 3 }))
    expect(lireChoix(variantes)).toEqual({})
    localStorage.setItem(CLE_VARIANTES, '{pas du json')
    expect(lireChoix(variantes)).toEqual({})
  })

  it('garde la vue du thème et prévient quand une variante ne se charge pas', async () => {
    const u = userEvent.setup()
    rendre()
    await u.click(screen.getByRole('radio', { name: 'Cassée' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('cassee')
    expect(screen.getByText('vue du thème')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Du thème' })).toBeChecked()
  })

  it('ne montre rien dans le sélecteur sans variante', () => {
    render(
      <FournisseurVariantes variantes={aucune}>
        <SelecteurVariantes />
      </FournisseurVariantes>,
    )
    expect(screen.queryByText('Vues des espaces')).not.toBeInTheDocument()
  })

  it('expose un contexte vide hors fournisseur', () => {
    function Sonde() {
      return <p>{useContext(ContexteVariantes) === null ? 'aucun' : 'présent'}</p>
    }
    render(<Sonde />)
    expect(screen.getByText('aucun')).toBeInTheDocument()
    act(() => undefined)
  })
})
