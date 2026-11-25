import { useState } from 'react'

import { dateCourte, nombre } from '../../../commun/format'
import { useLargeur } from '../../../commun/useLargeur'
import { METRIQUES, PERIODES } from '../../../espaces/streetlifting/metriques'
import { useAnalyse } from '../../../espaces/streetlifting/useAnalyse'
import styles from './Analyse.module.css'
import { CourbeCharge } from './CourbeCharge'
import {
  amplitudeFleche,
  etiquetteCourbe,
  geometrieCourbe,
  MARGES_COURBE as MARGES,
  pourcentage,
  rapportAuMeilleur,
} from './modele'
import { Poutre } from './Poutre'

/** Hauteur du tracé, axes compris. */
const HAUTEUR_COURBE = 380

interface PropsChoix<T extends string | number> {
  libelle: string
  options: { id: T; libelle: string }[]
  valeur: T | null
  choisir: (valeur: T) => void
}

/** Un choix parmi quelques options, en capitales à chasse fixe : le choisi est souligné et coché pour les lecteurs d'écran. */
function Choix<T extends string | number>({ libelle, options, valeur, choisir }: PropsChoix<T>) {
  return (
    <div className={styles.choix} role="radiogroup" aria-label={libelle}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === valeur}
          onClick={() => choisir(o.id)}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  )
}

/**
 * L'analyse en « Ligne de charge » : la poutre se pose au-dessus de la courbe et plie pour le point que
 * l'on lit, comparé au meilleur de la période (la donnée qu'on manipule directement). Dessous, trois
 * chiffres et un tracé de banc d'essai. Mêmes choix que la page commune : exercice, grandeur, période.
 */
export function AnalyseLigneDeCharge() {
  const a = useAnalyse()
  const [cadre, largeur] = useLargeur<HTMLDivElement>()
  const [lecture, setLecture] = useState<{ cle: string; indice: number } | null>(null)

  const { definition, points } = a
  const cle = `${a.exerciceId}-${a.metrique}-${a.periode}`
  const dernier = points.length - 1
  // Un point lu appartient à une courbe : quand l'exercice, la grandeur ou la période changent, on l'oublie.
  const actif = lecture?.cle === cle && lecture.indice <= dernier ? lecture.indice : null
  const lu = points[actif ?? dernier]
  const progression = a.premier && a.dernier ? a.dernier.valeur - a.premier.valeur : null

  const estRecord = a.metrique === 'e1rm_lest_kg'
  const r = lu ? rapportAuMeilleur(lu.valeur, points) : null
  const abscisses = geometrieCourbe(points, Math.max(0, largeur - MARGES.gauche - MARGES.droite), 1).xs
  const position = lu && largeur > 0 ? (MARGES.gauche + (abscisses[actif ?? dernier] ?? 0)) / largeur : 0.5

  return (
    <section className={styles.page} aria-label="Analyse">
      <div ref={cadre} className={styles.cadre}>
        <div className={styles.poutre}>
          <Poutre
            largeur={largeur}
            teinte="var(--texte)"
            amplitude={amplitudeFleche(r)}
            position={position}
            etiquette={
              lu && r !== null
                ? etiquetteCourbe(lu.valeur, definition.unite, pourcentage(r), estRecord)
                : null
            }
          />
        </div>

        <header className={styles.filtres}>
          {a.exercices.etat === 'erreur' && (
            <p className={styles.erreur} role="alert">
              {a.exercices.message}
            </p>
          )}
          <Choix
            libelle="Exercice"
            options={
              a.exercices.etat === 'pret' ? a.exercices.valeur.map((e) => ({ id: e.id, libelle: e.nom })) : []
            }
            valeur={a.exerciceId}
            choisir={a.choisirExercice}
          />
          <Choix
            libelle="Métrique"
            options={METRIQUES.map((m) => ({ id: m.id, libelle: m.libelle }))}
            valeur={a.metrique}
            choisir={a.choisirMetrique}
          />
          <Choix
            libelle="Période"
            options={PERIODES.map((p) => ({ id: p.id, libelle: p.libelle }))}
            valeur={a.periode}
            choisir={a.choisirPeriode}
          />
        </header>

        <dl className={styles.chiffres}>
          <div>
            <dt>1RM actuel</dt>
            <dd className={styles.valeur}>{a.dernier ? `+${nombre(a.dernier.valeur)} kg` : '—'}</dd>
            <dd className={styles.detail}>
              {a.dernier ? `le ${dateCourte(a.dernier.date)}` : 'pas encore estimé'}
            </dd>
          </div>
          <div>
            <dt>Meilleur</dt>
            <dd className={styles.valeur}>{a.meilleur ? `+${nombre(a.meilleur.valeur)} kg` : '—'}</dd>
            <dd className={styles.detail}>{a.meilleur ? `le ${dateCourte(a.meilleur.date)}` : ''}</dd>
          </div>
          <div>
            <dt>Progression</dt>
            <dd className={styles.valeur}>
              {progression === null ? '—' : `${progression >= 0 ? '+' : ''}${nombre(progression)} kg`}
            </dd>
            <dd className={styles.detail}>{a.premier ? `depuis le ${dateCourte(a.premier.date)}` : ''}</dd>
          </div>
        </dl>

        <figure className={styles.planche}>
          <figcaption>
            {definition.libelle} · {definition.unite}
          </figcaption>
          {a.evolution.etat === 'chargement' && (
            <p className={styles.vide} role="status">
              Chargement de la courbe…
            </p>
          )}
          {a.evolution.etat === 'erreur' && (
            <p className={styles.erreur} role="alert">
              {a.evolution.message}
            </p>
          )}
          {a.evolution.etat === 'pret' && points.length === 0 && (
            <p className={styles.vide}>
              Pas encore de données pour ce choix. Le 1RM demande un RPE sur au moins une série et une pesée.
            </p>
          )}
          {points.length > 0 && largeur > 0 && (
            <CourbeCharge
              key={cle}
              points={points}
              largeur={largeur}
              hauteur={HAUTEUR_COURBE}
              unite={definition.unite}
              libelle={definition.libelle}
              actif={actif}
              onActif={(indice) => setLecture(indice === null ? null : { cle, indice })}
            />
          )}
          {points.length > 0 && (
            <p className={styles.lecture} aria-live="polite">
              {actif !== null && lu
                ? `${dateCourte(lu.date)} · ${nombre(lu.valeur)} ${definition.unite}${lu.seances > 1 ? ` · ${lu.seances} séances` : ''}`
                : 'Survole la courbe, ou parcours-la avec les flèches, pour lire un point.'}
            </p>
          )}
        </figure>
      </div>
    </section>
  )
}
