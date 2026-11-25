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
  const { error } = await api.POST('/api/vie-courante/cheat-meals', { body: { date: aujourdhui() } })
  return error ? messageErreur(error, 'L’écart n’a pas pu être noté.') : null
}
