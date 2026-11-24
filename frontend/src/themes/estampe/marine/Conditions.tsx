import type { Conditions } from '../../../api/types'
import { ConditionsThemee } from '../../ConditionsThemee'
import styles from './Conditions.module.css'
import { CourbeEncre } from './CourbeEncre'

/** Les conditions de la mer en Estampe : une courbe de marégraphe, des instruments sur filets. */
export function ConditionsEstampe({ conditions, spotId }: { conditions: Conditions; spotId: number | null }) {
  return <ConditionsThemee conditions={conditions} spotId={spotId} styles={styles} Graphique={CourbeEncre} />
}
