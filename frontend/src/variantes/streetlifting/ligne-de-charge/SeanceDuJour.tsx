import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { SeanceDuJour as DonneesSeance } from '../../../api/types'
import { dateCourte, kg, nombre } from '../../../commun/format'
import { useLargeur } from '../../../commun/useLargeur'
import { echeance } from '../../../espaces/objectifs/useObjectifs'
import { agreger, TYPES_BLOC } from '../../../espaces/streetlifting/chronologie'
import { PeseeRapide } from '../../../espaces/streetlifting/PeseeRapide'
import { useSeanceDuJour } from '../../../espaces/streetlifting/useSeanceDuJour'
import { Etincelle } from '../../../themes/Etincelle'
import { useCompteur } from './animation'
import {
  echelleProfondeur,
  etiquetteFleche,
  PAS_RPE,
  type Plaque,
  phraseCible,
  phraseFleche,
  phraseProfondeur,
  plaqueInitiale,
  plaquesDuJour,
  pourcentageCible,
  profondeur,
  retardInertie,
  teinteChaleur,
  teinteLigne,
} from './modele'
import { type EtatPoutre, Poutre } from './Poutre'
import styles from './SeanceDuJour.module.css'
import { useCentres } from './useCentres'
import { useReferences } from './useReferences'

/** Hauteur de la zone où les plaques pendent, entre le haut de l'échelle et son bas. */
const HAUTEUR_PLAN = 340
/** Espace libre sous la ligne pour que le câble de la plaque la plus haute reste visible. */
const DECALAGE = 28
/** Hauteur d'une plaque, pour réserver la place sous la plus basse. */
const HAUTEUR_PLAQUE = 96
/** Le survol d'une plaque ne dessine sa flèche qu'après ce délai : la ligne ne tremble pas au passage de la souris. */
const DELAI_SURVOL_MS = 120

/** Une charge en grand : « +32,5 », « PDC » ou « À choisir ». */
function texteCharge(lest: number | null, valeur: number): { grand: string; unite: string | null } {
  if (lest === null) return { grand: 'À choisir', unite: null }
  if (lest === 0) return { grand: 'PDC', unite: null }
  return { grand: `+${nombre(valeur)}`, unite: 'kg' }
}

/** Les charges défilent par pas de 1,25 kg, la plus petite plaque : jamais de décimale intermédiaire. */
function parPasDePlaque(v: number, cible: number): number {
  return Math.abs(v - cible) < 0.01 ? cible : Math.round(v / 1.25) * 1.25
}

/**
 * La séance du jour en « Ligne de charge » : le bord supérieur de la page est une poutre que la série en cours
 * fait ployer ; sous elle, chaque exercice pend à une profondeur égale à son pourcentage d'e1RM. À gauche, un
 * seul héros : la charge de l'exercice choisi. Toutes les fonctions de la page commune sont là (pesée,
 * forme du jour, état vide, lancement de la saisie).
 */
export function SeanceDuJourLigneDeCharge() {
  const { donnees, recharger } = useSeanceDuJour()
  const idVide = useId()

  if (donnees.etat === 'chargement') return <p className={styles.attente}>Calcul de la séance…</p>
  if (donnees.etat === 'erreur')
    return (
      <p className={styles.erreur} role="alert">
        {donnees.message}
      </p>
    )

  const seance = donnees.valeur
  if (!seance.bloc) {
    return (
      <section className={styles.vide} aria-labelledby={idVide}>
        <p className={styles.etiquette}>Séance du jour</p>
        <h1 id={idVide}>Pas de bloc en cours</h1>
        <p>{seance.message}</p>
        <div className={styles.actions}>
          <Link className={styles.principal} to="/streetlifting/blocs">
            Importer un bloc
          </Link>
          <Link className={styles.lien} to="/streetlifting/saisie">
            Saisir une séance libre
          </Link>
        </div>
      </section>
    )
  }

  return <SeanceEnCours seance={seance} bloc={seance.bloc} recharger={recharger} />
}

/** La séance quand un bloc est en cours : la poutre, le héros et le graphique de profondeur. */
function SeanceEnCours({
  seance,
  bloc,
  recharger,
}: {
  seance: DonneesSeance
  bloc: NonNullable<DonneesSeance['bloc']>
  recharger: () => void
}) {
  const naviguer = useNavigate()
  const [choix, setChoix] = useState<string | null>(null)
  const [survol, setSurvol] = useState<string | null>(null)
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cadre, largeur] = useLargeur<HTMLDivElement>()
  const idProfondeur = useId()

  const references = useReferences(seance.propositions.map((p) => p.exercice_id))
  const poids = seance.poids?.kg ?? null
  const plaques = useMemo(() => {
    const records = new Map([...references.parExercice].map(([id, r]) => [id, r.record] as const))
    return plaquesDuJour(seance.propositions, poids, records)
  }, [seance.propositions, poids, references])

  const actuelle = plaques.find((p) => p.cle === (choix ?? plaqueInitiale(plaques)))
  const compteur = useCompteur(actuelle?.lest ?? 0)
  const centres = useCentres(cadre, plaques.length, largeur)
  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current)
    },
    [],
  )

  // Le centre de chaque plaque, mesuré ; à défaut (avant la première mesure), réparti sur la moitié droite.
  const centre = (i: number) => centres[i] ?? 0.5 + (i + 0.5) / Math.max(1, plaques.length) / 2
  const etatPoutre = (p: Plaque): EtatPoutre => ({
    amplitude: p.amplitude,
    position: centre(plaques.indexOf(p)),
    etiquette: p.total !== null && p.pct !== null ? etiquetteFleche(p.total, p.pct) : null,
  })
  const survolee = plaques.find((p) => p.cle === survol && p.cle !== actuelle?.cle)

  const reference = actuelle ? references.parExercice.get(actuelle.idExercice) : undefined
  const dernierE1rm = reference ? agreger(reference.evolution, 'e1rm_lest_kg', 'seance').at(-1) : undefined
  const tendance = reference
    ? agreger(reference.evolution, 'e1rm_lest_kg', 'semaine')
        .slice(-12)
        .map((p) => p.valeur)
    : []

  const objectif = references.objectif
  const recordObjectif = objectif ? references.parExercice.get(objectif.exercice_id)?.record : undefined
  const pctCible = objectif ? pourcentageCible(poids, objectif.valeur_cible_kg, recordObjectif ?? null) : null
  // La cible compte dans l'échelle : sinon sa ligne sortirait du cadre au-delà de 110 % ou sous 60 %.
  const echelle = echelleProfondeur([
    ...plaques.flatMap((p) => (p.rapport === null ? [] : [p.rapport * 100])),
    100,
    ...(pctCible === null ? [] : [pctCible]),
  ])
  const y = (pct: number) => DECALAGE + profondeur(pct, echelle, HAUTEUR_PLAN)
  const phraseDeLaCible = objectif
    ? phraseCible(objectif.progression?.pourcentage ?? null, echeance(objectif.jours_restants))
    : ''

  const entrer = (cle: string) => {
    if (minuteur.current) clearTimeout(minuteur.current)
    minuteur.current = setTimeout(() => setSurvol(cle), DELAI_SURVOL_MS)
  }
  const sortir = () => {
    if (minuteur.current) clearTimeout(minuteur.current)
    setSurvol(null)
  }

  const charge = actuelle ? texteCharge(actuelle.lest, parPasDePlaque(compteur, actuelle.lest ?? 0)) : null

  return (
    <section className={styles.page} aria-label="Séance du jour">
      <div ref={cadre} className={styles.cadre}>
        <div className={styles.poutre}>
          <Poutre
            largeur={largeur}
            teinte={teinteLigne(actuelle?.rpe ?? null)}
            {...(actuelle ? etatPoutre(actuelle) : { amplitude: 0, position: 0.5, etiquette: null })}
            survol={survolee ? etatPoutre(survolee) : null}
          />
        </div>

        <div className={styles.grille}>
          <div className={styles.heros}>
            <p className={styles.etiquette}>
              {TYPES_BLOC[bloc.type]} · séance {bloc.numero} / {bloc.total}
            </p>
            <div
              className={styles.avancement}
              role="progressbar"
              aria-label="Avancement du bloc"
              aria-valuemin={1}
              aria-valuemax={bloc.total}
              aria-valuenow={bloc.numero}
              aria-valuetext={`Séance ${bloc.numero} sur ${bloc.total}`}
              style={{ gridTemplateColumns: `repeat(${bloc.total}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: bloc.total }, (_, i) => (
                <span
                  key={i}
                  data-etat={i < bloc.numero - 1 ? 'fait' : i === bloc.numero - 1 ? 'courant' : 'a-venir'}
                />
              ))}
            </div>
            <p className={styles.bloc}>{bloc.nom}</p>
            <h1 className={styles.nom}>{seance.nom}</h1>

            {(!seance.poids || !seance.poids.a_jour) && (
              <PeseeRapide
                apresPesee={recharger}
                raison={
                  seance.poids
                    ? 'Ta dernière pesée date de plus de trois semaines.'
                    : 'Sans ton poids, les charges ne peuvent pas être calculées.'
                }
              />
            )}

            {actuelle && charge && (
              <>
                <p className={styles.charge}>
                  <span
                    className={styles.nombre}
                    data-long={actuelle.lest === null || undefined}
                    aria-hidden="true"
                  >
                    {charge.grand}
                  </span>
                  {charge.unite && (
                    <span className={styles.unite} aria-hidden="true">
                      {charge.unite}
                    </span>
                  )}
                  <span className="sr-only">
                    {actuelle.lest === null
                      ? 'Charge à choisir'
                      : actuelle.lest === 0
                        ? 'Poids du corps'
                        : `Lest de ${nombre(actuelle.lest)} kg`}
                  </span>
                </p>
                <p className={styles.seance}>
                  {actuelle.nom} · {actuelle.series}×{actuelle.reps} · RPE {nombre(actuelle.rpe)}
                </p>
                <div className={styles.chauffe} aria-hidden="true">
                  {PAS_RPE.map((r) => (
                    <span
                      key={r}
                      data-plein={r <= actuelle.rpe || undefined}
                      style={{ ['--teinte' as string]: teinteChaleur(r) }}
                    />
                  ))}
                </div>
                <ul className={styles.cases} aria-label={`${actuelle.series} séries à faire`}>
                  {Array.from({ length: actuelle.series }, (_, i) => (
                    <li key={i} />
                  ))}
                </ul>
                <p className={styles.equivalent}>
                  {phraseFleche(actuelle.nom, actuelle.total, actuelle.pct)}
                </p>
                {actuelle.raisons.length > 0 && (
                  <ul className={styles.raisons} aria-label="Pourquoi cette charge">
                    {actuelle.raisons.map((j) => (
                      <li key={j}>{j}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <dl className={styles.secondaire}>
              <div>
                <dt>e1RM {actuelle?.nom.toLowerCase() ?? ''}</dt>
                <dd className={styles.e1rm}>{dernierE1rm ? `+${nombre(dernierE1rm.valeur)} kg` : '—'}</dd>
                <dd className={styles.detail}>
                  {dernierE1rm ? `le ${dateCourte(dernierE1rm.date)}` : 'pas encore estimé'}
                </dd>
              </div>
              {tendance.length > 1 && (
                <div className={styles.tendance}>
                  <dt>12 dernières semaines</dt>
                  <dd>
                    <Etincelle valeurs={tendance} largeur={240} hauteur={48} />
                  </dd>
                </div>
              )}
              <div>
                <dt>Poids du corps</dt>
                <dd className={styles.e1rm}>{seance.poids ? kg(seance.poids.kg, 1) : '—'}</dd>
                {seance.poids && !seance.poids.a_jour && <dd className={styles.alerte}>pesée à refaire</dd>}
              </div>
            </dl>

            {seance.forme && seance.forme.consignes.length > 0 && (
              <aside className={styles.forme} role="note">
                <p className={styles.etiquette}>Forme du jour</p>
                <ul>
                  {seance.forme.consignes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <Link to="/vie-courante" className={styles.lien}>
                  Voir ma récupération →
                </Link>
              </aside>
            )}

            <div className={styles.lancer}>
              <button
                type="button"
                className={styles.principal}
                onClick={() => naviguer('/streetlifting/saisie', { state: { seanceDuJour: seance } })}
              >
                Commencer la séance →
              </button>
            </div>
          </div>

          <section className={styles.profondeur} aria-labelledby={`${idProfondeur}-titre`}>
            <h2 id={`${idProfondeur}-titre`} className={styles.titreProfondeur}>
              Profondeur des charges
            </h2>
            <p className={styles.aide}>
              Pourcentage de l’e1RM de chaque exercice : plus c’est bas, plus c’est proche de ton maximum.
            </p>
            {!references.complet && (
              <p className={styles.aide} role="status">
                Une partie de l’historique n’a pas pu être lue : certaines profondeurs manquent.
              </p>
            )}
            <div className={styles.plan} style={{ height: DECALAGE + HAUTEUR_PLAN + HAUTEUR_PLAQUE }}>
              <div className={styles.echelle} aria-hidden="true">
                {echelle.graduations.map((g) => (
                  <span key={g} style={{ top: y(g) }}>
                    {g} %
                  </span>
                ))}
              </div>
              <div className={styles.cent} style={{ top: y(100) }} aria-hidden="true">
                <span>100 % · e1RM</span>
              </div>
              {objectif && pctCible !== null && (
                <div className={styles.cible} style={{ top: y(pctCible) }}>
                  <Link
                    to="/objectifs"
                    aria-label={`Objectifs : ${objectif.exercice}, cible +${nombre(objectif.valeur_cible_kg)} kg, ${Math.round(pctCible)} % de l’e1RM. ${phraseDeLaCible}`}
                  >
                    Cible +{nombre(objectif.valeur_cible_kg)} kg · {Math.round(pctCible)} %
                    <small>{phraseDeLaCible} ↓</small>
                  </Link>
                </div>
              )}
              <ol className={styles.plaques} aria-label="Exercices du jour, dans l’ordre d’exécution">
                {plaques.map((p, i) => {
                  const haut = y(p.rapport === null ? echelle.min : p.rapport * 100)
                  return (
                    <li key={p.cle} data-plaque="" className={styles.colonne}>
                      <div
                        className={styles.suspente}
                        style={{
                          ['--masse' as string]: p.masse,
                          ['--retard' as string]: `${retardInertie(p.masse) + i * 50}ms`,
                        }}
                      >
                        <span className={styles.cable} style={{ height: haut }} aria-hidden="true" />
                        <button
                          type="button"
                          className={styles.plaque}
                          style={{ top: haut, minHeight: HAUTEUR_PLAQUE }}
                          aria-pressed={p.cle === actuelle?.cle}
                          data-inconnu={p.rapport === null || undefined}
                          onClick={() => setChoix(p.cle)}
                          onPointerEnter={() => entrer(p.cle)}
                          onPointerLeave={sortir}
                          onFocus={() => entrer(p.cle)}
                          onBlur={sortir}
                        >
                          <span className={styles.nomPlaque}>{p.nom}</span>
                          <span className={styles.chargePlaque}>
                            {p.lest === null ? 'À choisir' : p.lest === 0 ? 'PDC' : `+${nombre(p.lest)} kg`}
                          </span>
                          <span className={styles.pctPlaque}>{phraseProfondeur(p)}</span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}
