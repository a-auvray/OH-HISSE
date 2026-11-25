import type { VuesStreetlifting } from '../../../themes/espacesCommuns'
import { AnalyseLigneDeCharge } from './Analyse'
import { SeanceDuJourLigneDeCharge } from './SeanceDuJour'

/** Les deux pages principales de l'espace, vues en « Ligne de charge ». */
const vues: VuesStreetlifting = {
  SeanceDuJour: SeanceDuJourLigneDeCharge,
  Analyse: AnalyseLigneDeCharge,
}

export default vues
