import { describe, expect, it } from 'vitest'

import { ESPACES } from '../espaces/espaces'
import { THEME_PAR_DEFAUT, THEMES } from './registre'

/**
 * Garde-fou commun à tous les thèmes : chacun doit fournir l'accueil, les
 * quatre espaces et sa transition. L'oubli d'une pièce fait échouer la CI
 * avant qu'un visiteur ne tombe sur une page vide.
 */
describe('contrat des thèmes', () => {
  it('a des identifiants uniques et un thème par défaut', () => {
    const ids = THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(THEME_PAR_DEFAUT)
  })

  it.each(THEMES.map((t) => [t.id, t] as const))('« %s » est complet', async (_id, meta) => {
    expect(meta.nom).not.toBe('')
    expect(meta.apercu.length).toBeGreaterThan(1)

    const { default: theme } = await meta.charger()
    expect(theme.Accueil).toBeTruthy()
    expect(theme.Scene).toBeTruthy()
    for (const espace of ESPACES) {
      expect(theme.Espaces[espace.id], `espace « ${espace.id} » manquant`).toBeTruthy()
    }
  })
})
