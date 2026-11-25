import type { TypeBloc } from './modele'

/** Un motif par type de bloc, comme une légende lithologique : chaque bloc a sa densité de hachure. */
export type ClefMotif = TypeBloc | 'sans-bloc' | 'points'

/** L'ordre de lecture de la légende : les blocs passés, puis ce qui n'en est pas, puis l'avenir. */
const ORDRE: readonly ClefMotif[] = ['force', 'volume', 'deload', 'specifique', 'sans-bloc', 'points']

/** Les trames à écrire dans la légende, dans l'ordre, sans doublon. */
export function clesUtilisees(clefs: Iterable<ClefMotif>): ClefMotif[] {
  const presentes = new Set(clefs)
  return ORDRE.filter((c) => presentes.has(c))
}

export function idMotif(prefixe: string, clef: ClefMotif): string {
  return `${prefixe}-${clef}`
}

export function urlMotif(prefixe: string, clef: ClefMotif): string {
  return `url(#${idMotif(prefixe, clef)})`
}
