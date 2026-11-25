import { api } from '../../../api/client'
import { messageErreur } from '../../../api/types'
import { aujourdhui } from '../../../commun/format'

/**
 * Note l'écart d'aujourd'hui. Renvoie un message d'erreur à afficher, ou null si c'est enregistré.
 * (Le `noterEcart` commun ignore la réponse du serveur : la variante, elle, ne dit « Écart pris. » que
 * si l'écart l'est vraiment.)
 */
export async function enregistrerEcart(): Promise<string | null> {
  const { error } = await api.POST('/api/vie-courante/cheat-meals', { body: { date: aujourdhui() } })
  return error ? messageErreur(error, 'Écart non enregistré.') : null
}
