import { Coque } from '../Coque'
import { EspaceStreetliftingCommun } from '../../espacesCommuns'
import { AnalyseEstampe } from '../streetlifting/Analyse'
import { SeanceDuJourEstampe } from '../streetlifting/SeanceDuJour'

const vues = { SeanceDuJour: SeanceDuJourEstampe, Analyse: AnalyseEstampe }

export function EspaceStreetliftingEstampe() {
  return <EspaceStreetliftingCommun Coque={Coque} vues={vues} />
}
