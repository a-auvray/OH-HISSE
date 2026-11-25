import { AnimatePresence } from 'motion/react'
import { type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { FormulaireObjectif } from '../../../espaces/objectifs/EspaceObjectifs'
import { Archives } from './Archives'
import boutons from './Boutons.module.css'
import { Ensemble } from './Ensemble'
import { BandeauFiche, Fiche } from './Fiche'
import { useTirage } from './donnees'
import { resumeArchives, resumePortefeuille } from './modele'
import styles from './Objectifs.module.css'
import { useVisite } from './useVisite'

type Onglet = 'ensemble' | 'fiche' | 'archives'

const ONGLETS: readonly { id: Onglet; libelle: string; touche: string }[] = [
  { id: 'ensemble', libelle: 'Ensemble', touche: '1' },
  { id: 'fiche', libelle: 'Fiche', touche: '2' },
  { id: 'archives', libelle: 'Archives', touche: '3' },
]

/** Le clavier sert à écrire : les raccourcis de la planche s'effacent devant un champ de saisie. */
function estUnChamp(cible: EventTarget | null): boolean {
  return (
    cible instanceof Element && cible.closest('input, select, textarea, [contenteditable="true"]') !== null
  )
}

/**
 * Les objectifs en « Tirage et Calque » : chaque objectif est une planche. Le réalisé est un tirage
 * (des assises de 2,5 kg hachurées), le plan un calque posé dessus. Trois intercalaires : l'ensemble
 * des planches en cours, la fiche d'une planche, les archives. Mêmes données et mêmes gestes que la
 * page commune : créer, marquer atteint, abandonner, mettre en avant, reprendre, supprimer.
 */
export function ObjectifsTirage() {
  const {
    objectifs,
    exercices,
    liste,
    principal,
    planches,
    jour,
    recharger,
    changerStatut,
    mettreEnAvant,
    supprimer,
  } = useTirage()
  const session = useVisite(planches, jour)
  const [onglet, setOnglet] = useState<Onglet>('ensemble')
  const [choisi, setChoisi] = useState<number | null>(null)
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [dejaDeveloppe, setDejaDeveloppe] = useState(false)
  const marquerDeveloppe = useCallback(() => setDejaDeveloppe(true), [])
  const identifiant = useId()
  const onglets = useRef<Partial<Record<Onglet, HTMLButtonElement | null>>>({})
  const feuille = useRef<HTMLDivElement>(null)

  /* La liasse : le principal d'abord, puis les autres planches en cours, les atteintes, les abandonnées. */
  const ordre = useMemo(() => {
    const rang = (statut: string, id: number) =>
      statut === 'en_cours' ? (id === principal?.id ? 0 : 1) : statut === 'atteint' ? 2 : 3
    return [...(planches ?? [])].sort(
      (a, b) => rang(a.objectif.statut, a.objectif.id) - rang(b.objectif.statut, b.objectif.id),
    )
  }, [planches, principal?.id])
  const enCours = ordre.filter((p) => p.objectif.statut === 'en_cours')
  const archivees = ordre.filter((p) => p.objectif.statut !== 'en_cours')
  const courante = ordre.find((p) => p.objectif.id === choisi) ?? ordre[0] ?? null
  const rangCourant = courante ? ordre.indexOf(courante) : -1

  function ouvrirFiche(id: number) {
    setChoisi(id)
    setOnglet('fiche')
  }

  function feuilleter(sens: -1 | 1) {
    const suivante = ordre[rangCourant + sens]
    if (suivante) setChoisi(suivante.objectif.id)
  }

  /* --- Le clavier : 1 à 3 changent d'intercalaire, Ctrl+K ouvre une nouvelle planche --- */
  useEffect(() => {
    function toucher(evenement: globalThis.KeyboardEvent) {
      if (evenement.defaultPrevented) return
      if ((evenement.ctrlKey || evenement.metaKey) && evenement.key.toLowerCase() === 'k') {
        evenement.preventDefault()
        setFormulaireOuvert(true)
        return
      }
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey || estUnChamp(evenement.target)) return
      const cible = ONGLETS.find((o) => o.touche === evenement.key)
      if (cible) setOnglet(cible.id)
    }
    window.addEventListener('keydown', toucher)
    return () => window.removeEventListener('keydown', toucher)
  }, [])

  // Une nouvelle planche s'ouvre sur son premier champ : tout se fait au clavier.
  useEffect(() => {
    if (formulaireOuvert && exercices.etat === 'pret') feuille.current?.querySelector('input')?.focus()
  }, [formulaireOuvert, exercices.etat])

  function parcourirOnglets(evenement: KeyboardEvent<HTMLDivElement>) {
    const position = ONGLETS.findIndex((o) => o.id === onglet)
    let suivant = position
    if (evenement.key === 'ArrowDown' || evenement.key === 'ArrowRight')
      suivant = (position + 1) % ONGLETS.length
    else if (evenement.key === 'ArrowUp' || evenement.key === 'ArrowLeft') {
      suivant = (position - 1 + ONGLETS.length) % ONGLETS.length
    } else if (evenement.key === 'Home') suivant = 0
    else if (evenement.key === 'End') suivant = ONGLETS.length - 1
    else return
    evenement.preventDefault()
    const cible = ONGLETS[suivant]
    if (!cible) return
    setOnglet(cible.id)
    onglets.current[cible.id]?.focus()
  }

  const erreur = objectifs.etat === 'erreur' ? objectifs.message : null
  const chargement = !erreur && (planches === null || session === null)
  // Rien à montrer sur cet intercalaire : on invite à fixer un cap (sauf si le formulaire est déjà ouvert).
  const vide =
    objectifs.etat === 'pret' &&
    !formulaireOuvert &&
    (onglet === 'ensemble' ? enCours.length === 0 : onglet === 'fiche' ? courante === null : false)

  const idOnglet = (o: Onglet) => `${identifiant}-onglet-${o}`
  const idPanneau = `${identifiant}-panneau`

  return (
    <section className={styles.planche} aria-label="Objectifs, tirage et calque">
      <div className={styles.cadre}>
        <div
          className={styles.intercalaires}
          role="tablist"
          aria-orientation="vertical"
          aria-label="Planches"
          onKeyDown={parcourirOnglets}
        >
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              id={idOnglet(o.id)}
              ref={(el) => {
                onglets.current[o.id] = el
              }}
              type="button"
              role="tab"
              aria-selected={onglet === o.id}
              aria-controls={idPanneau}
              aria-keyshortcuts={o.touche}
              tabIndex={onglet === o.id ? 0 : -1}
              className={styles.intercalaire}
              onClick={() => setOnglet(o.id)}
            >
              <span className={styles.touche} aria-hidden="true">
                {o.touche}
              </span>
              {o.libelle}
            </button>
          ))}
        </div>

        <div className={styles.contenu}>
          <header className={styles.bandeau}>
            <p className={styles.etat} role="status">
              {chargement || erreur || !planches ? (
                <span>{erreur ? 'planches illisibles' : 'lecture des planches…'}</span>
              ) : onglet === 'fiche' && courante ? (
                <BandeauFiche planche={courante} />
              ) : onglet === 'archives' ? (
                <span>{resumeArchives(archivees.map((p) => p.analyse.statut))}</span>
              ) : (
                <span>{resumePortefeuille(enCours.map((p) => p.analyse.statut))}</span>
              )}
            </p>
            <button
              type="button"
              className={boutons.bouton}
              aria-keyshortcuts="Control+K"
              onClick={() => setFormulaireOuvert((v) => !v)}
            >
              {formulaireOuvert ? 'Fermer' : '+ Nouvelle planche'}
            </button>
          </header>

          <AnimatePresence>
            {formulaireOuvert && exercices.etat === 'pret' && (
              <div className={styles.feuilleVierge} ref={feuille} key="formulaire">
                <FormulaireObjectif
                  exercices={exercices.valeur}
                  premier={liste.length === 0}
                  apresCreation={() => {
                    setFormulaireOuvert(false)
                    setOnglet('ensemble')
                    recharger()
                  }}
                />
              </div>
            )}
          </AnimatePresence>
          {formulaireOuvert && exercices.etat === 'chargement' && (
            <p className={styles.note} role="status">
              Lecture des mouvements…
            </p>
          )}
          {formulaireOuvert && exercices.etat === 'erreur' && (
            <p className={styles.erreur} role="alert">
              Les mouvements n’ont pas pu être lus : {exercices.message}
            </p>
          )}

          <div
            className={styles.panneau}
            role="tabpanel"
            id={idPanneau}
            aria-labelledby={idOnglet(onglet)}
            tabIndex={-1}
          >
            {erreur && (
              <div className={styles.erreur} role="alert">
                <p>{erreur}</p>
                <button type="button" className={boutons.bouton} onClick={recharger}>
                  Réessayer
                </button>
              </div>
            )}

            {chargement && !erreur && (
              <p className={styles.note} role="status">
                Mise en place des planches…
              </p>
            )}

            {!chargement && vide && (
              <section className={styles.vide}>
                <h2>Fixe un cap.</h2>
                <p>
                  Un max, une compétition : l’objectif structure les blocs qui y mènent, et sa progression se
                  calcule à partir de ton 1RM estimé.
                  {archivees.length > 0 && ' Tes planches terminées sont rangées dans les archives.'}
                </p>
                <button type="button" className={boutons.plein} onClick={() => setFormulaireOuvert(true)}>
                  Créer mon premier objectif
                </button>
              </section>
            )}

            {!chargement && session && onglet === 'ensemble' && enCours.length > 0 && (
              <Ensemble
                planches={enCours}
                principalId={principal?.id ?? null}
                session={session}
                gestes={{ mettreEnAvant }}
                ouvrir={ouvrirFiche}
              />
            )}

            {!chargement && session && onglet === 'fiche' && courante && (
              <Fiche
                key={courante.objectif.id}
                planche={courante}
                rang={rangCourant}
                total={ordre.length}
                principal={courante.objectif.id === principal?.id}
                session={session}
                developper={session.complet && !dejaDeveloppe}
                surDeveloppe={marquerDeveloppe}
                gestes={{ changerStatut, mettreEnAvant, supprimer }}
                feuilleter={feuilleter}
              />
            )}

            {!chargement && onglet === 'archives' && (
              <Archives
                planches={archivees}
                premierRang={enCours.length}
                gestes={{ changerStatut, supprimer }}
                ouvrir={ouvrirFiche}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
