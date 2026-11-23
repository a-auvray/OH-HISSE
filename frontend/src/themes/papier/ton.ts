import { useSyncExternalStore } from 'react'

export type Ton = 'jour' | 'soir'

const CLE = 'oh-hisse.papier.ton'
const EVENEMENT = 'oh-hisse:ton'

/** Mémoire de secours quand le navigateur refuse le stockage (navigation privée) : vaut pour cette visite. */
let secours: Ton | null = null

function lire(): Ton {
  try {
    const valeur = localStorage.getItem(CLE)
    if (valeur === 'soir' || valeur === 'jour') return valeur
  } catch {
    // Stockage indisponible : on retombe sur la mémoire de secours.
  }
  return secours ?? 'jour'
}

function abonner(rappel: () => void) {
  window.addEventListener(EVENEMENT, rappel)
  window.addEventListener('storage', rappel)
  return () => {
    window.removeEventListener(EVENEMENT, rappel)
    window.removeEventListener('storage', rappel)
  }
}

/**
 * Le ton du thème Papier (jour ou soir), partagé par l'accueil et les espaces :
 * le changer à un endroit le change partout, et il est mémorisé.
 */
export function useTon(): [Ton, () => void] {
  const ton = useSyncExternalStore<Ton>(abonner, lire, () => 'jour')
  const basculer = () => {
    const suivant: Ton = lire() === 'jour' ? 'soir' : 'jour'
    try {
      localStorage.setItem(CLE, suivant)
      secours = null
    } catch {
      secours = suivant
    }
    window.dispatchEvent(new Event(EVENEMENT))
  }
  return [ton, basculer]
}
