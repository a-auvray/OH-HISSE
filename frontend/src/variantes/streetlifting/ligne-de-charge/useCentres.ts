import { type RefObject, useLayoutEffect, useState } from 'react'

/** Les centres des éléments `[data-plaque]` du cadre, en part de sa largeur (0 à 1), ou null sans mesure possible. */
function mesurer(element: HTMLElement): number[] | null {
  const base = element.getBoundingClientRect()
  if (base.width <= 0) return null
  return [...element.querySelectorAll<HTMLElement>('[data-plaque]')].map((p) => {
    const r = p.getBoundingClientRect()
    return (r.left + r.width / 2 - base.left) / base.width
  })
}

/**
 * L'abscisse du centre de chaque élément `[data-plaque]` du cadre, en part de sa largeur (0 à 1).
 * La ligne de charge s'appuie ainsi exactement au-dessus de la plaque choisie, quelle que soit la mise en
 * page. On mesure l'élément fixe, pas celui qui glisse à l'entrée, sans quoi le point de charge partirait
 * du mauvais endroit. Sans mesure (largeur nulle), la liste reste vide : l'appelant répartit lui-même.
 */
export function useCentres(cadre: RefObject<HTMLElement | null>, nombre: number, largeur: number): number[] {
  const [centres, setCentres] = useState<number[]>([])

  useLayoutEffect(() => {
    const element = cadre.current
    if (!element) return
    // Seulement quand le nombre de plaques ou la largeur changent : pas de boucle de rendu possible.
    const mesures = largeur > 0 ? mesurer(element) : null
    // La mise en page du navigateur est la source : on la lit après le rendu, avant la peinture.
    // oxlint-disable-next-line react/set-state-in-effect
    if (mesures) setCentres(mesures)
  }, [cadre, nombre, largeur])

  return centres
}
