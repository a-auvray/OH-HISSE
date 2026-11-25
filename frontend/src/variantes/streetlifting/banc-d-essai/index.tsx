import type { VuesStreetlifting } from '../../../themes/espacesCommuns'
import { AnalyseBanc } from './Analyse'
import { SeanceDuJourBanc } from './SeanceDuJour'

/** Les vues du Banc d'essai : la séance du jour et l'analyse. Les autres pages restent celles du thème. */
const vues = {
  SeanceDuJour: SeanceDuJourBanc,
  Analyse: AnalyseBanc,
} satisfies VuesStreetlifting

export default vues
