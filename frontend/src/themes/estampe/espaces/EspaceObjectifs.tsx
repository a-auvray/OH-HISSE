import { EspaceObjectifsCommun } from '../../espacesCommuns'
import { Coque } from '../Coque'
import { ObjectifsEstampe } from '../objectifs/Objectifs'

const vues = { Objectifs: ObjectifsEstampe }

export function EspaceObjectifsEstampe() {
  return <EspaceObjectifsCommun Coque={Coque} vues={vues} />
}
