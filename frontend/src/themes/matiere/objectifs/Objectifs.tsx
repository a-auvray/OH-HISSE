import { ObjectifsThemee } from '../../ObjectifsThemee'
import { Eprouvette } from './Eprouvette'
import styles from './Objectifs.module.css'

/** Les objectifs en Matière : chacun est une éprouvette de polymère dont les franges se resserrent. */
export function ObjectifsMatiere() {
  return <ObjectifsThemee styles={styles} Progression={Eprouvette} />
}
