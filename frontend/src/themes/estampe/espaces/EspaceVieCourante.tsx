import { EspaceVieCouranteCommun } from '../../espacesCommuns'
import { Coque } from '../Coque'
import { AujourdhuiEstampe } from '../vie-courante/Aujourdhui'

const vues = { Aujourdhui: AujourdhuiEstampe }

export function EspaceVieCouranteEstampe() {
  return <EspaceVieCouranteCommun Coque={Coque} vues={vues} />
}
