import { type RefObject, useLayoutEffect, useRef, useState } from 'react'

/**
 * Largeur d'un élément, mesurée dès le montage puis suivie à chaque
 * redimensionnement. La première mesure ne dépend pas de ResizeObserver,
 * dont le premier signal peut tarder (onglet en arrière-plan).
 */
export function useLargeur<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [largeur, setLargeur] = useState(0)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    setLargeur(element.getBoundingClientRect().width)
    const observateur = new ResizeObserver(([entree]) => {
      if (entree) setLargeur(entree.contentRect.width)
    })
    observateur.observe(element)
    return () => observateur.disconnect()
  }, [])

  return [ref, largeur]
}
