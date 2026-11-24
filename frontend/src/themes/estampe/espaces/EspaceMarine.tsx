import { EspaceMarineCommun } from '../../espacesCommuns'
import { Coque } from '../Coque'
import { ConditionsEstampe } from '../marine/Conditions'

const vues = { Conditions: ConditionsEstampe }

export function EspaceMarineEstampe() {
  return <EspaceMarineCommun Coque={Coque} vues={vues} />
}
