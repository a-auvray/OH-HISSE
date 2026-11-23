import type { Metrique, Periode } from './chronologie'

/** Les grandeurs que l'analyse sait tracer, communes à tous les thèmes. */
export const METRIQUES: { id: Metrique; libelle: string; unite: string }[] = [
  { id: 'e1rm_lest_kg', libelle: '1RM estimé', unite: 'kg de lest' },
  { id: 'tonnage_kg', libelle: 'Tonnage', unite: 'kg' },
  { id: 'series', libelle: 'Séries', unite: 'séries' },
  { id: 'reps', libelle: 'Répétitions', unite: 'reps' },
  { id: 'rpe_moyen', libelle: 'RPE moyen', unite: 'RPE' },
]

export const PERIODES: { id: Periode; libelle: string }[] = [
  { id: 'seance', libelle: 'Séance' },
  { id: 'semaine', libelle: 'Semaine' },
  { id: 'mois', libelle: 'Mois' },
]
