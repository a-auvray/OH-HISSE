/** Logique du formulaire de sortie, sans React. */
import type { Sortie, SortieEcrite } from '../../api/types'

export type TypeSortie = SortieEcrite['type']

export const MODES: { id: TypeSortie; libelle: string }[] = [
  { id: 'baignade', libelle: 'Baignade' },
  { id: 'nage', libelle: 'Nage' },
  { id: 'plongee', libelle: 'Plongée' },
]

export interface FormulaireSortie {
  type: TypeSortie
  spot_id: number | null
  date: string // AAAA-MM-JJ
  heure: string // HH:MM
  duree_min: string
  ressenti: number | null
  note: string
  distance_m: string
  profondeur_max_m: string
  visibilite_m: string
  materiel: string
  // Conditions saisies à la main (vides : relevées automatiquement)
  eau_c: string
  air_c: string
  vent_kmh: string
}

const PARIS_DATE = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }) // fr-CA : AAAA-MM-JJ
const PARIS_HEURE = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
})

export function formulaireVierge(maintenant: Date, spotId: number | null): FormulaireSortie {
  return {
    type: 'nage',
    spot_id: spotId,
    date: PARIS_DATE.format(maintenant),
    heure: PARIS_HEURE.format(maintenant),
    duree_min: '30',
    ressenti: null,
    note: '',
    distance_m: '',
    profondeur_max_m: '',
    visibilite_m: '',
    materiel: '',
    eau_c: '',
    air_c: '',
    vent_kmh: '',
  }
}

const texte = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

/** Sortie enregistrée → formulaire. Les conditions relevées par l'appli ne sont pas reprises comme saisies. */
export function depuisSortie(s: Sortie): FormulaireSortie {
  const debut = new Date(s.debut)
  const manuelles = !s.conditions_relevees
  return {
    type: s.type,
    spot_id: s.spot_id ?? null,
    date: PARIS_DATE.format(debut),
    heure: PARIS_HEURE.format(debut),
    duree_min: String(s.duree_min),
    ressenti: s.ressenti ?? null,
    note: s.note ?? '',
    distance_m: texte(s.distance_m),
    profondeur_max_m: texte(s.profondeur_max_m),
    visibilite_m: texte(s.visibilite_m),
    materiel: s.materiel ?? '',
    eau_c: manuelles ? texte(s.eau_c) : '',
    air_c: manuelles ? texte(s.air_c) : '',
    vent_kmh: manuelles ? texte(s.vent_kmh) : '',
  }
}

/** Décalage de Paris (« +01:00 » ou « +02:00 ») à une date donnée. */
export function decalageParis(date: string, heure: string): string {
  const approx = new Date(`${date}T${heure}:00Z`)
  const partie = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'longOffset' })
    .formatToParts(approx)
    .find((p) => p.type === 'timeZoneName')?.value
  const decalage = partie?.replace('GMT', '') ?? ''
  return decalage === '' ? '+00:00' : decalage
}

function nombre(champ: string): number | null {
  const v = champ.trim().replace(',', '.')
  return v === '' ? null : Number(v)
}

/** Formulaire → corps de la requête, ou liste des problèmes. */
export function versEcriture(f: FormulaireSortie): SortieEcrite | string[] {
  const problemes: string[] = []
  const duree = Number(f.duree_min)
  if (!Number.isInteger(duree) || duree <= 0) problemes.push('Durée : un nombre de minutes.')
  if (!f.date || !/^\d{2}:\d{2}$/.test(f.heure)) problemes.push('Date et heure de la sortie.')
  const numeriques = {
    distance_m: f.distance_m,
    profondeur_max_m: f.profondeur_max_m,
    visibilite_m: f.visibilite_m,
    eau_c: f.eau_c,
    air_c: f.air_c,
    vent_kmh: f.vent_kmh,
  }
  for (const [champ, valeur] of Object.entries(numeriques)) {
    const n = nombre(valeur)
    if (n !== null && Number.isNaN(n)) problemes.push(`${champ} : nombre invalide.`)
  }
  if (problemes.length) return problemes

  return {
    type: f.type,
    spot_id: f.spot_id,
    debut: `${f.date}T${f.heure}:00${decalageParis(f.date, f.heure)}`,
    duree_min: duree,
    ressenti: f.ressenti,
    note: f.note.trim() || null,
    distance_m: f.type === 'nage' ? nombre(f.distance_m) : null,
    profondeur_max_m: f.type === 'plongee' ? nombre(f.profondeur_max_m) : null,
    visibilite_m: f.type === 'plongee' ? nombre(f.visibilite_m) : null,
    materiel: f.type === 'plongee' ? f.materiel.trim() || null : null,
    eau_c: nombre(f.eau_c),
    air_c: nombre(f.air_c),
    vent_kmh: nombre(f.vent_kmh),
  }
}
