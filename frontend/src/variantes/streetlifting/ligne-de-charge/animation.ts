import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { avancerRessort, auRepos, type EtatRessort, type ReglageRessort, RESSORT_LOURD } from './modele'

export type Niveau = 'cinema' | 'sobre' | 'immobile'

function lireNiveau(): Niveau {
  const v = document.documentElement.dataset.animations
  return v === 'sobre' || v === 'immobile' ? v : 'cinema'
}

function abonner(rappel: () => void) {
  const observateur = new MutationObserver(rappel)
  observateur.observe(document.documentElement, { attributes: true, attributeFilter: ['data-animations'] })
  return () => observateur.disconnect()
}

/**
 * Le niveau d'animation choisi dans les réglages (`data-animations` sur <html>). Seul « cinéma » joue
 * les ressorts et les comptages : en « sobre » et « immobile » la donnée s'affiche tout de suite à sa valeur.
 */
export function useNiveauAnimation(): Niveau {
  return useSyncExternalStore(abonner, lireNiveau, () => 'cinema')
}

/**
 * Une boucle requestAnimationFrame qui ne tourne que tant qu'elle a du travail, se met en pause quand
 * l'onglet est masqué (et reprend à son retour) et s'arrête au démontage. `pas` reçoit le temps écoulé
 * en secondes et renvoie vrai tant qu'il reste du mouvement.
 */
function boucler(pas: (dt: number) => boolean, pause: () => void): () => void {
  let image = 0
  let precedent = 0
  const tour = (t: number) => {
    const dt = precedent ? Math.min(0.05, (t - precedent) / 1000) : 1 / 60
    precedent = t
    image = pas(dt) ? requestAnimationFrame(tour) : 0
  }
  const demarrer = () => {
    cancelAnimationFrame(image)
    precedent = 0
    if (document.hidden) pause()
    else image = requestAnimationFrame(tour)
  }
  const surVisibilite = () => (document.hidden ? cancelAnimationFrame(image) : demarrer())
  demarrer()
  document.addEventListener('visibilitychange', surVisibilite)
  return () => {
    cancelAnimationFrame(image)
    document.removeEventListener('visibilitychange', surVisibilite)
  }
}

/**
 * La valeur qui suit `cible` comme un ressort lourd : la ligne se tend avec de l'inertie, jamais d'un coup.
 * Part de zéro au montage (la mise en charge). Hors « cinéma », elle vaut directement la cible.
 * `reglage` doit être une constante, sans quoi l'animation redémarre à chaque rendu.
 */
export function useRessort(cible: number, reglage: ReglageRessort = RESSORT_LOURD): number {
  const niveau = useNiveauAnimation()
  const etat = useRef<EtatRessort>({ x: 0, v: 0 })
  const [valeur, setValeur] = useState(0)

  useEffect(() => {
    if (niveau !== 'cinema') return
    return boucler(
      (dt) => {
        etat.current = avancerRessort(etat.current, cible, reglage, dt)
        if (auRepos(etat.current, cible)) {
          etat.current = { x: cible, v: 0 }
          setValeur(cible)
          return false
        }
        setValeur(etat.current.x)
        return true
      },
      // Onglet masqué au départ : on pose directement la valeur, personne ne regarde.
      () => {
        etat.current = { x: cible, v: 0 }
        setValeur(cible)
      },
    )
  }, [cible, niveau, reglage])

  return niveau === 'cinema' ? valeur : cible
}

/** Les chiffres qui défilent jusqu'à `cible` en `duree` secondes (le héros compte jusqu'à sa valeur). */
export function useCompteur(cible: number, duree = 0.6): number {
  const niveau = useNiveauAnimation()
  const [valeur, setValeur] = useState(0)
  const depart = useRef(0)

  useEffect(() => {
    if (niveau !== 'cinema') return
    const debut = depart.current
    let ecoule = 0
    return boucler(
      (dt) => {
        ecoule += dt
        const t = Math.min(1, ecoule / duree)
        // Ease-out : le compte ralentit en approchant de la charge.
        const eased = 1 - (1 - t) ** 3
        const courant = t >= 1 ? cible : debut + (cible - debut) * eased
        depart.current = courant
        setValeur(courant)
        return t < 1
      },
      () => {
        depart.current = cible
        setValeur(cible)
      },
    )
  }, [cible, duree, niveau])

  return niveau === 'cinema' ? valeur : cible
}
