import { api } from '../../api/client'
import { messageErreur } from '../../api/types'
import { aujourdhui } from '../../commun/format'
import { exiger, useDonnees } from '../../commun/useDonnees'

/** Les verdicts du jour (récupération, écart mérité, sommeil, poids) et de quoi les recharger. Commun à tous les thèmes. */
export function useEtatDuJour() {
  return useDonnees(async () => exiger(await api.GET('/api/vie-courante/etat'), (e) => messageErreur(e)), [])
}

/** Note l'écart d'aujourd'hui. */
export async function noterEcart(): Promise<void> {
  await api.POST('/api/vie-courante/cheat-meals', { body: { date: aujourdhui() } })
}

/** Note la nuit d'aujourd'hui. Renvoie un message d'erreur à afficher, ou null si c'est enregistré. */
export async function noterNuit(heures: string, qualite: number | null): Promise<string | null> {
  const { error } = await api.PUT('/api/vie-courante/nuits/{jour}', {
    params: { path: { jour: aujourdhui() } },
    body: { heures: Number(heures.replace(',', '.')), qualite },
  })
  return error ? messageErreur(error, 'Saisie impossible.') : null
}

/** Enregistre la pesée du jour. Renvoie un message d'erreur à afficher, ou null si c'est enregistré. */
export async function peser(valeur: string): Promise<string | null> {
  const { error } = await api.POST('/api/vie-courante/pesees', {
    body: { date: aujourdhui(), poids_kg: Number(valeur.replace(',', '.')) },
  })
  return error ? messageErreur(error, 'Pesée impossible.') : null
}
