import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ESPACES, type IdEspace } from '../espaces/espaces'
import { ContexteVariantes, type ContexteVariantesValeur } from './contexte'
import { type ChoixVariantes, ecrireChoix, lireChoix } from './preferences'
import { metaVariante, VARIANTES } from './registre'
import type { MetaVariante, VuesParEspace } from './types'

interface Props {
  children: ReactNode
  /** Les variantes disponibles (le registre, sauf dans les tests). */
  variantes?: Readonly<Record<IdEspace, readonly MetaVariante[]>>
}

type Chargees = { [E in IdEspace]?: { id: string; vues: VuesParEspace[E] } }

/**
 * Charge les variantes choisies (et elles seules) et les offre aux espaces. Une variante qui ne
 * se charge pas ne remplace rien : l'espace garde les vues de son thème et un message s'affiche.
 */
export function FournisseurVariantes({ children, variantes = VARIANTES }: Props) {
  const [choix, setChoix] = useState<ChoixVariantes>(() => lireChoix(variantes))
  const [chargees, setChargees] = useState<Chargees>({})
  const [enChargement, setEnChargement] = useState<ReadonlySet<IdEspace>>(new Set())
  const [erreur, setErreur] = useState<string | null>(null)
  // Une variante n'est téléchargée qu'une fois : on garde la promesse de chacune.
  const chargements = useRef(new Map<string, Promise<VuesParEspace[IdEspace]>>())
  // Les choix ne sont mémorisés qu'après un vrai geste, comme pour les thèmes.
  const modifies = useRef(false)

  const charger = useCallback(
    (espace: IdEspace, id: string): Promise<VuesParEspace[IdEspace]> => {
      const cle = `${espace}/${id}`
      const connu = chargements.current.get(cle)
      if (connu) return connu
      const meta = metaVariante(espace, id, variantes)
      if (!meta) return Promise.reject(new Error(`Variante inconnue : ${cle}`))
      const promesse = meta.charger().then((m) => m.default)
      promesse.catch(() => chargements.current.delete(cle))
      chargements.current.set(cle, promesse)
      return promesse
    },
    [variantes],
  )

  // Les variantes mémorisées se chargent au démarrage, chacune pour son espace.
  useEffect(() => {
    let annule = false
    for (const { id: espace } of ESPACES) {
      const id = choix[espace]
      if (!id) continue
      void charger(espace, id).then(
        (vues) => {
          if (!annule) setChargees((c) => ({ ...c, [espace]: { id, vues } }))
        },
        () => {
          if (!annule) setErreur(`La vue « ${id} » n’a pas pu être chargée : l’espace garde celle du thème.`)
        },
      )
    }
    return () => {
      annule = true
    }
    // Au démarrage seulement : ensuite, `choisir` charge et pose lui-même.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const choisir = useCallback(
    (espace: IdEspace, id: string | null) => {
      modifies.current = true
      setErreur(null)
      setChoix((c) => {
        const suivant = { ...c }
        if (id) suivant[espace] = id
        else delete suivant[espace]
        return suivant
      })
      if (!id) {
        setChargees((c) => {
          const suivant = { ...c }
          delete suivant[espace]
          return suivant
        })
        return
      }
      setEnChargement((e) => new Set(e).add(espace))
      charger(espace, id)
        .then((vues) => setChargees((c) => ({ ...c, [espace]: { id, vues } })))
        .catch(() => {
          // La variante n'est pas venue : on oublie ce choix, le thème garde la main.
          setChoix((c) => {
            if (c[espace] !== id) return c
            const suivant = { ...c }
            delete suivant[espace]
            return suivant
          })
          setErreur(`La vue « ${id} » n’a pas pu être chargée : l’espace garde celle du thème.`)
        })
        .finally(() =>
          setEnChargement((e) => {
            const suivant = new Set(e)
            suivant.delete(espace)
            return suivant
          }),
        )
    },
    [charger],
  )

  const prechauffer = useCallback(
    (espace: IdEspace, id: string) => {
      charger(espace, id).catch(() => undefined)
    },
    [charger],
  )

  useEffect(() => {
    if (modifies.current) ecrireChoix(choix)
  }, [choix])

  const valeur = useMemo<ContexteVariantesValeur>(
    () => ({
      variantes,
      choisie: (espace) => choix[espace] ?? null,
      // Une vue n'est donnée que tant que le choix lui correspond (un retour au thème la retire aussitôt).
      vues: Object.fromEntries(
        ESPACES.flatMap(({ id }) => {
          const c = chargees[id]
          return c && choix[id] === c.id ? [[id, c.vues]] : []
        }),
      ),
      enChargement: (espace) => enChargement.has(espace),
      choisir,
      prechauffer,
      erreur,
    }),
    [variantes, choix, chargees, enChargement, choisir, prechauffer, erreur],
  )

  return <ContexteVariantes value={valeur}>{children}</ContexteVariantes>
}
