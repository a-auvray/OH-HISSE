import { type KeyboardEvent, useEffect, useState } from 'react'

import type { ObjectifLu } from '../../../api/types'
import { aujourdhui } from '../../../commun/format'
import { useObjectifs } from '../../../espaces/objectifs/useObjectifs'
import { useTon } from '../../../themes/ton'
import { type Onglet, ONGLETS, PANNEAU } from './catalogue'
import commun from './commun.module.css'
import { Drisse, EnteteDrisse } from './Drisse'
import { Fiche } from './Fiche'
import { Formulaire } from './Formulaire'
import { useEvolutions, useNiveauAnimation } from './hooks'
import { avancement, calculerRythme, type Rythme, texteDrisse, torsion } from './modele'
import styles from './Objectifs.module.css'
import { Onglets } from './Onglets'
import { Sculpture } from './Sculpture'

type Statut = ObjectifLu['statut']

const SANS_SURCHARGE: ReadonlyMap<number, Statut> = new Map()

const RIEN: Readonly<Record<Exclude<Onglet, 'en-cours'>, string>> = {
  atteints: 'Aucun objectif atteint pour l’instant. Une corde verrouillée vient se ranger ici.',
  detendus: 'Aucun objectif détendu. Une corde abandonnée vient se ranger ici, et peut être reprise.',
}

const ONGLET_DU_STATUT: Readonly<Record<Statut, Onglet>> = {
  en_cours: 'en-cours',
  atteint: 'atteints',
  abandonne: 'detendus',
}

/** Ce qu'annonce la région « polite » quand un objectif change d'état : le verrouillage, le relâchement, la reprise. */
const ANNONCES: Readonly<Record<Statut, (titre: string) => string>> = {
  atteint: (t) => `Objectif verrouillé : ${t}`,
  abandonne: (t) => `Objectif détendu : ${t}`,
  en_cours: (t) => `Objectif repris : ${t}`,
}

/** Le texte de la touche N ou 1 à 3 ne doit jamais partir d'un champ de saisie. */
function saisieEnCours(cible: EventTarget | null) {
  return (
    cible instanceof Element && cible.closest('input, select, textarea, [contenteditable="true"]') !== null
  )
}

/**
 * Les objectifs en Drisses de Gabo : chaque objectif est une drisse verticale qu'on hisse vers la tête de mât, et
 * l'objectif dont on ouvre la fiche porte une sculpture de 96 fils qui se resserre à mesure qu'il avance. Même
 * données et mêmes gestes que les autres vues (créer, marquer atteint, abandonner, mettre en avant, reprendre, supprimer).
 */
export function ObjectifsDrisses() {
  const { objectifs, exercices, liste, recharger, changerStatut, mettreEnAvant, supprimer } = useObjectifs()
  const animation = useNiveauAnimation()
  const [ton] = useTon()
  const [onglet, setOnglet] = useState<Onglet>('en-cours')
  const [choix, setChoix] = useState<number | null>(null)
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [annonce, setAnnonce] = useState('')
  // Un changement de statut se voit tout de suite (la torsion tombe, le ruban pivote) sans attendre le rechargement :
  // on le garde à part, rattaché aux données qu'il corrige, et il s'efface quand de nouvelles données arrivent.
  const [surcharge, setSurcharge] = useState<{
    source: unknown
    statuts: ReadonlyMap<number, Statut>
  } | null>(null)
  const statuts = surcharge?.source === objectifs ? surcharge.statuts : SANS_SURCHARGE
  const jour = aujourdhui()

  const vue = liste.map((o) => (statuts.has(o.id) ? { ...o, statut: statuts.get(o.id)! } : o))
  const enCours = vue.filter((o) => o.statut === 'en_cours')
  const principal = enCours.find((o) => o.principal) ?? enCours[0]
  const parOnglet: Readonly<Record<Onglet, readonly ObjectifLu[]>> = {
    'en-cours': principal ? [principal, ...enCours.filter((o) => o !== principal)] : [],
    atteints: vue.filter((o) => o.statut === 'atteint'),
    detendus: vue.filter((o) => o.statut === 'abandonne'),
  }
  const visibles = parOnglet[onglet]
  const fiche = visibles.find((o) => o.id === choix) ?? visibles[0]
  const autres = visibles.filter((o) => o !== fiche)

  const { evolutions, chargement } = useEvolutions(
    [...enCours, ...(fiche ? [fiche] : [])].map((o) => o.exercice_id),
  )
  const rythmeDe = (o: ObjectifLu): Rythme | null =>
    o.statut === 'en_cours' ? calculerRythme(o, evolutions.get(o.exercice_id) ?? [], jour) : null

  // Touches 1 à 3 : les onglets ; N : tendre une corde. Jamais depuis un champ de saisie.
  useEffect(() => {
    const surTouche = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || saisieEnCours(e.target)) return
      const rang = ['1', '2', '3'].indexOf(e.key)
      if (rang >= 0) {
        setOnglet(ONGLETS[rang]!.id)
        setChoix(null)
      } else if (e.key === 'n' || e.key === 'N') {
        setFormulaireOuvert(true)
      }
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [])

  function choisirOnglet(suivant: Onglet) {
    setOnglet(suivant)
    setChoix(null)
  }

  function changer(o: ObjectifLu, statut: Statut) {
    setSurcharge({ source: objectifs, statuts: new Map(statuts).set(o.id, statut) })
    setOnglet(ONGLET_DU_STATUT[statut])
    setChoix(o.id)
    setAnnonce(ANNONCES[statut](o.titre))
    void changerStatut(o, statut)
  }

  function enAvant(o: ObjectifLu) {
    setChoix(o.id)
    setAnnonce(`Objectif mis en avant : ${o.titre}`)
    void mettreEnAvant(o)
  }

  function retirer(o: ObjectifLu) {
    setAnnonce(`Objectif supprimé : ${o.titre}`)
    void supprimer(o)
  }

  // ← et → passent d'une drisse à l'autre, de la sculpture à la dernière corde.
  function surFleche(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const cordes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="meter"]'))
    const ici = cordes.indexOf(document.activeElement as HTMLElement)
    if (ici === -1) return
    e.preventDefault()
    const voisin = Math.min(cordes.length - 1, Math.max(0, ici + (e.key === 'ArrowRight' ? 1 : -1)))
    cordes[voisin]?.focus()
  }

  const comptes: Readonly<Record<Onglet, number>> = {
    'en-cours': parOnglet['en-cours'].length,
    atteints: parOnglet.atteints.length,
    detendus: parOnglet.detendus.length,
  }

  const vide = objectifs.etat === 'pret' && !fiche && !formulaireOuvert

  return (
    <div className={styles.page}>
      <div className={styles.barre}>
        <p>Un cap structure les blocs qui y mènent ; sa progression suit ton 1RM estimé.</p>
        <button
          type="button"
          className={commun.bouton}
          aria-expanded={formulaireOuvert}
          aria-keyshortcuts="N"
          onClick={() => setFormulaireOuvert((v) => !v)}
        >
          {formulaireOuvert ? 'Fermer' : 'Tendre une corde'}
        </button>
      </div>

      {formulaireOuvert && exercices.etat === 'pret' && (
        <Formulaire
          exercices={exercices.valeur}
          premier={liste.length === 0}
          apresCreation={() => {
            setFormulaireOuvert(false)
            recharger()
          }}
        />
      )}

      {objectifs.etat === 'erreur' && (
        <p className={styles.erreur} role="alert">
          {objectifs.message}
        </p>
      )}

      <div className={styles.corps}>
        <Onglets actif={onglet} comptes={comptes} onChoisir={choisirOnglet} />

        <div
          id={PANNEAU}
          role="tabpanel"
          aria-labelledby={`drisses-onglet-${onglet}`}
          className={styles.panneau}
        >
          {objectifs.etat === 'chargement' && (
            <p className={styles.etat} role="status">
              Les drisses se tendent…
            </p>
          )}

          {vide && onglet === 'en-cours' && (
            <section className={styles.vide} aria-labelledby="drisses-vide">
              <div className={`${styles.videZone} ${commun.filets}`} aria-hidden="true">
                <svg viewBox="0 0 48 100" preserveAspectRatio="none">
                  <line x1="24" x2="24" y1="0" y2="100" />
                </svg>
                <span />
              </div>
              <div className={styles.videTexte}>
                <h2 id="drisses-vide">Aucune corde tendue.</h2>
                <p>
                  En tendre une ? Un max, une compétition : l’objectif structure les blocs qui y mènent, et sa
                  progression se calcule à partir de ton 1RM estimé.
                </p>
                <button type="button" className={commun.plein} onClick={() => setFormulaireOuvert(true)}>
                  Créer mon premier objectif
                </button>
              </div>
            </section>
          )}

          {vide && onglet !== 'en-cours' && <p className={styles.rien}>{RIEN[onglet]}</p>}

          {fiche && (
            <div className={styles.piece}>
              <Fiche
                objectif={fiche}
                rythme={rythmeDe(fiche)}
                chargement={chargement}
                principal={fiche === principal}
                points={evolutions.get(fiche.exercice_id) ?? []}
                aujourdhui={jour}
                changerStatut={changer}
                mettreEnAvant={enAvant}
                supprimer={retirer}
              />

              {/* Ni carte ni cadre : la sculpture, puis les drisses, sous les deux mêmes filets. */}
              <div className={styles.scene} onKeyDown={surFleche}>
                <div className={styles.sculpture}>
                  <EnteteDrisse objectif={fiche} />
                  <div
                    className={`${styles.zoneSculpture} ${commun.filets}`}
                    role="meter"
                    tabIndex={0}
                    aria-label={fiche.titre}
                    aria-valuemin={0}
                    aria-valuemax={fiche.valeur_cible_kg}
                    aria-valuenow={fiche.progression?.e1rm_lest_kg ?? 0}
                    aria-valuetext={texteDrisse(fiche, rythmeDe(fiche), chargement)}
                  >
                    <Sculpture
                      p={avancement(fiche)}
                      verrouille={fiche.statut === 'atteint'}
                      eteinte={fiche.statut === 'abandonne'}
                      animation={animation}
                      ton={ton}
                    />
                  </div>
                  <p className={styles.legende}>{legende(fiche)}</p>
                </div>

                {autres.length > 0 && (
                  <section className={styles.rangee} aria-label="Autres objectifs">
                    {autres.map((o, i) => (
                      <Drisse
                        key={o.id}
                        objectif={o}
                        rythme={rythmeDe(o)}
                        chargement={chargement}
                        animation={animation}
                        rang={i + 1}
                        onChoisir={() => setChoix(o.id)}
                      />
                    ))}
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className={commun.masque} role="status" aria-live="polite">
        {annonce}
      </p>
    </div>
  )
}

/** Ce que dit la sculpture sous son pied : sa torsion, calculée, ou l'état où elle s'est rangée. */
function legende(o: ObjectifLu): string {
  if (o.statut === 'atteint') return 'Verrouillé : le ruban est vu par la tranche, 96 fils en une ligne.'
  if (o.statut === 'abandonne') return 'Détendu : la sculpture est éteinte.'
  const degres = Math.round((torsion(avancement(o)) * 180) / Math.PI)
  return degres === 0
    ? 'Torsion nulle : le ruban est plan.'
    : `Torsion de ${degres}° entre la barre du sol et celle du plafond.`
}
