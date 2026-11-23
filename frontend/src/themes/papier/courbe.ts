export interface Point {
  x: number
  y: number
}

/**
 * Courbe lisse passant par tous les points (Catmull-Rom converti en Bézier).
 * Pas de bibliothèque : le thème reste léger, la courbe de marée n'en demande pas plus.
 */
export function cheminLisse(points: readonly Point[]): string {
  if (points.length === 0) return ''
  const [premier, ...suite] = points
  if (!premier) return ''
  if (suite.length === 0) return `M${premier.x},${premier.y}`
  let chemin = `M${premier.x.toFixed(1)},${premier.y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    if (!p0 || !p1 || !p2 || !p3) continue
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    chemin += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return chemin
}

/** Place `valeur` de [min, max] vers [a, b] ; une plage nulle donne le milieu. */
export function echelle(valeur: number, min: number, max: number, a: number, b: number): number {
  if (max === min) return (a + b) / 2
  return a + ((valeur - min) / (max - min)) * (b - a)
}
