import { type ComponentType, createElement, useContext } from 'react'

import type { IdEspace } from '../espaces/espaces'
import { ContexteVariantes } from './contexte'
import type { VuesParEspace } from './types'

type VueDe<E extends IdEspace, N extends keyof VuesParEspace[E]> = NonNullable<VuesParEspace[E][N]>
type PropsDe<E extends IdEspace, N extends keyof VuesParEspace[E]> =
  VueDe<E, N> extends ComponentType<infer P> ? P : never

/**
 * Une page principale d'un espace : la vue de la variante choisie pour cet espace si elle en
 * donne une, sinon celle du thème (`parDefaut`). Sans fournisseur (tests), toujours celle du thème.
 */
export function Vue<E extends IdEspace, N extends keyof VuesParEspace[E]>({
  espace,
  nom,
  parDefaut,
  props,
}: {
  espace: E
  nom: N
  parDefaut: VueDe<E, N>
  props?: PropsDe<E, N>
}) {
  const vues = useContext(ContexteVariantes)?.vues[espace] as VuesParEspace[E] | undefined
  const choisie = (vues?.[nom] ?? parDefaut) as unknown as ComponentType<Record<string, unknown>>
  return createElement(choisie, props as Record<string, unknown> | undefined)
}
