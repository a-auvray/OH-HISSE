/** Calculs géographiques simples pour la carte (sans dépendance). */

export type Point = [longitude: number, latitude: number]

const RAYON_TERRE_M = 6_371_000

/** Distance à vol d'oiseau entre deux points (formule de haversine), en mètres. */
export function distance(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b[1] - a[1])
  const dLon = rad(b[0] - a[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * RAYON_TERRE_M * Math.asin(Math.sqrt(h))
}

/** Longueur d'un tracé, en mètres. */
export function longueur(trace: Point[]): number {
  let total = 0
  for (let i = 1; i < trace.length; i++) total += distance(trace[i - 1]!, trace[i]!)
  return total
}

/** « 850 m », « 1,2 km » */
export function formaterDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`
  return `${(metres / 1000).toFixed(1).replace('.', ',')} km`
}

/** Point de destination à `metres` d'un point, dans une direction (degrés, 0 = nord). */
export function deplacer(depart: Point, cap_deg: number, metres: number): Point {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = (metres * Math.cos(rad(cap_deg))) / RAYON_TERRE_M
  const dLon = (metres * Math.sin(rad(cap_deg))) / (RAYON_TERRE_M * Math.cos(rad(depart[1])))
  return [depart[0] + (dLon * 180) / Math.PI, depart[1] + (dLat * 180) / Math.PI]
}
