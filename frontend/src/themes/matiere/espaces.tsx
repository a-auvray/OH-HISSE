import {
  EspaceMarineCommun,
  EspaceObjectifsCommun,
  EspaceStreetliftingCommun,
  EspaceVieCouranteCommun,
} from '../espacesCommuns'
import { Coque } from './Coque'
import { AnalyseMatiere } from './streetlifting/Analyse'
import { SeanceDuJourMatiere } from './streetlifting/SeanceDuJour'

/** Les quatre espaces de Matière : les pages communes, dans la coque Matière. */
const vuesStreetlifting = { SeanceDuJour: SeanceDuJourMatiere, Analyse: AnalyseMatiere }
export const EspaceStreetliftingMatiere = () => (
  <EspaceStreetliftingCommun Coque={Coque} vues={vuesStreetlifting} />
)
export const EspaceVieCouranteMatiere = () => <EspaceVieCouranteCommun Coque={Coque} />
export const EspaceMarineMatiere = () => <EspaceMarineCommun Coque={Coque} />
export const EspaceObjectifsMatiere = () => <EspaceObjectifsCommun Coque={Coque} />
