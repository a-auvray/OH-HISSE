import { animate } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { nombre } from '../../commun/format'

/** Un nombre qui se met en place en comptant depuis sa valeur précédente (ou zéro). */
export function Compteur({ valeur, decimales = 0 }: { valeur: number; decimales?: number }) {
  const [affiche, setAffiche] = useState(0)
  const depart = useRef(0)

  useEffect(() => {
    const lecture = animate(depart.current, valeur, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        depart.current = v
        setAffiche(v)
      },
    })
    return () => lecture.stop()
  }, [valeur])

  return <>{nombre(Number(affiche.toFixed(decimales)))}</>
}
