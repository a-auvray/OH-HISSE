import type { Conditions } from '../../../api/types'
import { ConditionsThemee } from '../../ConditionsThemee'
import styles from './Conditions.module.css'
import { PlaqueEstran } from './PlaqueEstran'

/** Les conditions de la mer en Matière : une plaque d'estran, des instruments gravés sur des plaques. */
export function ConditionsMatiere({ conditions, spotId }: { conditions: Conditions; spotId: number | null }) {
  return <ConditionsThemee conditions={conditions} spotId={spotId} styles={styles} Graphique={PlaqueEstran} />
}
