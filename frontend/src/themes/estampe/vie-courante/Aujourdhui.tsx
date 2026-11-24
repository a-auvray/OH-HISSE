import { AujourdhuiThemee } from '../../AujourdhuiThemee'
import styles from './Aujourdhui.module.css'
import { Fibres, Strates } from './Jauges'

/** Vie courante en Estampe : des fibres qui poussent, des strates qui s'encrent, des filets. */
export function AujourdhuiEstampe() {
  return <AujourdhuiThemee styles={styles} Recuperation={Fibres} Ecart={Strates} />
}
