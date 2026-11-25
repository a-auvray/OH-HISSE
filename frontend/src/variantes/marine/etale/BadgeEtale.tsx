import { ENCRES, type Niveau } from './modele'

/**
 * Le niveau de danger en une forme que la couleur ne porte pas seule : disque plein (vert), disque cranté (rouge),
 * disque noir cerclé de blanc (noir). Il est posé sur un disque sombre dédié (le « scrim ») : ses couleurs gardent
 * le même contraste sur le papier clair et sur l'ardoise. Le mot (VERT, ROUGE, NOIR) est toujours écrit à côté.
 */
export function BadgeEtale({ niveau, taille = 48 }: { niveau: Niveau; taille?: number }) {
  const encre = ENCRES.danger[niveau]
  return (
    <svg width={taille} height={taille} viewBox="0 0 48 48" aria-hidden="true" data-niveau={niveau}>
      <circle cx="24" cy="24" r="24" fill={ENCRES.scrim} />
      {niveau === 'rouge' && (
        <circle cx="24" cy="24" r="17.5" fill="none" stroke={encre} strokeWidth="3" strokeDasharray="4.6 3" />
      )}
      <circle
        cx="24"
        cy="24"
        r={niveau === 'rouge' ? 11 : 13}
        fill={encre}
        stroke={niveau === 'noir' ? ENCRES.lisere : 'none'}
        strokeWidth="1.5"
      />
    </svg>
  )
}
