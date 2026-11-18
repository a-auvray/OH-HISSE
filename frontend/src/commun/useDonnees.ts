import { type DependencyList, useCallback, useEffect, useState } from 'react'

export type Donnees<T> =
  { etat: 'chargement' } | { etat: 'erreur'; message: string } | { etat: 'pret'; valeur: T }

/**
 * Charge une donnée au montage (et quand `dependances` changent), avec un
 * `recharger()` à appeler après une écriture. Les réponses périmées sont
 * ignorées : seule la dernière requête lancée met à jour l'état.
 */
export function useDonnees<T>(
  charger: () => Promise<T>,
  dependances: DependencyList,
): [Donnees<T>, () => void] {
  const [donnees, setDonnees] = useState<Donnees<T>>({ etat: 'chargement' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let actuelle = true
    charger()
      .then((valeur) => {
        if (actuelle) setDonnees({ etat: 'pret', valeur })
      })
      .catch((e: unknown) => {
        if (actuelle) setDonnees({ etat: 'erreur', message: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      actuelle = false
    }
    // `charger` est recréée à chaque rendu : ce sont les dépendances déclarées qui comptent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependances, version])

  const recharger = useCallback(() => setVersion((v) => v + 1), [])
  return [donnees, recharger]
}

/** Transforme une réponse openapi-fetch en valeur, ou lève l'erreur lisible. */
export function exiger<T>(reponse: { data?: T; error?: unknown }, message: (e: unknown) => string): T {
  if (reponse.data === undefined) throw new Error(message(reponse.error))
  return reponse.data
}
