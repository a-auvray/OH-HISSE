import {
  EspaceMarineCommun,
  EspaceObjectifsCommun,
  EspaceStreetliftingCommun,
  EspaceVieCouranteCommun,
} from '../espacesCommuns'
import { Coque } from './Coque'
import { ConditionsMatiere } from './marine/Conditions'
import { AnalyseMatiere } from './streetlifting/Analyse'
import { SeanceDuJourMatiere } from './streetlifting/SeanceDuJour'

/** Les quatre espaces de Matière : les pages communes, dans la coque Matière. */
const vuesStreetlifting = { SeanceDuJour: SeanceDuJourMatiere, Analyse: AnalyseMatiere }
export const EspaceStreetliftingMatiere = () => (
  <EspaceStreetliftingCommun Coque={Coque} vues={vuesStreetlifting} />
)
export const EspaceVieCouranteMatiere = () => <EspaceVieCouranteCommun Coque={Coque} />
const vuesMarine = { Conditions: ConditionsMatiere }
export const EspaceMarineMatiere = () => <EspaceMarineCommun Coque={Coque} vues={vuesMarine} />
export const EspaceObjectifsMatiere = () => <EspaceObjectifsCommun Coque={Coque} />
