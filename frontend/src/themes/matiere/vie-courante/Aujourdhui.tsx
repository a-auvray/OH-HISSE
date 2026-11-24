import { AujourdhuiThemee } from '../../AujourdhuiThemee'
import styles from './Aujourdhui.module.css'
import { Albatre, Eprouvettes } from './Jauges'

/** Vie courante en Matière : un disque d'albâtre éclairé par la récupération, des éprouvettes pour l'écart. */
export function AujourdhuiMatiere() {
  return <AujourdhuiThemee styles={styles} Recuperation={Albatre} Ecart={Eprouvettes} />
}
