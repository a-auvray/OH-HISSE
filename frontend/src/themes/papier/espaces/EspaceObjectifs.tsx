import { Coque } from '../Coque'
import { ObjectifsPapier } from '../objectifs/Objectifs'

/** Objectifs en Papier : une seule page, des drisses qu'on hisse vers leur cible. */
export function EspaceObjectifsPapier() {
  return (
    <Coque espace="objectifs" titre="Objectifs" onglets={[]}>
      <ObjectifsPapier />
    </Coque>
  )
}
