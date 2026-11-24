import { Objectifs } from '../../../espaces/objectifs/EspaceObjectifs'
import { Coque } from '../Coque'

/** Objectifs en Estampe : une seule page, sans onglets. */
export function EspaceObjectifsEstampe() {
  return (
    <Coque espace="objectifs" titre="Objectifs" onglets={[]}>
      <Objectifs />
    </Coque>
  )
}
