import type { Conditions } from '../../api/types'

export interface CreneauSimple {
  debut: string
  fin: string
}

export interface TitreMarine {
  /** La réponse, en une phrase. */
  titre: string
  /** Pourquoi, en une ligne. */
  detail: string
}

/** « 2026-11-23T13:30:00+01:00 » → « 13h30 », à l'heure de la plage. */
export function heureCourte(iso: string): string {
  const [h, m] = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Paris',
  })
    .format(new Date(iso))
    .split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

/**
 * La réponse à « puis-je y aller ? », avant tout chiffre : calculée à partir
 * des conditions et du meilleur créneau, jamais écrite à la main.
 */
export function titreMarine(conditions: Conditions, creneau: CreneauSimple | null): TitreMarine {
  const maintenant = new Date(conditions.maintenant.instant).getTime()
  const raison = conditions.danger.raisons[0]?.texte ?? ''
  const niveau = conditions.danger.niveau
  const prochaineHeure = (accepte: (danger: string) => boolean) =>
    conditions.heures.find((h) => new Date(h.instant).getTime() > maintenant && accepte(h.danger))

  if (niveau === 'noir')
    return { titre: 'Mer interdite.', detail: raison || 'Danger noir : on ne se baigne pas.' }

  if (niveau === 'rouge') {
    const retour = prochaineHeure((d) => d === 'vert')
    return {
      titre: retour ? `Pas avant ${heureCourte(retour.instant)}.` : 'Pas aujourd’hui.',
      detail: raison || 'Danger rouge : prudence, sortie déconseillée sans expérience.',
    }
  }

  if (creneau) {
    return {
      titre: `Vas-y entre ${heureCourte(creneau.debut)} et ${heureCourte(creneau.fin)}.`,
      detail: raison || 'Conditions favorables sur ce créneau.',
    }
  }
  const bascule = prochaineHeure((d) => d !== 'vert')
  if (bascule) {
    return {
      titre: `Vas-y avant ${heureCourte(bascule.instant)}.`,
      detail: `La mer passe au ${bascule.danger === 'noir' ? 'noir' : 'rouge'} ensuite.`,
    }
  }
  return { titre: 'La mer est à toi.', detail: raison || 'Rien de défavorable dans les prochaines heures.' }
}
