import { lest, nombre } from '../commun/format'
import type { DonneesBriefing } from './useBriefing'

export interface PhraseDuJour {
  /** Deux lignes : ce que dit le corps, puis ce que dit la mer. */
  lignes: [string, string]
  /** À la une : l'espace qui motive la phrase, et pourquoi. */
  pourquoi: { espace: 'streetlifting' | 'marine' | 'vie-courante'; texte: string }
  /** Une ou deux phrases qui précisent la séance et la mer. */
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
 * briefing : jamais écrite à la main, elle change avec la journée.
 */
export function phraseDuJour(donnees: DonneesBriefing | null, maintenant: Date): PhraseDuJour {
  const seance = donnees?.seance
  const vie = donnees?.vie
  const mer = donnees?.mer
  const repos = vie ? !vie.recuperation.recupere : false

  const corps = repos
    ? 'Repos d’abord,'
    : seance?.bloc
      ? `${COMPLEMENT_BLOC[seance.bloc.type]} d’abord,`
      : 'Journée libre,'

  const bascule = donnees ? basculeDeLaMer(donnees, maintenant) : null
  let miMer = 'le reste suit.'
  let pourquoiMer: string | null = null
  if (mer) {
    const niveau = mer.danger.niveau
    if (niveau === 'noir') {
      miMer = 'la mer est interdite.'
      pourquoiMer = 'danger noir en ce moment'
    } else if (niveau === 'rouge') {
      miMer = 'la mer est fermée.'
      pourquoiMer = 'danger rouge en ce moment'
    } else if (bascule) {
      miMer = `la mer avant ${heure(bascule.instant)}.`
      pourquoiMer = `passage au ${bascule.danger === 'noir' ? 'noir' : 'rouge'} à ${heure(bascule.instant)}`
    } else {
      miMer = 'la mer est ouverte.'
    }
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
  const premiere = seance?.propositions[0]
  if (seance?.bloc && premiere) {
    const charge = premiere.lest_kg == null ? '' : ` à ${lest(premiere.lest_kg)}`
    morceaux.push(
      `Séance ${seance.bloc.numero} sur ${seance.bloc.total} du bloc ${seance.bloc.nom} : ${premiere.exercice.toLowerCase()} ${premiere.series}×${premiere.reps}${charge}, RPE ${nombre(premiere.rpe_cible)}.`,
    )
  }
  if (mer) {
    const pleine = mer.marees
      .map((m) => ({ ...m, instant: new Date(m.instant) }))
      .find((m) => m.type === 'PM' && m.instant > maintenant)
    const vent = mer.maintenant.vent_kmh == null ? '' : `, vent ${Math.round(mer.maintenant.vent_kmh)} km/h`
    morceaux.push(`En mer${pleine ? `, prochaine pleine mer à ${heureMinute(pleine.instant)}` : ''}${vent}.`)
  }

  return { lignes: [corps, miMer], pourquoi, resume: morceaux.join(' ') }
}
