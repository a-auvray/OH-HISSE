import { ObjectifsThemee } from '../../ObjectifsThemee'
import { Cables } from './Cables'
import styles from './Objectifs.module.css'

/** Les objectifs en Estampe : chacun est une drisse de câbles qui se tendent vers la cible. */
export function ObjectifsEstampe() {
  return <ObjectifsThemee styles={styles} Progression={Cables} />
}
