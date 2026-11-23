import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ContexteTheme } from './contexte'
import styles from './FournisseurTheme.module.css'
import { ecrirePreferences, lirePreferences, type Preferences } from './preferences'
import { metaTheme, THEME_PAR_DEFAUT, THEMES } from './registre'
import type { MetaTheme, NiveauAnimation, Theme } from './types'

interface Courant {
  id: string
  theme: Theme
}

interface Props {
  children: ReactNode
  /** Les thèmes disponibles (le registre, sauf dans les tests). */
  themes?: readonly MetaTheme[]
  /** Durée minimale du voile pendant un changement, en ms : il évite un saut brutal. */
  dureeVoile?: number
}

const pause = (ms: number) => new Promise<void>((fin) => setTimeout(fin, ms))

/**
 * Charge le thème choisi (et lui seul), le remplace à la demande, mémorise les
 * réglages. Un thème qui ne se charge pas ne remplace jamais celui qui marche.
 */
export function FournisseurTheme({ children, themes = THEMES, dureeVoile = 280 }: Props) {
  const [preferences, setPreferences] = useState<Preferences>(() => lirePreferences(themes))
  const [idInitial] = useState(preferences.theme)
  const [courant, setCourant] = useState<Courant | null>(null)
  const courantRef = useRef<Courant | null>(null)
  const [enChangement, setEnChangement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  // Un thème n'est téléchargé qu'une fois : on garde la promesse de chacun.
  const chargements = useRef(new Map<string, Promise<Theme>>())

  const charger = useCallback(
    (id: string): Promise<Theme> => {
      const connu = chargements.current.get(id)
      if (connu) return connu
      const meta = metaTheme(id, themes)
      if (!meta) return Promise.reject(new Error(`Thème inconnu : ${id}`))
      const promesse = meta.charger().then((m) => m.default)
      // En cas d'échec (réseau), on oublie la promesse pour qu'un nouvel essai soit possible.
      promesse.catch(() => chargements.current.delete(id))
      chargements.current.set(id, promesse)
      return promesse
    },
    [themes],
  )

  const poser = useCallback((suivant: Courant) => {
    const precedent = courantRef.current
    courantRef.current = suivant
    setCourant(suivant)
    if (precedent && precedent.theme !== suivant.theme) precedent.theme.liberer?.()
  }, [])

  // Premier chargement : le thème mémorisé, sinon le thème par défaut.
  useEffect(() => {
    let annule = false
    void (async () => {
      for (const id of new Set([idInitial, THEME_PAR_DEFAUT])) {
        try {
          const theme = await charger(id)
          if (!annule) poser({ id, theme })
          return
        } catch {
          // Essai suivant.
        }
      }
      if (!annule) setErreur('Le thème n’a pas pu être chargé. Recharge la page.')
    })()
    return () => {
      annule = true
    }
  }, [idInitial, charger, poser])

  const choisir = useCallback(
    async (id: string) => {
      const meta = metaTheme(id, themes)
      if (!meta || id === courantRef.current?.id) return
      setEnChangement(true)
      setErreur(null)
      try {
        const [theme] = await Promise.all([charger(id), pause(dureeVoile)])
        poser({ id, theme })
        setPreferences((p) => ({ ...p, theme: id }))
      } catch {
        setErreur(`Le thème « ${meta.nom} » n’a pas pu être chargé. Le précédent reste en place.`)
      } finally {
        setEnChangement(false)
      }
    },
    [themes, charger, poser, dureeVoile],
  )

  const prechauffer = useCallback(
    (id: string) => {
      charger(id).catch(() => undefined)
    },
    [charger],
  )

  const basculerFavori = useCallback((id: string) => {
    setPreferences((p) => ({
      ...p,
      favoris: p.favoris.includes(id) ? p.favoris.filter((f) => f !== id) : [...p.favoris, id],
    }))
  }, [])

  const reglerAnimation = useCallback((animation: NiveauAnimation) => {
    setPreferences((p) => ({ ...p, animation }))
  }, [])

  useEffect(() => {
    ecrirePreferences(preferences)
  }, [preferences])

  // Les feuilles de style des thèmes se rattachent à ces deux attributs.
  useEffect(() => {
    if (courant) document.documentElement.dataset.theme = courant.id
  }, [courant])
  useEffect(() => {
    document.documentElement.dataset.animations = preferences.animation
  }, [preferences.animation])

  const valeur = useMemo(
    () => ({
      theme: courant?.theme ?? null,
      id: courant?.id ?? preferences.theme,
      themes,
      enChangement,
      erreur,
      choisir,
      prechauffer,
      favoris: preferences.favoris,
      basculerFavori,
      animation: preferences.animation,
      reglerAnimation,
    }),
    [
      courant,
      preferences,
      themes,
      enChangement,
      erreur,
      choisir,
      prechauffer,
      basculerFavori,
      reglerAnimation,
    ],
  )

  return (
    <ContexteTheme value={valeur}>
      {children}
      <div className={styles.voile} data-actif={enChangement || undefined} aria-hidden="true" />
      {enChangement && (
        <p className="sr-only" role="status">
          Changement de thème…
        </p>
      )}
    </ContexteTheme>
  )
}
