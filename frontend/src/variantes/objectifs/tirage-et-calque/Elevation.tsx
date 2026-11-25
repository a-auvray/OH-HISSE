import {
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from 'motion/react'
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useMemo, useRef, useState } from 'react'

import styles from './Elevation.module.css'
import type { Planche } from './donnees'
import {
  BOITE,
  type Echelles,
  bandesFranchies,
  blocsAVenir,
  cheminDe,
  echelles,
  limites,
  planDessine,
  pointsCourbe,
  reperesDeRecord,
  taquets,
  ZONE,
} from './geometrie'
import { Mire } from './Mires'
import { Cle } from './Cle'
import { type ClefMotif, clesUtilisees, urlMotif } from './clefsMotifs'
import { Motifs } from './Motifs'
import {
  type Analyse,
  annotationAssise,
  dateCompacte,
  decimal,
  isoDe,
  joursDeEcart,
  jourDe,
  legendeFil,
  niveau,
  positionElastique,
  SEUIL_JOURS,
  tensionFil,
} from './modele'
import { useNiveauAnimation } from './useNiveauAnimation'

/** Le ressort du verrou : un claquement net, sans rebond appuyé. */
const VERROU = { type: 'spring', stiffness: 600, damping: 45 } as const
const EXPO = [0.16, 1, 0.3, 1] as const

interface Props {
  planche: Planche
  /** Le passage en tireuse en entier (premier passage du jour, ou une donnée a changé) ; sinon un fondu court. */
  complet: boolean
  /** Le jour de la visite précédente (AAAA-MM-JJ), pour faire glisser la ligne du jour. */
  visitePrecedente: string | null
}

/**
 * L'élévation d'une planche : en dessous, le tirage (le réalisé, en assises hachurées) ; au-dessus,
 * le calque (le plan, recalé sur aujourd'hui) accroché à ses deux taquets. S'il a glissé, on est en
 * retard (il est descendu) ou en avance (il est monté) : la distance entre les deux mires est l'écart.
 * On peut saisir la languette et tirer le calque jusqu'au calage ; il revient à la vérité du jour.
 */
export function Elevation({ planche, complet, visitePrecedente }: Props) {
  const { objectif, analyse: a } = planche
  const niveauAnimation = useNiveauAnimation()
  const e = useMemo(() => echelles(a), [a])
  const dessinPlan = useMemo(() => planDessine(a, e), [a, e])
  const repos = dessinPlan?.repos ?? 0
  const prefixe = useId().replace(/:/g, '')
  const [survol, setSurvol] = useState<number | null>(null)

  /* --- Le passage en tireuse : une bande monte, révélant l'encre sous le halo --- */
  // Décidé au montage : une donnée qui change ensuite ne rejoue pas la planche depuis le début.
  const [passage] = useState(complet)
  const entree = niveauAnimation === 'cinema' && passage
  const revele = useMotionValue(entree ? 0 : 1)
  const fondu = useMotionValue(entree || niveauAnimation === 'immobile' ? 1 : 0)
  const decoupe = useTransform(revele, (v) => `inset(${((1 - v) * 100).toFixed(2)}% 0 0 0)`)
  const hautBande = useTransform(revele, (v) => `${((1 - v) * 100).toFixed(2)}%`)
  const opaciteBande = useTransform(revele, (v) => (v <= 0 || v >= 1 ? 0 : 1))

  useEffect(() => {
    if (niveauAnimation === 'immobile') {
      revele.set(1)
      fondu.set(1)
      return
    }
    if (entree) {
      revele.set(0)
      fondu.set(1)
      const lecture = animate(revele, 1, { duration: 0.9, ease: EXPO })
      return () => lecture.stop()
    }
    revele.set(1)
    const lecture = animate(fondu, 1, { duration: niveauAnimation === 'sobre' ? 0.25 : 0.3, ease: 'easeOut' })
    return () => lecture.stop()
  }, [niveauAnimation, entree, revele, fondu])

  /* --- Le calage : le calque descend sur ses taquets, puis glisse jusqu'à sa position recalée --- */
  // Le premier rendu est déjà le bon : pas d'image où le calque serait au mauvais endroit.
  const y = useMotionValue(niveauAnimation === 'sobre' ? 0 : entree ? -34 : repos)
  const apparition = useMotionValue(entree ? 0 : 1)
  const tire = useRef(false)
  const reposActuel = useRef(repos)
  const [enMain, setEnMain] = useState(false)
  const [claque, setClaque] = useState(false)

  useEffect(() => {
    reposActuel.current = repos
  }, [repos])

  // À la pose : le calque arrive sur ses taquets (claquement), puis le calage « ne tient pas » et il glisse.
  useEffect(() => {
    if (niveauAnimation === 'immobile') {
      y.set(reposActuel.current)
      apparition.set(1)
      return
    }
    if (niveauAnimation === 'sobre') {
      // Sans claquement ni dépassement : le calque se pose directement là où il va.
      apparition.set(1)
      const lecture = animate(y, reposActuel.current, { duration: 0.25, ease: 'easeOut' })
      return () => lecture.stop()
    }
    if (!entree) {
      apparition.set(1)
      y.set(reposActuel.current)
      return
    }
    y.set(-34)
    apparition.set(0)
    const arrivee = window.setTimeout(() => {
      animate(apparition, 1, { duration: 0.2 })
      animate(y, 0, VERROU)
    }, 650)
    // Le calage « ne tient pas » 160 ms après le claquement : il glisse lentement vers le réel.
    const glisse = window.setTimeout(
      () => {
        if (!tire.current) animate(y, reposActuel.current, { duration: 0.9, ease: EXPO })
      },
      650 + 160 + 200,
    )
    return () => {
      window.clearTimeout(arrivee)
      window.clearTimeout(glisse)
    }
  }, [niveauAnimation, entree, y, apparition])

  // Une donnée change (nouvel e1RM, cible déplacée) : le calque se recale avec le ressort du verrou.
  const reposPrecedent = useRef(repos)
  useEffect(() => {
    if (reposPrecedent.current === repos) return
    reposPrecedent.current = repos
    if (tire.current) return
    if (niveauAnimation === 'immobile') y.set(repos)
    else animate(y, repos, niveauAnimation === 'cinema' ? VERROU : { duration: 0.25, ease: 'easeOut' })
  }, [repos, niveauAnimation, y])

  /* --- Le glisser : la languette, à la souris, au doigt et au clavier --- */
  const prise = useRef<{ clientY: number; y: number; facteur: number } | null>(null)
  const [ecartKg, setEcartKg] = useState(Math.abs(repos) / e.parKg)
  useMotionValueEvent(y, 'change', (v) => {
    const kg = Math.round((Math.abs(v) / e.parKg) * 10) / 10
    setEcartKg((precedent) => (precedent === kg ? precedent : kg))
  })

  const bornes = [Math.min(0, repos), Math.max(0, repos)] as const
  const revenir = () => animate(y, repos, niveauAnimation === 'cinema' ? VERROU : { duration: 0.2 })

  function saisir(evenement: PointerEvent<SVGGElement>) {
    const svg = evenement.currentTarget.ownerSVGElement
    const rect = svg?.getBoundingClientRect()
    prise.current = {
      clientY: evenement.clientY,
      y: y.get(),
      facteur: rect && rect.height > 0 ? BOITE.hauteur / rect.height : 1,
    }
    evenement.currentTarget.setPointerCapture?.(evenement.pointerId)
    tire.current = true
    setEnMain(true)
  }

  function deplacer(evenement: PointerEvent<SVGGElement>) {
    const depart = prise.current
    if (!depart) return
    const brut = depart.y + (evenement.clientY - depart.clientY) * depart.facteur
    const suivant = positionElastique(brut, repos)
    // Le micro-claquement : on passe par le calage.
    if (suivant === 0 && y.get() !== 0) {
      setClaque(true)
      window.setTimeout(() => setClaque(false), 180)
    }
    y.set(suivant)
  }

  function relacher() {
    if (!prise.current) return
    prise.current = null
    tire.current = false
    setEnMain(false)
    void revenir()
  }

  function toucher(evenement: KeyboardEvent<SVGGElement>) {
    const pas = a.pas * e.parKg
    if (evenement.key === 'ArrowUp' || evenement.key === 'ArrowDown') {
      evenement.preventDefault()
      evenement.stopPropagation()
      const sens = evenement.key === 'ArrowUp' ? -1 : 1
      const cible = Math.max(bornes[0], Math.min(bornes[1], y.get() + sens * pas))
      if (cible === 0 && y.get() !== 0) {
        setClaque(true)
        window.setTimeout(() => setClaque(false), 180)
      }
      animate(y, cible, { duration: niveauAnimation === 'immobile' ? 0 : 0.14, ease: 'easeOut' })
    } else if (evenement.key === 'Escape') {
      evenement.preventDefault()
      evenement.stopPropagation()
      void revenir()
    }
  }

  /* --- Ce qui suit le calque sans re-rendu : l'ombre, le fil tendu --- */
  const ombre = useTransform(y, (v) => {
    const d = 1 + 5 * Math.min(1, Math.abs(v) / 60)
    return `drop-shadow(${(-d).toFixed(1)}px ${d.toFixed(1)}px ${(d * 1.5).toFixed(1)}px var(--ombre-calque))`
  })
  const plan = a.plan
  const yCible = e.y(a.cible)
  const yFil = useTransform(y, (v) => yCible + v)
  const largeurFil = useTransform(y, (v) =>
    plan ? `${tensionFil(joursDeEcart(plan, Math.abs(v) / e.parKg)).epaisseur.toFixed(2)}px` : '0px',
  )
  const tiretsFil = useTransform(y, (v) =>
    plan ? tensionFil(joursDeEcart(plan, Math.abs(v) / e.parKg)).tirets : 'none',
  )
  const couleurFil = useTransform(y, (v) =>
    plan && joursDeEcart(plan, Math.abs(v) / e.parKg) > SEUIL_JOURS && v > 0
      ? 'var(--danger-texte)'
      : 'var(--texte)',
  )
  const opaciteFil = useTransform(y, (v) => (Math.abs(v) < 0.6 ? 0 : 1))

  /* --- La ligne du jour : elle glisse depuis la dernière visite si elle date de deux jours ou plus --- */
  const xAujourdhui = e.x(a.jourAujourdhui)
  const jourAvant = visitePrecedente ? jourDe(visitePrecedente) : null
  const glisseDepuis =
    jourAvant !== null && a.jourAujourdhui - jourAvant >= 2 && jourAvant >= e.jourDebut
      ? Math.min(ZONE.droite, e.x(jourAvant))
      : null
  const xJour = useMotionValue(
    niveauAnimation === 'cinema' && glisseDepuis !== null ? glisseDepuis : xAujourdhui,
  )
  const [rappel, setRappel] = useState(glisseDepuis !== null && niveauAnimation !== 'immobile')
  useEffect(() => {
    if (niveauAnimation === 'immobile' || glisseDepuis === null) {
      xJour.set(xAujourdhui)
      return
    }
    const lecture = animate(xJour, xAujourdhui, {
      duration: niveauAnimation === 'cinema' ? 0.6 : 0.1,
      ease: EXPO,
    })
    const minuterie = window.setTimeout(() => setRappel(false), 3000)
    return () => {
      lecture.stop()
      window.clearTimeout(minuterie)
    }
  }, [niveauAnimation, glisseDepuis, xAujourdhui, xJour])

  const legende = legendeFil(a)
  const depuisVisite = jourAvant === null ? null : a.jourAujourdhui - jourAvant
  const atteint = a.statut === 'atteint' || a.statut === 'cible-atteinte'
  const calage = Math.abs(repos) < 0.5
  const clefs = useMemo(() => {
    const trames: ClefMotif[] = bandesFranchies(a, e).map((b) => b.type ?? 'sans-bloc')
    if (blocsAVenir(a, e).length > 0) trames.push('points')
    return clesUtilisees(trames)
  }, [a, e])

  return (
    <figure className={styles.figure} data-statut={a.statut}>
      <div className={styles.defile}>
        <motion.div className={styles.pile} style={{ opacity: fondu }}>
          <svg
            className={`${styles.svg} ${styles.halo}`}
            viewBox={`0 0 ${BOITE.largeur} ${BOITE.hauteur}`}
            aria-hidden="true"
            focusable="false"
          >
            <Tirage a={a} e={e} prefixe={`${prefixe}h`} graine={objectif.id} texte={false} />
          </svg>

          <motion.div className={styles.encre} style={{ clipPath: decoupe }}>
            <svg
              className={styles.svg}
              viewBox={`0 0 ${BOITE.largeur} ${BOITE.hauteur}`}
              role="group"
              aria-label={`Élévation de l’e1RM, ${objectif.titre}`}
              onPointerLeave={() => setSurvol(null)}
            >
              <Tirage
                a={a}
                e={e}
                prefixe={`${prefixe}e`}
                graine={objectif.id}
                texte
                survol={survol}
                surSurvol={setSurvol}
                xJour={xJour}
                mireTirage={dessinPlan?.mire ?? null}
                claque={claque}
              />

              {plan && (
                <motion.line
                  className={styles.fil}
                  x1={e.x(plan.jourFin)}
                  x2={e.x(plan.jourFin)}
                  y1={yCible}
                  y2={yFil}
                  style={{
                    strokeWidth: largeurFil,
                    strokeDasharray: tiretsFil,
                    stroke: couleurFil,
                    opacity: opaciteFil,
                  }}
                  aria-hidden="true"
                />
              )}

              {dessinPlan && plan && (
                <motion.g
                  className={styles.calque}
                  data-atteint={atteint || undefined}
                  data-tire={enMain || undefined}
                  style={{ y, opacity: apparition, filter: ombre }}
                >
                  <g aria-hidden="true">
                    <rect
                      className={styles.feuille}
                      x={ZONE.gauche - 14}
                      y={ZONE.haut - 46}
                      width={ZONE.droite - ZONE.gauche + 40}
                      height={ZONE.bas - ZONE.haut + 88}
                    />
                    {taquets().map((t) => (
                      <circle key={t.x} className={styles.perforation} cx={t.x} cy={t.y} r={7} />
                    ))}
                    <Futurs a={a} e={e} prefixe={`${prefixe}e`} />
                    <line
                      className={styles.plan}
                      x1={dessinPlan.x0}
                      y1={dessinPlan.y0}
                      x2={dessinPlan.x1}
                      y2={dessinPlan.y1}
                    />
                    <text
                      className={styles.annotation}
                      x={dessinPlan.x1}
                      y={dessinPlan.y1 - 10}
                      textAnchor="end"
                    >
                      {`PLAN · ${niveau(plan.valeurFin)} · ${dateCompacte(isoDe(plan.jourFin))}`}
                    </text>
                    {dessinPlan.mire && (
                      <Mire x={dessinPlan.mire.x} y={dessinPlan.mire.y} calque pleine={atteint} />
                    )}
                  </g>

                  {!calage && (
                    <g
                      className={styles.languette}
                      role="slider"
                      tabIndex={0}
                      aria-label="Calque du plan"
                      aria-orientation="vertical"
                      aria-valuemin={0}
                      aria-valuemax={Math.round((Math.abs(repos) / e.parKg) * 10) / 10}
                      aria-valuenow={ecartKg}
                      aria-valuetext={texteCalque(ecartKg, repos)}
                      onPointerDown={saisir}
                      onPointerMove={deplacer}
                      onPointerUp={relacher}
                      onPointerCancel={relacher}
                      onKeyDown={toucher}
                    >
                      <rect
                        className={styles.cadreFocus}
                        x={ZONE.droite + 22}
                        y={(ZONE.haut + ZONE.bas) / 2 - 44}
                        width={36}
                        height={88}
                      />
                      <rect
                        className={styles.prise}
                        x={ZONE.droite + 26}
                        y={(ZONE.haut + ZONE.bas) / 2 - 40}
                        width={28}
                        height={80}
                      />
                      <path
                        className={styles.fleches}
                        d={`M${ZONE.droite + 40},${(ZONE.haut + ZONE.bas) / 2 - 24} l-6,9 h12 z M${ZONE.droite + 40},${(ZONE.haut + ZONE.bas) / 2 + 24} l-6,-9 h12 z`}
                      />
                    </g>
                  )}
                </motion.g>
              )}
            </svg>
          </motion.div>

          <motion.div
            className={styles.bande}
            style={{ top: hautBande, opacity: opaciteBande }}
            aria-hidden="true"
          />
        </motion.div>
      </div>

      <figcaption className={styles.legende}>
        <span className={styles.survolTexte} aria-hidden="true">
          {survol !== null ? annotationAssise(a, survol) : ' '}
        </span>
        {rappel && depuisVisite !== null && (
          <span className={styles.rappel}>depuis ta dernière visite : il y a {depuisVisite} j</span>
        )}
        {legende && <span>{legende}</span>}
        <Cle prefixe={`${prefixe}e`} clefs={clefs} />
      </figcaption>
    </figure>
  )
}

/** « Calque du plan, recalé 1,3 kilo sous le calage » : la position de la languette, à voix haute. */
function texteCalque(ecartKg: number, repos: number): string {
  if (ecartKg < 0.05) return 'Calque du plan, calé'
  const sens = repos > 0 ? 'sous' : 'au-dessus du'
  const kilos = `${decimal(ecartKg)} kilo${ecartKg >= 2 ? 's' : ''}`
  return repos > 0
    ? `Calque du plan, recalé ${kilos} ${sens} le calage`
    : `Calque du plan, recalé ${kilos} ${sens} calage`
}

interface PropsTirage {
  a: Analyse
  e: Echelles
  prefixe: string
  graine: number
  /** Les cotes écrites (niveaux, dates, cible) : absentes de la copie en halo qui reste dessous. */
  texte: boolean
  survol?: number | null
  surSurvol?: (rang: number | null) => void
  xJour?: MotionValue<number>
  mireTirage?: { x: number; y: number } | null
  claque?: boolean
}

/** Le tirage : l'élévation du réalisé. C'est ce qui se développe sous la bande de la tireuse. */
function Tirage({ a, e, prefixe, graine, texte, survol, surSurvol, xJour, mireTirage, claque }: PropsTirage) {
  const lims = useMemo(() => limites(a, e), [a, e])
  const bandes = useMemo(() => bandesFranchies(a, e), [a, e])
  const courbe = useMemo(() => pointsCourbe(a.points, e, graine), [a, e, graine])
  const records = useMemo(() => reperesDeRecord(a.points, e), [a, e])
  const yCible = e.y(a.cible)
  const dernier = courbe.at(-1)
  const debut = isoDe(e.jourDebut)
  const fin = isoDe(e.jourFin)
  const echeance = a.jourEcheance <= e.jourFin

  return (
    <g className={styles.tirage} aria-hidden="true">
      <defs>
        <Motifs prefixe={prefixe} />
      </defs>

      {lims.map((l) => (
        <g key={l.kg}>
          <line
            className={styles.niveau}
            data-franchi={a.e1rm !== null && l.kg <= a.e1rm + 1e-9 ? '' : undefined}
            x1={ZONE.gauche}
            x2={ZONE.droite}
            y1={l.y}
            y2={l.y}
          />
          {texte && l.etiquette !== null && (
            <text className={styles.annotation} x={ZONE.gauche - 10} y={l.y + 4} textAnchor="end">
              {decimal(l.etiquette)}
            </text>
          )}
        </g>
      ))}

      {survol !== null && survol !== undefined && a.assises[survol] && (
        <rect
          className={styles.eclairee}
          x={ZONE.gauche}
          y={e.y(a.assises[survol].haut)}
          width={ZONE.droite - ZONE.gauche}
          height={(a.assises[survol].haut - a.assises[survol].bas) * e.parKg}
        />
      )}

      {bandes.map((b) => (
        <rect
          key={b.rang}
          className={styles.sediment}
          x={b.x}
          y={b.y}
          width={b.largeur}
          height={b.hauteur}
          style={{ fill: urlMotif(prefixe, b.type ?? 'sans-bloc') }}
        />
      ))}

      <line className={styles.cible} x1={ZONE.gauche} x2={ZONE.droite} y1={yCible - 2.5} y2={yCible - 2.5} />
      <line className={styles.cible} x1={ZONE.gauche} x2={ZONE.droite} y1={yCible + 0.5} y2={yCible + 0.5} />
      {texte && (
        <text className={styles.annotation} x={ZONE.droite} y={yCible - 10} textAnchor="end">
          {`CIBLE ${niveau(a.cible).slice(5)}`}
        </text>
      )}

      {courbe.length > 1 && <path className={styles.courbe} d={cheminDe(courbe)} />}
      {records.map((r) => (
        <path
          key={`${r.x}-${r.y}`}
          className={styles.repere}
          d={`M${r.x.toFixed(1)},${r.y.toFixed(1)} l-4.5,-8 h9 z`}
        />
      ))}
      {dernier && <circle className={styles.dernier} cx={dernier.x} cy={dernier.y} r={3.4} />}

      {texte && xJour && (
        <>
          <motion.line className={styles.jour} x1={xJour} x2={xJour} y1={ZONE.haut - 6} y2={ZONE.bas} />
        </>
      )}

      {texte && (
        <>
          <text className={styles.annotation} x={ZONE.gauche} y={ZONE.bas + 26}>
            {dateCompacte(debut)}
          </text>
          {echeance && (
            <text className={styles.annotation} x={ZONE.droite} y={ZONE.bas + 26} textAnchor="end">
              {dateCompacte(fin)}
            </text>
          )}
        </>
      )}

      {taquets().map((t) => (
        <rect key={t.x} className={styles.taquet} x={t.x - 5} y={t.y - 4} width={10} height={8} />
      ))}
      {mireTirage && <Mire x={mireTirage.x} y={mireTirage.y} />}
      {mireTirage && claque && (
        <circle className={styles.claque} cx={mireTirage.x} cy={mireTirage.y} r={14} />
      )}

      {surSurvol &&
        a.assises.map((s, rang) => (
          <rect
            key={rang}
            className={styles.zoneSurvol}
            x={ZONE.gauche}
            y={e.y(s.haut)}
            width={ZONE.droite - ZONE.gauche}
            height={(s.haut - s.bas) * e.parKg}
            onPointerEnter={() => surSurvol(rang)}
          />
        ))}
    </g>
  )
}

/** Les blocs à venir, portés par le calque : des bandes de points, chacune avec son repère. */
function Futurs({ a, e, prefixe }: { a: Analyse; e: Echelles; prefixe: string }) {
  const blocs = blocsAVenir(a, e)
  return (
    <>
      {blocs.map((b) => (
        <g key={b.bloc.id}>
          <rect
            className={styles.blocFutur}
            x={b.x}
            y={ZONE.haut - 18}
            width={b.largeur}
            height={ZONE.bas - ZONE.haut + 18}
            style={{ fill: urlMotif(prefixe, 'points') }}
          />
          <line className={styles.limiteBloc} x1={b.x} x2={b.x} y1={ZONE.haut - 18} y2={ZONE.bas} />
          <text className={styles.annotation} x={b.x + 6} y={ZONE.haut - 4}>
            {b.etiquette}
          </text>
        </g>
      ))}
    </>
  )
}
