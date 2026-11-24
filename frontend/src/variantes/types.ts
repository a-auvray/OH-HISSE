import type { IdEspace } from '../espaces/espaces'
import type { VuesMarine, VuesObjectifs, VuesStreetlifting, VuesVieCourante } from '../themes/espacesCommuns'

/** Les vues qu'une variante peut donner, par espace : celles de l'accueil de l'espace, rien d'autre. */
export interface VuesParEspace {
  streetlifting: VuesStreetlifting
  marine: VuesMarine
  'vie-courante': VuesVieCourante
  objectifs: VuesObjectifs
}

/**
 * Une variante est une autre façon de montrer les pages principales d'un espace
 * (une direction du lookbook). Elle ne lit que les jetons du thème : elle prend donc
 * ses couleurs, ses polices et son ton dans n'importe quel thème, dans sa coque.
 * Les données et les gestes sont ceux de l'application, comme pour un thème.
 */
export interface MetaVariante<E extends IdEspace = IdEspace> {
  /** Unique dans son espace. */
  id: string
  espace: E
  nom: string
  /** Une phrase : ce qu'on y voit. */
  description: string
  /** Le code de la variante n'est téléchargé qu'au premier choix. */
  charger: () => Promise<{ default: VuesParEspace[E] }>
}
