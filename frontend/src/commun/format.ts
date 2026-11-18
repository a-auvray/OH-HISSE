/** Mise en forme française des nombres et des dates. */

const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const NOMBRE_1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

/** 22.5 → « 22,5 kg » */
export function kg(valeur: number, precision: 1 | 2 = 2): string {
  return `${(precision === 1 ? NOMBRE_1 : NOMBRE).format(valeur)} kg`
}

/** Lest affiché avec son signe : « +22,5 kg », « PDC » pour le poids du corps seul. */
export function lest(valeur: number): string {
  return valeur === 0 ? 'PDC' : `+${kg(valeur)}`
}

/** 8.5 → « 8,5 » */
export function nombre(valeur: number): string {
  return NOMBRE.format(valeur)
}

/** Date ISO (AAAA-MM-JJ) du jour, en heure locale. */
export function aujourdhui(): string {
  return isoLocal(new Date())
}

export function isoLocal(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const jj = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${jj}`
}

/** Date ISO → objet Date à midi local (évite les décalages de fuseau). */
export function depuisIso(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

const DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

export function dateLongue(iso: string): string {
  return DATE_LONGUE.format(depuisIso(iso))
}

export function dateCourte(iso: string): string {
  return DATE_COURTE.format(depuisIso(iso))
}

/** Pastille de ressenti (note 03) : rouge de 1 à 4, orange de 5 à 6, vert de 7 à 10. */
export function couleurRessenti(ressenti: number): 'rouge' | 'orange' | 'vert' {
  if (ressenti <= 4) return 'rouge'
  if (ressenti <= 6) return 'orange'
  return 'vert'
}
