import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'

import { ContexteSession, type EtatSession, type Session } from '../session/contexte'

export const MOI = { id: 1, nom_affiche: 'Antoine', est_demo: false, expire_le: null }

/** Affiche un composant avec un routeur et une session simulée. */
export function rendre(
  ui: ReactNode,
  {
    etat = { statut: 'connecte', utilisateur: MOI },
    ...actions
  }: Partial<Session> & { etat?: EtatSession } = {},
) {
  const session: Session = {
    etat,
    seConnecter: vi.fn(async () => null),
    entrerEnDemo: vi.fn(async () => null),
    seDeconnecter: vi.fn(async () => undefined),
    ...actions,
  }
  render(
    <MemoryRouter>
      <ContexteSession value={session}>{ui}</ContexteSession>
    </MemoryRouter>,
  )
  return session
}
