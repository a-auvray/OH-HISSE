/** Raccourcis vers les types générés depuis l'OpenAPI du backend. */
import type { components } from './schema'

type Schemas = components['schemas']

export type Exercice = Schemas['ExerciceLu']
export type SeanceLue = Schemas['SeanceLue']
export type SeanceEcrite = Schemas['SeanceEcrite']
export type SerieEcrite = Schemas['SerieEcrite']
export type SeanceDuJour = Schemas['SeanceDuJour']
export type Proposition = Schemas['Proposition']
export type PointEvolution = Schemas['PointEvolution']
export type BlocLu = Schemas['BlocLu']
export type ObjectifLu = Schemas['ObjectifLu']
export type ObjectifEcrit = Schemas['ObjectifEcrit']
export type PoidsActuel = Schemas['PoidsActuel']
export type PeseeLue = Schemas['PeseeLue']
export type Conditions = Schemas['Conditions']
export type Spot = Schemas['SpotLu']
export type Sortie = Schemas['SortieLue']
export type SortieEcrite = Schemas['SortieEcrite']

/** Message lisible d'une erreur FastAPI : `detail` texte, ou liste d'erreurs de validation. */
export function messageErreur(erreur: unknown, parDefaut = 'Une erreur est survenue.'): string {
  if (!erreur || typeof erreur !== 'object' || !('detail' in erreur)) return parDefaut
  const { detail } = erreur
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((e: { loc?: unknown[]; msg?: string }) => {
        const champ = (e.loc ?? []).filter((x) => x !== 'body').join(' › ')
        // Pydantic préfixe les erreurs de nos validateurs par « Value error, » : inutile à l'écran.
        const message = (e.msg ?? '').replace(/^Value error, /, '')
        return champ ? `${champ} : ${message}` : message
      })
      .join('\n')
  }
  return parDefaut
}
