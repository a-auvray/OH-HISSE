import { AnalyseThemee } from '../../AnalyseThemee'
import styles from './Analyse.module.css'

/** L'analyse en Estampe : la structure est commune, la feuille de style en fait la page de ce thème. */
export function AnalyseEstampe() {
  return <AnalyseThemee styles={styles} />
}
