import { useCallback, useEffect, useState } from 'react'

import { useTon } from '../../../themes/ton'
import type { NiveauAnimation } from '../../../themes/types'
import { analyserCouleur, choisirEncres, contraste, ENCRES_PAR_DEFAUT, type EncresMur } from './modele'

/** Le niveau d'animation réglé dans l'application, lu sur `<html data-animations>`. */
function lireAnimation(): NiveauAnimation {
  const valeur = document.documentElement.dataset.animations
  return valeur === 'sobre' || valeur === 'immobile' ? valeur : 'cinema'
}

/**
 * Lit la couleur résolue d'un jeton CSS à l'endroit de `element`. Un jeton peut être un `color-mix`
 * que seul le navigateur sait résoudre : on le pose sur une sonde et on lit sa couleur calculée.
 */
function resoudre(element: HTMLElement, jeton: string) {
  const sonde = document.createElement('span')
  sonde.style.color = `var(${jeton})`
  sonde.style.display = 'none'
  element.append(sonde)
  const couleur = analyserCouleur(getComputedStyle(sonde).color)
  sonde.remove()
  return couleur
}

/**
 * Ce que le mur doit savoir de son environnement : le niveau d'animation, et les deux encres
 * (mur sombre, lumière claire) tirées des jetons du thème et du ton courants. Les encres sont relues
 * quand le ton ou le thème change, jamais à l'import, pour que le canvas suive.
 */
export function useAmbiance() {
  const [ton] = useTon()
  const [animation, setAnimation] = useState<NiveauAnimation>(lireAnimation)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? '')
  const [encres, setEncres] = useState<EncresMur>(ENCRES_PAR_DEFAUT)

  useEffect(() => {
    const racine = document.documentElement
    const observateur = new MutationObserver(() => {
      setAnimation(lireAnimation())
      setTheme(racine.dataset.theme ?? '')
    })
    observateur.observe(racine, { attributes: true, attributeFilter: ['data-animations', 'data-theme'] })
    return () => observateur.disconnect()
  }, [])

  // Un « ref » de rappel plutôt qu'un effet : il est rejoué quand le ton ou le thème change, une fois le
  // DOM à jour, et c'est là que les jetons (parfois des `color-mix`) peuvent être résolus sur le mur.
  const attacher = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return
      const fond = resoudre(element, '--fond')
      const texte = resoudre(element, '--texte')
      // Deux jetons indistinguables (jeton illisible, rendu sans styles) : on garde les encres par défaut.
      if (fond && texte && contraste(fond, texte) >= 3) setEncres(choisirEncres(fond, texte))
    },
    // Le ton et le thème ne sont pas lus dans le rappel : ils ne servent qu'à le refaire quand ils changent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ton, theme],
  )

  return { animation, encres, cle: `${theme}|${ton}`, attacher }
}
