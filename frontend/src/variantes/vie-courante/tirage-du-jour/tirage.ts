import { useEffect, useState } from 'react'

import { aujourdhui } from '../../../commun/format'

const CLE = 'oh-hisse.variantes.tirage-du-jour'

/**
 * Comment la feuille entre :
 * - `tirage` : la première ouverture du jour, le rouleau balaie la page (animations « Cinéma ») ;
 * - `glisse` : les ouvertures suivantes, l'encre est sèche, un simple glissement vertical ;
 * - `fondu` : le niveau « Sobre », un fondu sans rouleau ni calage ;
 * - `fixe` : le niveau « Immobile », la page est affichée directement.
 */
export type Entree = 'tirage' | 'glisse' | 'fondu' | 'fixe'

export type NiveauAnimation = 'cinema' | 'sobre' | 'immobile'

/** Le niveau d'animation choisi dans les réglages (attribut posé sur <html> par le thème). */
export function niveauAnimation(): NiveauAnimation {
  const valeur = typeof document === 'undefined' ? undefined : document.documentElement.dataset.animations
  return valeur === 'sobre' || valeur === 'immobile' ? valeur : 'cinema'
}

/** Pure : l'entrée de la feuille selon le niveau d'animation et la date du dernier tirage. */
export function choisirEntree(niveau: NiveauAnimation, dernierTirage: string | null, jour: string): Entree {
  if (niveau === 'immobile') return 'fixe'
  if (niveau === 'sobre') return 'fondu'
  return dernierTirage === jour ? 'glisse' : 'tirage'
}

function lireDernierTirage(): string | null {
  try {
    return localStorage.getItem(CLE)
  } catch {
    // Stockage indisponible (navigation privée) : on tire la feuille à chaque ouverture.
    return null
  }
}

function noterTirage(jour: string) {
  try {
    localStorage.setItem(CLE, jour)
  } catch {
    // Pas de mémoire : tant pis, la cérémonie se rejouera.
  }
}

/**
 * La façon dont la feuille entre, décidée une fois à l'ouverture, et `fini()` à appeler quand
 * l'animation d'entrée est terminée (la feuille retrouve alors ses débords). Le jour du tirage
 * est noté dès l'ouverture : un rechargement en cours de cérémonie ne la rejoue pas.
 */
export function useEntree(): [Entree, () => void] {
  const [initiale] = useState(() => choisirEntree(niveauAnimation(), lireDernierTirage(), aujourdhui()))
  const [entree, setEntree] = useState<Entree>(initiale)
  useEffect(() => {
    noterTirage(aujourdhui())
  }, [])
  return [entree, () => setEntree('fixe')]
}
