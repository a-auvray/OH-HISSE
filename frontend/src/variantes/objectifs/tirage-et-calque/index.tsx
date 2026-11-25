import type { VuesObjectifs } from '../../../themes/espacesCommuns'
import { ObjectifsTirage } from './Objectifs'

/** Les vues de « Tirage et Calque » : celles qu'il ne donne pas restent celles du thème. */
const vues = { Objectifs: ObjectifsTirage } satisfies VuesObjectifs

export default vues
