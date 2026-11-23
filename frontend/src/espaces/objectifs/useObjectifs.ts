import { api } from '../../api/client'
import { messageErreur, type ObjectifEcrit, type ObjectifLu } from '../../api/types'
import { exiger, useDonnees } from '../../commun/useDonnees'

export const STATUTS = { en_cours: 'En cours', atteint: 'Atteint', abandonne: 'Abandonné' } as const

function versEcriture(o: ObjectifLu, modif: Partial<ObjectifEcrit> = {}): ObjectifEcrit {
  return {
    titre: o.titre,
    type: o.type,
    exercice_id: o.exercice_id,
    valeur_cible_kg: o.valeur_cible_kg,
    date_cible: o.date_cible,
    principal: o.principal,
    ...modif,
  }
}

/** « J−112 », « c'est aujourd'hui », « échéance passée de 3 j ». */
export function echeance(jours: number): string {
  if (jours < 0) return `échéance passée de ${-jours} j`
  if (jours === 0) return 'c’est aujourd’hui'
  return `J−${jours}`
}

/** Crée un objectif. Renvoie un message d'erreur à afficher, ou null si c'est créé. */
export async function creerObjectif(valeurs: ObjectifEcrit, cible: string): Promise<string | null> {
  const { error } = await api.POST('/api/objectifs', {
    body: { ...valeurs, valeur_cible_kg: Number(cible.replace(',', '.')) },
  })
  return error ? messageErreur(error, 'Création impossible.') : null
}

/**
 * Les objectifs, le principal (le premier en cours, ou celui qu'on a mis en
 * avant), les autres, et les gestes pour les faire vivre. Commun à tous les thèmes.
 */
export function useObjectifs() {
  const [objectifs, recharger] = useDonnees(
    async () => exiger(await api.GET('/api/objectifs'), (e) => messageErreur(e)),
    [],
  )
  const [exercices] = useDonnees(
    async () => exiger(await api.GET('/api/streetlifting/exercices'), (e) => messageErreur(e)),
    [],
  )

  const liste = objectifs.etat === 'pret' ? objectifs.valeur : []
  const principal =
    liste.find((o) => o.principal && o.statut === 'en_cours') ?? liste.find((o) => o.statut === 'en_cours')
  const autres = liste.filter((o) => o !== principal)

  async function changerStatut(o: ObjectifLu, statut: ObjectifLu['statut']) {
    await api.PATCH('/api/objectifs/{objectif_id}/statut', {
      params: { path: { objectif_id: o.id } },
      body: { statut },
    })
    recharger()
  }

  async function mettreEnAvant(o: ObjectifLu) {
    await api.PUT('/api/objectifs/{objectif_id}', {
      params: { path: { objectif_id: o.id } },
      body: versEcriture(o, { principal: true }),
    })
    recharger()
  }

  async function supprimer(o: ObjectifLu) {
    await api.DELETE('/api/objectifs/{objectif_id}', { params: { path: { objectif_id: o.id } } })
    recharger()
  }

  return {
    objectifs,
    exercices,
    liste,
    principal,
    autres,
    recharger,
    changerStatut,
    mettreEnAvant,
    supprimer,
  }
}
