import { Link } from 'react-router'

import { OPPOSE } from '../navigation/directions'
import styles from './BoutonRetour.module.css'
import { espaceParId, type Direction, type IdEspace } from './espaces'

const LIBELLE: Record<Direction, string> = {
  haut: '↑ Accueil',
  bas: '↓ Accueil',
  gauche: '← Accueil',
  droite: 'Accueil →',
}

/**
 * Retour à l'accueil, posé du côté où il se trouve : en Vie courante (en
 * haut), on redescend ; en Marine (à droite), on repart vers la gauche.
 */
export function BoutonRetour({ espace }: { espace: IdEspace }) {
  const cote = OPPOSE[espaceParId(espace).direction]
  return (
    <Link to="/" className={styles.retour} data-cote={cote}>
      {LIBELLE[cote]}
    </Link>
  )
}
