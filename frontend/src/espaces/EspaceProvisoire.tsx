import { Link } from 'react-router'

import { espaceParId, type IdEspace } from './espaces'

/** Page d'attente d'un espace, en attendant qu'il soit construit. */
export function EspaceProvisoire({ id }: { id: IdEspace }) {
  const espace = espaceParId(id)
  return (
    <main
      data-espace={id}
      style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', gap: 'var(--espace-4)' }}
    >
      <h1 style={{ color: 'var(--accent)', fontSize: '3rem' }}>{espace.nom}</h1>
      <p style={{ color: 'var(--texte-doux)' }}>{espace.devise}</p>
      <Link to="/">← Accueil</Link>
    </main>
  )
}
