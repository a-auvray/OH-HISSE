import type { VuesObjectifs } from '../../../themes/espacesCommuns'
import { ObjectifsDrisses } from './Objectifs'

/** Les vues des Drisses de Gabo : l'espace Objectifs n'en a qu'une, et c'est la seule que la variante remplace. */
const vues = { Objectifs: ObjectifsDrisses } satisfies VuesObjectifs

export default vues
