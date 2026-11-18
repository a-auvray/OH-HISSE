import { Route, Routes } from 'react-router'

import { Accueil } from './accueil/Accueil'
import { EspaceProvisoire } from './espaces/EspaceProvisoire'
import { ESPACES } from './espaces/espaces'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Accueil />} />
      {ESPACES.map((espace) => (
        <Route key={espace.id} path={espace.chemin} element={<EspaceProvisoire id={espace.id} />} />
      ))}
    </Routes>
  )
}
