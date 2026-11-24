import {
  EspaceMarineCommun,
  EspaceObjectifsCommun,
  EspaceStreetliftingCommun,
  EspaceVieCouranteCommun,
} from '../espacesCommuns'
import { Coque } from './Coque'

/** Les quatre espaces de Matière : les pages communes, dans la coque Matière. */
export const EspaceStreetliftingMatiere = () => <EspaceStreetliftingCommun Coque={Coque} />
export const EspaceVieCouranteMatiere = () => <EspaceVieCouranteCommun Coque={Coque} />
export const EspaceMarineMatiere = () => <EspaceMarineCommun Coque={Coque} />
export const EspaceObjectifsMatiere = () => <EspaceObjectifsCommun Coque={Coque} />
