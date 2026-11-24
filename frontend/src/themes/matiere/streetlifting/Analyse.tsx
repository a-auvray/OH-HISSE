import { AnalyseThemee } from '../../AnalyseThemee'
import styles from './Analyse.module.css'

/** L'analyse en Matiere : la structure est commune, la feuille de style en fait la page de ce thème. */
export function AnalyseMatiere() {
  return <AnalyseThemee styles={styles} />
}
