import { describe, expect, it } from 'vitest'

import { ESPACES } from '../../espaces/espaces'
import { OPPOSE } from '../../navigation/directions'
import { charniere } from './pli'

describe('charniere', () => {
  it.each([
    ['marine', '0% 50%', 'rotateY'],
    ['streetlifting', '100% 50%', 'rotateY'],
    ['vie-courante', '50% 100%', 'rotateX'],
    ['objectifs', '50% 0%', 'rotateX'],
  ] as const)('%s s’articule sur %s autour de %s', (espace, origine, axe) => {
    expect(charniere(espace)).toMatchObject({ origine, axe })
  })

  it('articule toujours la page sur le bord tourné vers l’accueil', () => {
    const bord = { gauche: '0% 50%', droite: '100% 50%', haut: '50% 0%', bas: '50% 100%' } as const
    for (const espace of ESPACES) {
      expect(charniere(espace.id).origine).toBe(bord[OPPOSE[espace.direction]])
    }
  })
})
