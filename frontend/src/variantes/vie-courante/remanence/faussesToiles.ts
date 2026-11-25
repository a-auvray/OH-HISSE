import { vi } from 'vitest'

/** Un appel noté sur le faux contexte : le nom de la méthode et ses arguments. */
export interface AppelToile {
  methode: string
  args: unknown[]
}

/**
 * Un contexte 2D de remplacement qui note ses appels : jsdom n'a pas de canvas, et ces tests veulent
 * seulement savoir ce que le dessin a demandé (combien de rectangles, quels traits), pas le voir.
 */
export function fauxContexte() {
  const appels: AppelToile[] = []
  const proprietes: Record<string, unknown> = {}
  const contexte = new Proxy(proprietes, {
    get(cible, nom) {
      if (typeof nom !== 'string') return undefined
      if (nom in cible) return cible[nom]
      return (...args: unknown[]) => {
        appels.push({ methode: nom, args })
        // Un dégradé se complète par `addColorStop` : on renvoie de quoi le faire.
        return nom.startsWith('create') ? { addColorStop: () => undefined } : undefined
      }
    },
    set(cible, nom, valeur) {
      if (typeof nom === 'string') {
        cible[nom] = valeur
        appels.push({ methode: `=${nom}`, args: [valeur] })
      }
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  const nombre = (methode: string) => appels.filter((a) => a.methode === methode).length
  return { contexte, appels, nombre }
}

/** Fait renvoyer ce faux contexte par tous les canvas du test (restauré par `vi.restoreAllMocks`). */
export function brancherFauxContexte() {
  const faux = fauxContexte()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => faux.contexte) as unknown as HTMLCanvasElement['getContext'],
  )
  return faux
}
