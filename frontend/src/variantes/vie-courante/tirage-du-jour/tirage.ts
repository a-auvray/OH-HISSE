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
 * Combien de temps l'entrée reste posée sur la feuille, en ms : la plus longue de ses animations (pour le
 * tirage, le rose qui s'encre à 1220 ms + 600 ms) et une marge. Les règles de l'entrée (masque, encrage du
 * rose, calage du titre) sont toutes accrochées à `data-entree` : la lâcher plus tôt les couperait en route.
 */
export function dureeEntree(entree: Entree): number {
  switch (entree) {
    case 'tirage':
      return 1900
    case 'glisse':
      return 800
    case 'fondu':
      return 350
    case 'fixe':
      return 0
  }
}

/**
 * La façon dont la feuille entre, décidée une fois à l'ouverture. Au bout de `dureeEntree`, elle repasse
 * à `fixe` et retrouve ses débords ; ce minuteur sert aussi de filet si une animation ne se termine jamais.
 * Le jour du tirage est noté dès l'ouverture : un rechargement en cours de cérémonie ne la rejoue pas.
 */
export function useEntree(): Entree {
  const [initiale] = useState(() => choisirEntree(niveauAnimation(), lireDernierTirage(), aujourdhui()))
  const [entree, setEntree] = useState<Entree>(initiale)
  useEffect(() => {
    noterTirage(aujourdhui())
    if (initiale === 'fixe') return
    const minuteur = setTimeout(() => setEntree('fixe'), dureeEntree(initiale))
    return () => clearTimeout(minuteur)
  }, [initiale])
  return entree
}
