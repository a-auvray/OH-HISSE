import { animate } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { useNiveauAnimation } from './useNiveauAnimation'

/**
 * Un nombre entier qui compte depuis sa valeur précédente (celle de la dernière visite, ou zéro)
 * jusqu'à la valeur du jour : un palier franchi se lit sur le chiffre. En mode sobre ou immobile,
 * la valeur est posée tout de suite. Les chiffres sont tabulaires : la largeur ne bouge pas en comptant.
 */
export function Compteur({ valeur, depart = 0 }: { valeur: number; depart?: number }) {
  const niveau = useNiveauAnimation()
  const [anime, setAnime] = useState(depart)
  const courant = useRef(depart)

  useEffect(() => {
    if (niveau !== 'cinema') return
    const lecture = animate(courant.current, valeur, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        courant.current = v
        setAnime(v)
      },
    })
    return () => lecture.stop()
  }, [valeur, niveau])

  return <>{Math.round(niveau === 'cinema' ? anime : valeur)}</>
}
