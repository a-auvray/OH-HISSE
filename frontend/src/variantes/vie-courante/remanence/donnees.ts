import { api } from '../../../api/client'
import { messageErreur } from '../../../api/types'
import { aujourdhui } from '../../../commun/format'
import { exiger, useDonnees } from '../../../commun/useDonnees'

/** Les nuits de la semaine : ce que le mur montre en sept empreintes. */
export function useNuitsDeLaSemaine() {
  return useDonnees(
    async () =>
      exiger(await api.GET('/api/vie-courante/nuits', { params: { query: { jours: 7 } } }), (e) =>
        messageErreur(e),
      ),
    [],
  )
}

/** Toutes les pesées : la balance en garde les douze dernières semaines. */
export function usePesees() {
  return useDonnees(
    async () => exiger(await api.GET('/api/vie-courante/pesees'), (e) => messageErreur(e)),
    [],
  )
}

/**
 * Note l'écart d'aujourd'hui. Contrairement à la version commune, on lit la réponse : la braise ne
 * doit s'éteindre que si l'écart est vraiment enregistré. Renvoie un message d'erreur, ou null.
 */
export async function noterEcartVerifie(): Promise<string | null> {
  const parDefaut = 'L’écart n’a pas pu être noté.'
  return sansException(async () => {
    const { error } = await api.POST('/api/vie-courante/cheat-meals', { body: { date: aujourdhui() } })
    return error ? messageErreur(error, parDefaut) : null
  }, parDefaut)
}

/**
 * Une écriture qui dit toujours comment elle a fini. openapi-fetch ne renvoie `{ error }` que pour une
 * réponse HTTP en erreur : réseau coupé ou serveur arrêté, `fetch` lève. Sans ce filet, l'exception
 * sortirait d'un `void`, sans message, et l'écran resterait dans son état optimiste.
 */
export async function sansException(
  ecriture: () => Promise<string | null>,
  message: string,
): Promise<string | null> {
  try {
    return await ecriture()
  } catch {
    return message
  }
}
