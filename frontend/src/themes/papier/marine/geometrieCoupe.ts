/**
 * Géométrie de la coupe de plage (schématique) : du haut de plage, à gauche,
 * jusqu'au large, à droite. L'altitude du sable est exprimée en mètres au-dessus
 * du zéro des cartes, comme la hauteur d'eau de la marée.
 */

export const LARGEUR = 1000
export const HAUTEUR = 340
export const HAUT_DE_PLAGE_M = 8.4
export const FOND_M = -1.4
const ORIGINE_Y = 268
const ECHELLE_Y = 28

const lisse = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Altitude du sable à la position `u` (0 : haut de plage, 1 : large). Décroît toujours. */
export function altitudeDuSable(u: number): number {
  return HAUT_DE_PLAGE_M * (1 - u) ** 1.7 + FOND_M * lisse(0.8, 1, u)
}

/** Où l'eau touche le sable quand le niveau est `hauteur` (0 : en haut de plage, 1 : au large). */
export function positionDeLEau(hauteur: number): number {
  if (hauteur >= altitudeDuSable(0)) return 0
  if (hauteur <= altitudeDuSable(1)) return 1
  let bas = 0
  let haut = 1
  for (let i = 0; i < 28; i++) {
    const milieu = (bas + haut) / 2
    if (altitudeDuSable(milieu) > hauteur) bas = milieu
    else haut = milieu
  }
  return (bas + haut) / 2
}

export const yDeHauteur = (hauteur: number) => ORIGINE_Y - hauteur * ECHELLE_Y

const points = (de: number, a: number, n: number) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const u = de + ((a - de) * i) / n
    return { x: u * LARGEUR, y: yDeHauteur(altitudeDuSable(u)) }
  })

const chemin = (p: readonly { x: number; y: number }[]) =>
  p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' L')

/** Le sable : du haut de plage jusqu'au large, fermé par le bas de la feuille. */
export function cheminDuSable(): string {
  return `M${chemin(points(0, 1, 70))} L${LARGEUR},${HAUTEUR} L0,${HAUTEUR} Z`
}

/** La ligne du sable seule, pour le trait. */
export function traitDuSable(): string {
  return `M${chemin(points(0, 1, 70))}`
}

/** L'eau : de la ligne de rivage jusqu'au large, entre la surface et le sable. */
export function cheminDeLEau(hauteur: number): string {
  const depart = positionDeLEau(hauteur)
  if (depart >= 1) return ''
  const surface = yDeHauteur(hauteur)
  const fond = points(depart, 1, 50)
  return `M${(depart * LARGEUR).toFixed(1)},${surface.toFixed(1)} L${LARGEUR},${surface.toFixed(1)} L${chemin([...fond].reverse())} Z`
}

/** Une houle : sinusoïde sur une largeur donnée, que l'on fait glisser d'une période à l'autre. */
export function cheminDeHoule(y: number, amplitude: number, periode: number, de: number, a: number): string {
  const pas = periode / 4
  const morceaux: string[] = []
  for (let x = de; x <= a; x += pas) {
    const phase = Math.round((x - de) / pas) % 4
    const dy = phase === 1 ? -amplitude : phase === 3 ? amplitude : 0
    morceaux.push(`${x.toFixed(1)},${(y + dy).toFixed(1)}`)
  }
  return `M${morceaux.join(' L')}`
}
