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

const racine = document.getElementById('root')
if (!racine) throw new Error('Élément #root introuvable dans index.html')

createRoot(racine).render(
  <StrictMode>
    <BrowserRouter>
      <FournisseurTheme>
        <FournisseurSession>
          <App />
        </FournisseurSession>
      </FournisseurTheme>
    </BrowserRouter>
  </StrictMode>,
)
