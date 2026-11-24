// Polices communes à la connexion et à tous les thèmes ; chaque thème charge les siennes.
import '@fontsource-variable/manrope'
import '@fontsource-variable/unbounded'
import './styles/global.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import { App } from './App'
import { FournisseurSession } from './session/FournisseurSession'
import { FournisseurTheme } from './themes/FournisseurTheme'
import { FournisseurVariantes } from './variantes/FournisseurVariantes'

const racine = document.getElementById('root')
if (!racine) throw new Error('Élément #root introuvable dans index.html')

createRoot(racine).render(
  <StrictMode>
    <BrowserRouter>
      <FournisseurTheme>
        <FournisseurVariantes>
          <FournisseurSession>
            <App />
          </FournisseurSession>
        </FournisseurVariantes>
      </FournisseurTheme>
    </BrowserRouter>
  </StrictMode>,
)
