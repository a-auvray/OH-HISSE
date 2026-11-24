import {
  EspaceMarineCommun,
  EspaceObjectifsCommun,
  EspaceStreetliftingCommun,
  EspaceVieCouranteCommun,
} from '../espacesCommuns'
import { Coque } from './Coque'
import { ConditionsMatiere } from './marine/Conditions'
import { ObjectifsMatiere } from './objectifs/Objectifs'
import { AnalyseMatiere } from './streetlifting/Analyse'
import { SeanceDuJourMatiere } from './streetlifting/SeanceDuJour'
import { AujourdhuiMatiere } from './vie-courante/Aujourdhui'

/** Les quatre espaces de Matière : les pages communes, dans la coque Matière. */
const vuesStreetlifting = { SeanceDuJour: SeanceDuJourMatiere, Analyse: AnalyseMatiere }
export const EspaceStreetliftingMatiere = () => (
  <EspaceStreetliftingCommun Coque={Coque} vues={vuesStreetlifting} />
)
const vuesVieCourante = { Aujourdhui: AujourdhuiMatiere }
export const EspaceVieCouranteMatiere = () => <EspaceVieCouranteCommun Coque={Coque} vues={vuesVieCourante} />
const vuesMarine = { Conditions: ConditionsMatiere }
export const EspaceMarineMatiere = () => <EspaceMarineCommun Coque={Coque} vues={vuesMarine} />
const vuesObjectifs = { Objectifs: ObjectifsMatiere }
export const EspaceObjectifsMatiere = () => <EspaceObjectifsCommun Coque={Coque} vues={vuesObjectifs} />
