import { describe, expect, it } from 'vitest'

import { ESPACES } from '../espaces/espaces'
import { VARIANTES } from './registre'

/**
 * Garde-fou commun à toutes les variantes : chacune est rangée dans le bon espace, a un nom
 * et se charge en donnant au moins une vue. Une variante vide ferait montrer le thème sans qu'on sache pourquoi.
 */
describe('contrat des variantes', () => {
  it('a des identifiants uniques dans chaque espace', () => {
    for (const espace of ESPACES) {
      const ids = VARIANTES[espace.id].map((v) => v.id)
      expect(new Set(ids).size, `espace « ${espace.id} »`).toBe(ids.length)
    }
  })

  const toutes = ESPACES.flatMap((e) => VARIANTES[e.id].map((v) => [`${e.id}/${v.id}`, v] as const))

  it.each(toutes)(
    '« %s » est complète',
    async (_cle, meta) => {
      expect(meta.nom).not.toBe('')
      expect(meta.description).not.toBe('')
      const { default: vues } = await meta.charger()
      expect(Object.values(vues).filter(Boolean).length).toBeGreaterThan(0)
    },
    30_000,
  )
})
