import { type CSSProperties, type FormEvent, useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router'

import type { EtatDuJour } from '../../../api/types'
import { kg, nombre } from '../../../commun/format'
import { noterEcart, noterNuit, peser, useEtatDuJour } from '../../../espaces/vie-courante/etat'
import { ONGLETS } from '../../../espaces/vie-courante/onglets'
import { Panneau } from '../../../themes/Panneau'
import { BarreDeNuit, ColonneRecuperation, Rectangle, Reglette, Tranche } from './Dessins'
import {
  barreNuit,
  choisirUne,
  colonneRecuperation,
  dureeEnClair,
  jourDeLAnnee,
  legendeDeLaPile,
  libelleVerdict,
  reglette,
} from './modele'
import { useMaintenant } from './horloge'
import { EDITIONS, heureCourte, jourDuSoleil, lumiere, palier, positionDuSoleil } from './soleil'
import { useEntree } from './tirage'
import styles from './Aujourdhui.module.css'

const QUAND = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

const DATE_FOLIO = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
})

type StyleAvecVariables = CSSProperties & Record<`--${string}`, string | number>

/**
 * « Aujourd'hui » en Tirage du jour : une seule feuille de papier, éclairée par le vrai soleil de Ouistreham,
 * où l'on lit d'abord si le corps est prêt. Mêmes données et mêmes gestes que la page commune
 * (récupération, écart mérité, nuit, poids) ; seule la façon de les montrer change.
 */
export function Aujourdhui() {
  const [etat, recharger] = useEtatDuJour()
  if (etat.etat === 'chargement') return <p className={styles.attente}>Un instant…</p>
  if (etat.etat === 'erreur') return <p className={styles.erreur}>{etat.message}</p>
  return <Feuille etat={etat.valeur} recharger={recharger} />
}

function Feuille({ etat, recharger }: { etat: EtatDuJour; recharger: () => void }) {
  const [entree, entreeFinie] = useEntree()
  const maintenant = useMaintenant()
  const [pris, setPris] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [heures, setHeures] = useState<string | null>(null)
  const [qualite, setQualite] = useState<number | null>(null)
  const [erreurNuit, setErreurNuit] = useState<string | null>(null)
  const [poids, setPoids] = useState('')
  const [erreurPoids, setErreurPoids] = useState<string | null>(null)

  // Lever et coucher ne changent que d'un jour à l'autre : on ne refait pas le balayage chaque minute.
  const debutDuJour = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())
  const jourSoleil = useMemo(() => jourDuSoleil(new Date(debutDuJour)), [debutDuJour])
  const soleil = positionDuSoleil(maintenant)
  const lum = lumiere(soleil)

  const r = etat.recuperation
  const v = etat.cheat_meal
  const s = etat.sommeil
  const p = etat.poids
  const une = choisirUne(etat, pris)
  const colonne = colonneRecuperation(r)
  const barre = barreNuit(s.derniere_nuit_h, s.moyenne_h)
  const jour = jourDeLAnnee(maintenant)
  const nuit =
    heures ?? (s.derniere_nuit_h === null || s.derniere_nuit_h === undefined ? '' : String(s.derniere_nuit_h))

  async function ecart() {
    setEnCours(true)
    await noterEcart()
    setEnCours(false)
    setPris(true)
    recharger()
  }

  async function enregistrerNuit(evenement: FormEvent) {
    evenement.preventDefault()
    const message = await noterNuit(nuit, qualite)
    setErreurNuit(message)
    if (!message) recharger()
  }

  async function enregistrerPoids(evenement: FormEvent) {
    evenement.preventDefault()
    const message = await peser(poids)
    setErreurPoids(message)
    if (!message) {
      setPoids('')
      recharger()
    }
  }

  const folio = [
    `n° ${jour}`,
    DATE_FOLIO.format(maintenant),
    jourSoleil.lever && jourSoleil.coucher
      ? `soleil ${heureCourte(jourSoleil.lever)} → ${heureCourte(jourSoleil.coucher)}`
      : null,
    EDITIONS[palier(soleil)],
  ]
    .filter(Boolean)
    .join(' · ')

  const styleFeuille: StyleAvecVariables = { '--rasance': lum.rasance }
  const aucuneNuit = barre === null

  return (
    <div className={styles.page}>
      <article
        className={styles.feuille}
        data-entree={entree}
        data-cote={lum.cote}
        style={styleFeuille}
        aria-label="Le tirage du jour"
      >
        <div className={styles.lumiere} aria-hidden="true" />
        <div className={styles.masque} onAnimationEnd={(e) => e.target === e.currentTarget && entreeFinie()}>
          <div className={styles.contenu}>
            <p className={styles.folio}>{folio}</p>

            <div className={styles.grille}>
              <section className={styles.une} aria-labelledby="tirage-ecart">
                <p className={styles.surTitre}>{une.surTitre}</p>
                <div
                  className={styles.titreBloc}
                  data-impression={une.impression}
                  data-pris={pris || undefined}
                >
                  <Rectangle impression={une.impression} />
                  <h2 id="tirage-ecart" className={styles.titre}>
                    {une.titre}
                  </h2>
                </div>
                <p className={styles.chapeau}>{v.phrase}</p>

                <div className={styles.ecart}>
                  <h3 className={styles.rubrique}>Écart mérité ?</h3>
                  <Reglette cases={reglette(v.points)} impression={une.impression} />
                  <p className={styles.ligne}>
                    <strong>{v.points}</strong> point{Math.abs(v.points) > 1 ? 's' : ''} sur 4
                    {une.allegee && (
                      <>
                        {' '}
                        · <span className={styles.verdict}>{libelleVerdict(v.verdict)}</span>
                      </>
                    )}
                  </p>
                  {v.details.length > 0 && (
                    <ul className={styles.bareme} aria-label="Le détail des points">
                      {v.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    className={styles.bouton}
                    onClick={() => void ecart()}
                    disabled={enCours}
                  >
                    J’ai pris mon écart aujourd’hui
                  </button>
                </div>
              </section>

              <section className={styles.corps} aria-labelledby="tirage-corps">
                <h3 id="tirage-corps" className={styles.rubrique}>
                  Le corps
                </h3>
                <div className={styles.texteCorps}>
                  <p className={styles.pourcentage}>
                    {r.recupere ? (
                      'Prêt'
                    ) : (
                      <>
                        {colonne.pourcentage}
                        <span className={styles.unite}> %</span>
                      </>
                    )}
                  </p>
                  <p className={styles.ligne}>
                    {r.recupere
                      ? 'Tu es récupéré : la prochaine séance peut être intense.'
                      : `Encore ${dureeEnClair(r.restant_h)} · prochain effort intense conseillé ${r.fin ? QUAND.format(new Date(r.fin)) : 'bientôt'}.`}
                  </p>
                  {colonne.seuil !== null && (
                    <p className={styles.legende}>Le trait marque le seuil d’allègement : 24 h restantes.</p>
                  )}
                  {r.raisons.length > 0 && (
                    <Panneau id="tirage-recuperation" titre="Pourquoi" resume={r.raisons[0]}>
                      <ul className={styles.raisons}>
                        {r.raisons.map((raison) => (
                          <li key={raison}>{raison}</li>
                        ))}
                      </ul>
                    </Panneau>
                  )}
                </div>
                <div className={styles.colonneBloc}>
                  <ColonneRecuperation
                    colonne={colonne}
                    libelle={`Récupération à ${Math.round(r.progression * 100)} %`}
                  />
                </div>
              </section>
            </div>

            <div className={styles.rangee}>
              <section className={styles.rubriqueBloc} aria-labelledby="tirage-nuit">
                <h3 id="tirage-nuit" className={styles.rubrique}>
                  La nuit
                </h3>
                <p className={styles.chiffre}>
                  {aucuneNuit ? '—' : dureeEnClair(s.derniere_nuit_h ?? 0)}
                  {barre?.courte && <span className={styles.badge}>courte</span>}
                </p>
                <BarreDeNuit barre={barre} />
                <form className={styles.champ} onSubmit={enregistrerNuit}>
                  <label>
                    <span className="sr-only">Heures dormies</span>
                    <input
                      inputMode="decimal"
                      placeholder="7,5"
                      value={nuit}
                      onChange={(ev) => setHeures(ev.target.value)}
                      required
                    />
                    <span aria-hidden="true">h</span>
                  </label>
                  <div className={styles.lunes} role="radiogroup" aria-label="Qualité du sommeil">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={qualite === n}
                        aria-label={`Qualité ${n} sur 5`}
                        data-allume={qualite !== null && n <= qualite ? true : undefined}
                        onClick={() => setQualite(qualite === n ? null : n)}
                      >
                        ☾
                      </button>
                    ))}
                  </div>
                  <button type="submit" className={styles.bouton}>
                    Noter
                  </button>
                </form>
                {erreurNuit && (
                  <p className={styles.erreur} role="alert">
                    {erreurNuit}
                  </p>
                )}
                <p className={styles.ligne}>
                  {s.moyenne_h !== null && s.moyenne_h !== undefined
                    ? `Moyenne sur 7 jours : ${nombre(s.moyenne_h)} h (${s.nuits_comptees} nuit${s.nuits_comptees > 1 ? 's' : ''})`
                    : 'Pas encore de nuit notée cette semaine.'}
                </p>
              </section>

              <section className={styles.rubriqueBloc} aria-labelledby="tirage-poids">
                <h3 id="tirage-poids" className={styles.rubrique}>
                  La balance
                </h3>
                <p className={styles.chiffre}>{p ? kg(p.kg, 1) : '—'}</p>
                <p className={styles.ligne}>
                  {p
                    ? p.a_jour
                      ? 'Moyenne des pesées des trois dernières semaines.'
                      : 'Dernière pesée de plus de trois semaines : non mise à jour.'
                    : 'Le 1RM et les charges en ont besoin : une pesée par semaine, le lundi matin à jeun.'}
                </p>
                <form className={styles.champ} onSubmit={enregistrerPoids}>
                  <label>
                    <span className="sr-only">Poids du jour en kg</span>
                    <input
                      inputMode="decimal"
                      placeholder="75,0"
                      value={poids}
                      onChange={(ev) => setPoids(ev.target.value)}
                      required
                    />
                    <span aria-hidden="true">kg</span>
                  </label>
                  <button type="submit" className={styles.bouton}>
                    Peser
                  </button>
                </form>
                {erreurPoids && (
                  <p className={styles.erreur} role="alert">
                    {erreurPoids}
                  </p>
                )}
              </section>

              <section className={styles.rubriqueBloc} aria-labelledby="tirage-bref">
                <h3 id="tirage-bref" className={styles.rubrique}>
                  En bref
                </h3>
                <ul className={styles.liens}>
                  <li>
                    <Link to="/vie-courante/sommeil" className={styles.lien}>
                      La tendance du sommeil →
                    </Link>
                  </li>
                  {r.recup_active_conseillee && (
                    <li>
                      <Link to="/marine/assistant" className={styles.lien}>
                        Une baignade courte t’aiderait : l’assistant de sortie →
                      </Link>
                    </li>
                  )}
                </ul>
              </section>
            </div>
          </div>
        </div>

        {entree === 'tirage' && <div className={styles.rouleau} aria-hidden="true" />}

        <aside className={styles.bord} aria-label="La pile des jours">
          <nav className={styles.marge} aria-label="Pages de l’espace">
            {ONGLETS.map((o) => (
              <NavLink key={o.chemin} to={o.chemin} end={o.fin} className={styles.onglet}>
                {o.libelle}
              </NavLink>
            ))}
          </nav>
          <p className={styles.legendePile}>{legendeDeLaPile(jour, une.impression, pris)}</p>
          <div className={styles.pile}>
            <Tranche jour={jour} impression={une.impression} />
          </div>
        </aside>
      </article>
    </div>
  )
}
