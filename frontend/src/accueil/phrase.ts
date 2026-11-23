import { lest, nombre } from '../commun/format'
import type { DonneesBriefing } from './useBriefing'

export interface PhraseDuJour {
  /** Deux lignes : la séance du jour, puis son premier exercice. */
  lignes: [string, string]
  /** À la une : l'espace qui motive la phrase, et pourquoi. */
  pourquoi: { espace: 'streetlifting' | 'marine' | 'vie-courante'; texte: string }
  /** Ce qui entoure la séance : la récupération et la mer, en clair. */
  resume: string
}

const COMPLEMENT_BLOC = {
  force: 'Force',
  volume: 'Volume',
  deload: 'Décharge',
  specifique: 'Technique',
} as const

const heure = (d: Date) => `${d.getHours()}h`
const heureMinute = (d: Date) => `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`

/** Première heure à venir où la mer n'est plus verte, ou null si elle l'est partout. */
function basculeDeLaMer(donnees: DonneesBriefing, maintenant: Date) {
  const mer = donnees.mer
  if (!mer) return null
  return (
    mer.heures
      .map((h) => ({ instant: new Date(h.instant), danger: h.danger }))
      .find((h) => h.instant.getTime() > maintenant.getTime() && h.danger !== 'vert') ?? null
  )
}

/**
 * La phrase du jour, calculée à partir des mêmes données que le reste du
 * briefing : jamais écrite à la main, elle change avec la journée. Elle dit
 * d'abord ce qui est utile : la séance du jour et son premier exercice.
 */
export function phraseDuJour(donnees: DonneesBriefing | null, maintenant: Date): PhraseDuJour {
  const seance = donnees?.seance
  const vie = donnees?.vie
  const mer = donnees?.mer
  const repos = vie ? !vie.recuperation.recupere : false
  const premiere = seance?.propositions[0]

  let lignes: PhraseDuJour['lignes'] = ['Pas de séance prévue,', 'journée libre.']
  if (seance?.bloc) {
    const charge = premiere?.lest_kg == null ? '' : ` à ${lest(premiere.lest_kg)}`
    lignes = [
      `${COMPLEMENT_BLOC[seance.bloc.type]} · séance ${seance.bloc.numero}/${seance.bloc.total}`,
      premiere ? `${premiere.exercice} ${premiere.series}×${premiere.reps}${charge}` : (seance.nom ?? ''),
    ]
  }

  const bascule = donnees ? basculeDeLaMer(donnees, maintenant) : null
  let pourquoiMer: string | null = null
  let phraseMer: string | null = null
  if (mer) {
    const niveau = mer.danger.niveau
    const vent = mer.maintenant.vent_kmh == null ? '' : `, vent ${Math.round(mer.maintenant.vent_kmh)} km/h`
    if (niveau === 'noir' || niveau === 'rouge') {
      pourquoiMer = `danger ${niveau} en ce moment`
      phraseMer = `Mer : danger ${niveau}${vent}. Pas de sortie conseillée.`
    } else if (bascule) {
      pourquoiMer = `passage au ${bascule.danger === 'noir' ? 'noir' : 'rouge'} à ${heure(bascule.instant)}`
      phraseMer = `Mer verte jusqu’à ${heure(bascule.instant)}${vent}, puis danger ${bascule.danger}.`
    } else {
      phraseMer = `Mer verte toute la journée${vent}.`
    }
    const pleine = mer.marees
      .map((m) => ({ ...m, instant: new Date(m.instant) }))
      .find((m) => m.type === 'PM' && m.instant > maintenant)
    if (pleine) phraseMer += ` Prochaine pleine mer à ${heureMinute(pleine.instant)}.`
  }

  const pourquoi: PhraseDuJour['pourquoi'] = pourquoiMer
    ? { espace: 'marine', texte: pourquoiMer }
    : repos && vie
      ? {
          espace: 'vie-courante',
          texte: `encore ${Math.round(vie.recuperation.restant_h)} h de récupération`,
        }
      : { espace: 'streetlifting', texte: seance?.nom ? `séance « ${seance.nom} »` : 'pas de séance prévue' }

  const morceaux: string[] = []
  if (seance?.bloc && premiere) {
    morceaux.push(`Bloc ${seance.bloc.nom}, cible RPE ${nombre(premiere.rpe_cible)}.`)
  }
  if (vie) {
    morceaux.push(
      vie.recuperation.recupere
        ? 'Récupération complète.'
        : `Récupération incomplète : encore ${Math.round(vie.recuperation.restant_h)} h.`,
    )
  }
  if (phraseMer) morceaux.push(phraseMer)

  return { lignes, pourquoi, resume: morceaux.join(' ') }
}
