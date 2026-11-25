import { type CSSProperties, type FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router'

import type { EtatDuJour, Nuit } from '../../../api/types'
import { aujourdhui, nombre } from '../../../commun/format'
import { noterNuit, useEtatDuJour } from '../../../espaces/vie-courante/etat'
import styles from './Aujourdhui.module.css'
import { Balance } from './Balance'
import { Champ } from './Champ'
import { Colonne } from './Colonne'
import { noterEcartVerifie, sansException, useNuitsDeLaSemaine } from './donnees'
import {
  dureeEnMots,
  empreintesAffichees,
  empreintesDeLaSemaine,
  enRvb,
  formaterDuree,
  heuresEnSaisie,
  lireHeures,
  niveauBraise,
  palierSouffle,
  phraseEcart,
  ressentiDeQualite,
} from './modele'
import { useAmbiance } from './useAmbiance'

const QUAND = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

const VERDICTS = {
  oui: 'Ce soir, t’as le droit.',
  petit: 'Un petit écart, oui.',
  non: 'Pas cette fois.',
} as const

const AUCUNE_NUIT: readonly Nuit[] = []
/** Durée de départ de la poignée quand ni nuit notée ni moyenne ne disent où la poser. */
const DUREE_DE_DEPART = 7

/**
 * « Aujourd'hui » en Rémanence : un mur de nuit où chaque nuit laisse une empreinte de lumière. La
 * dernière brille, les six précédentes s'effacent comme une pose longue ; la récupération est une
 * colonne de lumière qui respire ; le cheat meal est une braise sur le rebord. Mêmes données et mêmes
 * gestes que la page commune : récupération, écart mérité, nuit, poids.
 */
export function AujourdhuiRemanence() {
  const [etat, recharger] = useEtatDuJour()
  const [nuits, rechargerNuits] = useNuitsDeLaSemaine()

  if (etat.etat === 'chargement') return <p className={styles.attente}>Un instant…</p>
  if (etat.etat === 'erreur')
    return (
      <p className={styles.erreur} role="alert">
        {etat.message}
      </p>
    )
  return (
    <Mur
      etat={etat.valeur}
      nuits={nuits.etat === 'pret' ? nuits.valeur : AUCUNE_NUIT}
      etatNuits={nuits.etat}
      erreurNuits={nuits.etat === 'erreur' ? nuits.message : null}
      recharger={recharger}
      rechargerNuits={rechargerNuits}
    />
  )
}

interface PropsMur {
  etat: EtatDuJour
  nuits: readonly Nuit[]
  etatNuits: 'chargement' | 'erreur' | 'pret'
  erreurNuits: string | null
  recharger: () => void
  rechargerNuits: () => void
}

function Mur({ etat, nuits, etatNuits, erreurNuits, recharger, rechargerNuits }: PropsMur) {
  const { animation, encres, cle, attacher } = useAmbiance()
  const r = etat.recuperation
  const v = etat.cheat_meal
  const s = etat.sommeil
  const jour = aujourdhui()

  const [heures, setHeures] = useState<string | null>(null)
  const [qualite, setQualite] = useState<number | null | undefined>(undefined)
  const [erreurNuit, setErreurNuit] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreurEcart, setErreurEcart] = useState<string | null>(null)
  const [braiseEteinte, setBraiseEteinte] = useState<string | null>(null)

  const base = useMemo(() => empreintesDeLaSemaine(nuits, jour), [nuits, jour])
  const sauvee = base[base.length - 1]
  const moyenne = s.moyenne_h ?? null
  const heuresSauvees = sauvee?.heures ?? null
  const valeurChamp = heures ?? (heuresSauvees !== null ? heuresEnSaisie(heuresSauvees) : '')
  const saisie = lireHeures(valeurChamp)
  const qualiteMontree = qualite === undefined ? (sauvee?.qualite ?? null) : qualite

  const empreintes = useMemo(
    () =>
      empreintesAffichees(base, {
        heures: saisie,
        qualite: qualiteMontree,
        parDefaut: moyenne ?? DUREE_DE_DEPART,
      }),
    [base, saisie, qualiteMontree, moyenne],
  )
  const heuresDuJour = empreintes[empreintes.length - 1]?.heures ?? DUREE_DE_DEPART

  // La phrase héros : la nuit en mots si elle est notée, sinon l'invitation du matin.
  const heuresDites = saisie ?? heuresSauvees ?? (etatNuits === 'pret' ? null : (s.derniere_nuit_h ?? null))
  const phrase = heuresDites === null ? 'Imprime ta nuit.' : dureeEnMots(heuresDites)
  const chiffres =
    heuresDites === null
      ? moyenne !== null
        ? `moy. 7 j · ${formaterDuree(moyenne)}`
        : 'Aucune nuit notée cette semaine.'
      : moyenne !== null
        ? `${formaterDuree(heuresDites)} · ${phraseEcart(heuresDites, moyenne)}`
        : formaterDuree(heuresDites)

  const notees = base.filter((e) => e.heures !== null).length
  const resume =
    etatNuits === 'chargement'
      ? 'Lecture des nuits…'
      : erreurNuits !== null
        ? 'Les nuits de la semaine n’ont pas pu être lues.'
        : notees === 0
          ? 'Aucune nuit notée cette semaine.'
          : `${notees} nuit${notees > 1 ? 's' : ''} notée${notees > 1 ? 's' : ''} sur 7${moyenne !== null ? ` · moyenne ${formaterDuree(moyenne)}` : ''}`

  const palier = palierSouffle(r.restant_h)
  const cleVerdict = `${v.verdict}:${v.points}`
  const eteinte = braiseEteinte === cleVerdict

  async function enregistrerNuit(valeur: string) {
    const message = await sansException(
      () => noterNuit(valeur, qualiteMontree),
      'La nuit n’a pas pu être notée.',
    )
    setErreurNuit(message)
    if (!message) {
      recharger()
      rechargerNuits()
    }
  }

  function surEnvoiNuit(evenement: FormEvent) {
    evenement.preventDefault()
    void enregistrerNuit(valeurChamp)
  }

  async function prendreEcart() {
    setEnCours(true)
    setErreurEcart(null)
    // La braise s'éteint tout de suite ; si l'écart n'est pas enregistré, elle se rallume et on le dit.
    setBraiseEteinte(cleVerdict)
    let message: string | null
    try {
      message = await noterEcartVerifie()
    } finally {
      setEnCours(false)
    }
    if (message) {
      setBraiseEteinte(null)
      setErreurEcart(message)
    } else {
      recharger()
    }
  }

  const encresCss = {
    '--rem-mur': enRvb(encres.mur),
    '--rem-lumiere': enRvb(encres.lumiere),
  } as CSSProperties

  return (
    <div className={styles.page}>
      <section ref={attacher} className={styles.mur} style={encresCss} aria-labelledby="rem-titre">
        <header className={styles.hero}>
          <h2 id="rem-titre" className={styles.phrase} data-vide={heuresDites === null || undefined}>
            {phrase}
          </h2>
          <p className={styles.chiffres}>{chiffres}</p>
        </header>

        <div className={styles.scene}>
          <Champ
            empreintes={empreintes}
            moyenne={moyenne}
            animation={animation}
            encres={encres}
            cle={cle}
            heuresDuJour={heuresDuJour}
            onDuree={(h) => setHeures(heuresEnSaisie(h))}
            onImprimer={() =>
              void enregistrerNuit(valeurChamp !== '' ? valeurChamp : heuresEnSaisie(heuresDuJour))
            }
            resume={resume}
          />
          <Colonne
            progression={r.progression}
            recupere={r.recupere}
            restantH={r.restant_h}
            palier={palier}
            animation={animation}
            encres={encres}
            cle={cle}
          />
        </div>

        {erreurNuits !== null && (
          <p className={styles.erreur} role="alert">
            {erreurNuits}
          </p>
        )}

        <div className={styles.blocs}>
          <section
            className={`${styles.bloc} ${styles.apparait}`}
            style={{ ['--rang' as string]: 0 }}
            aria-labelledby="rem-recup"
          >
            <h3 id="rem-recup" className={styles.rubrique}>
              Récupération
            </h3>
            <p className={styles.texte}>
              {r.recupere
                ? 'Tu es récupéré : la prochaine séance peut être intense.'
                : `Prochain effort intense conseillé ${r.fin ? QUAND.format(new Date(r.fin)) : 'bientôt'}.`}
            </p>
            <p className={styles.texte}>
              {r.recupere ? 'Prêt' : `Encore ${Math.round(r.restant_h)} h`} · souffle{' '}
              <strong className={styles.chiffre}>{palier.nom}</strong>
            </p>
            {r.raisons.length > 0 && (
              <details className={styles.details}>
                <summary>Pourquoi · {r.raisons[0]}</summary>
                <ul className={styles.raisons}>
                  {r.raisons.map((raison) => (
                    <li key={raison}>{raison}</li>
                  ))}
                </ul>
              </details>
            )}
            {r.recup_active_conseillee && (
              <Link to="/marine/assistant" className={styles.lien}>
                Une baignade courte t’aiderait : l’assistant de sortie →
              </Link>
            )}
          </section>

          <section
            className={`${styles.bloc} ${styles.apparait}`}
            style={{ ['--rang' as string]: 1 }}
            aria-labelledby="rem-nuit"
          >
            <h3 id="rem-nuit" className={styles.rubrique}>
              Cette nuit
            </h3>
            <form className={styles.champSaisie} onSubmit={surEnvoiNuit}>
              <label>
                <span className="sr-only">Heures dormies</span>
                <input
                  inputMode="decimal"
                  placeholder="7,5"
                  value={valeurChamp}
                  onChange={(ev) => setHeures(ev.target.value)}
                  required
                />
                <span>h</span>
              </label>
              <div className={styles.pastilles} role="radiogroup" aria-label="Qualité du sommeil">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={qualiteMontree === n}
                    aria-label={`Qualité ${n} sur 5`}
                    data-ressenti={ressentiDeQualite(n)}
                    onClick={() => setQualite(qualiteMontree === n ? null : n)}
                  >
                    <span aria-hidden="true">{n}</span>
                  </button>
                ))}
              </div>
              <button type="submit" className={styles.bouton}>
                Noter
              </button>
            </form>
            <p className={styles.texte} aria-live="polite">
              Ressenti : {ressentiDeQualite(qualiteMontree) ?? 'non noté'}
            </p>
            {erreurNuit && (
              <p className={styles.erreur} role="alert">
                {erreurNuit}
              </p>
            )}
            <p className={styles.texte}>
              {s.moyenne_h !== null && s.moyenne_h !== undefined
                ? `Moyenne sur 7 jours : ${nombre(s.moyenne_h)} h (${s.nuits_comptees} nuit${s.nuits_comptees > 1 ? 's' : ''})`
                : 'Pas encore de nuit notée cette semaine.'}{' '}
              <Link to="/vie-courante/sommeil" className={styles.lien}>
                La tendance →
              </Link>
            </p>
          </section>

          <section
            className={`${styles.bloc} ${styles.apparait}`}
            style={{ ['--rang' as string]: 2 }}
            aria-labelledby="rem-ecart"
          >
            <h3 id="rem-ecart" className={styles.rubrique}>
              Écart mérité ?
            </h3>
            <p className={styles.verdict}>
              {eteinte && !erreurEcart ? 'Écart pris ce soir.' : VERDICTS[v.verdict]}
            </p>
            <p className={styles.texte}>{v.phrase}</p>
            <div className={styles.points}>
              <div role="img" aria-label={`${v.points} points`} className={styles.crans}>
                {Array.from({ length: 4 }, (_, i) => (
                  <span key={i} data-plein={i < Math.round(v.points) || undefined} />
                ))}
              </div>
              <p className={styles.texte}>
                <strong className={styles.chiffre}>{v.points}</strong> point{v.points > 1 ? 's' : ''} sur 4
              </p>
            </div>
            {v.details.length > 0 && (
              <ul className={styles.raisons} aria-label="Le détail des points">
                {v.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className={`${styles.bouton} ${styles.discret}`}
              onClick={() => void prendreEcart()}
              disabled={enCours}
            >
              J’ai pris mon écart aujourd’hui
            </button>
            {erreurEcart && (
              <p className={styles.erreur} role="alert">
                {erreurEcart}
              </p>
            )}
          </section>

          <Balance poids={etat.poids} apresPesee={recharger} />
        </div>

        <div className={styles.rebord} aria-hidden="true">
          <div
            className={styles.braise}
            data-niveau={eteinte ? 'eteinte' : niveauBraise(v.verdict)}
            data-consume={eteinte || undefined}
          />
        </div>
      </section>
    </div>
  )
}
