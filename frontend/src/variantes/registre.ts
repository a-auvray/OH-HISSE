import { ESPACES, type IdEspace } from '../espaces/espaces'
import type { MetaVariante } from './types'

/*
 * Les variantes se déclarent d'elles-mêmes : chaque dossier `variantes/<espace>/<id>/`
 * a un `meta.ts` qui exporte sa `MetaVariante` par défaut. Seuls ces petits fichiers
 * sont dans le paquet ; le code d'une variante n'arrive qu'à son premier choix.
 */
const metas = import.meta.glob<MetaVariante>('./*/*/meta.ts', { eager: true, import: 'default' })

export const VARIANTES: Readonly<Record<IdEspace, readonly MetaVariante[]>> = Object.fromEntries(
  ESPACES.map((espace) => [
    espace.id,
    Object.values(metas)
      .filter((m) => m.espace === espace.id)
      .sort((a, b) => a.id.localeCompare(b.id)),
  ]),
) as Record<IdEspace, MetaVariante[]>

export function metaVariante(
  espace: IdEspace,
  id: string,
  variantes: Readonly<Record<IdEspace, readonly MetaVariante[]>> = VARIANTES,
): MetaVariante | undefined {
  return variantes[espace].find((v) => v.id === id)
}
