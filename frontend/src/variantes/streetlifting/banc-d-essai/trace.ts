import { useEffect, useState } from 'react'

import { aujourdhui } from '../../../commun/format'

const CLE = 'oh-hisse.banc-d-essai.trace'

function lire(nom: string): string | null {
  try {
    return sessionStorage.getItem(`${CLE}.${nom}`)
  } catch {
    // Stockage indisponible (navigation privée) : on trace à chaque visite, ce qui ne coûte rien.
    return null
  }
}

function ecrire(nom: string, jour: string) {
  try {
    sessionStorage.setItem(`${CLE}.${nom}`, jour)
  } catch {
    // Pas de mémoire : tant pis.
  }
}

/**
 * La plume ne trace la courbe qu'à la première visite du jour ; ensuite elle est déjà tracée.
 * La lecture se fait à l'initialisation (sans effet de bord) et l'écriture dans un effet, pour que
 * le double rendu du mode strict ne consomme pas la première visite.
 */
export function useTraceDuJour(nom: string): boolean {
  const jour = aujourdhui()
  const [tracer] = useState(() => lire(nom) !== jour)
  useEffect(() => {
    ecrire(nom, jour)
  }, [nom, jour])
  return tracer
}
