import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom ne mesure rien : un ResizeObserver muet suffit aux composants qui lisent leur largeur
// (ils n'affichent alors pas leur graphique, ce que les tests n'ont pas besoin de voir).
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
