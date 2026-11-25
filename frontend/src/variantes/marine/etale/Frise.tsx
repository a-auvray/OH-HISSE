import { type KeyboardEvent, useId } from 'react'

import { nombre } from '../../../commun/format'
import { useLargeur } from '../../../commun/useLargeur'
import { jourCourt } from '../../../espaces/marine/lecture'
import { heureCourte } from '../../../espaces/marine/titre'
import styles from './Frise.module.css'
import { arrondi } from './lecture'
import { type Heure, type Maree, type Pt, type Soleil, cheminLisse, intervallesNuit } from './modele'

const HAUTEUR = 176
const HAUT = 30
const BAS_COURBE = 112
const BANDE = { haut: 120, hauteur: 11 }
const AXE = 150
const MARGE = 14

export interface PropsFrise {
  heures: readonly Heure[]
  marees: readonly Maree[]
  soleil: readonly Soleil[]
  /** L'instant présent, en millisecondes. */
  maintenant: number
  /** Le créneau conseillé : sa fenêtre est éclaircie. */
  creneau: { debut: string; fin: string } | null
  rang: number
  onRang: (rang: number) => void
  /** Les touches [ et ] : passer au jour précédent ou suivant. */
  onJour?: (sens: -1 | 1) => void
  /** Le moment d'étale du créneau : son libellé s'écrit sous la fenêtre. */
  etale?: { instant: string; courantKmh: number | null } | null
  /** Texte lu pour la valeur du curseur. */
  texteValeur: string
}

const ms = (iso: string) => new Date(iso).getTime()

/**
 * La frise des heures : le seul plan où l'axe horizontal est le temps, entièrement visible (toute la prévision).
 * La courbe de marée, la fenêtre du créneau, la nuit hachurée, le danger heure par heure, la colonne « maintenant »
 * et le curseur visé. Le curseur est un vrai curseur natif (<input type="range">) posé sur le dessin : clavier,
 * souris et doigt marchent sans rien réinventer.
 */
interface PropsDessin extends Omit<PropsFrise, 'onRang' | 'onJour' | 'texteValeur'> {
  largeur: number
}

/** Le dessin de la frise : tout est calculé à partir de la largeur mesurée et des heures. */
function Dessin({ largeur, heures, marees, soleil, maintenant, creneau, rang, etale }: PropsDessin) {
  const idHachure = `nuit${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const idDegrade = `maree${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const idDanger = `rouge${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const premier = heures[0]!
  const dernier = heures.at(-1)!
  const t0 = ms(premier!.instant)
  const t1 = ms(dernier!.instant)
  const x0 = MARGE
  const x1 = largeur - MARGE
  const x = (t: number) => x0 + ((t - t0) / (t1 - t0)) * (x1 - x0)
  const hauteurs = heures.map((h) => h.hauteur_eau_m).filter((v): v is number => typeof v === 'number')
  const [vmin, vmax] =
    hauteurs.length > 0 ? [Math.min(...hauteurs) - 0.3, Math.max(...hauteurs) + 0.3] : [0, 1]
  const y = (v: number) => HAUT + (1 - (v - vmin) / (vmax - vmin || 1)) * (BAS_COURBE - HAUT)
  const points: Pt[] = heures.flatMap((h) =>
    typeof h.hauteur_eau_m === 'number' ? [{ x: x(ms(h.instant)), y: y(h.hauteur_eau_m) }] : [],
  )
  const courbe = cheminLisse(points)
  const aire =
    points.length > 1
      ? `${courbe} L${points.at(-1)!.x.toFixed(1)},${BAS_COURBE} L${points[0]!.x.toFixed(1)},${BAS_COURBE} Z`
      : ''

  // Un repère toutes les six heures, aux heures rondes (heure de la plage).
  const reperes: number[] = []
  for (let t = Math.ceil(t0 / 3_600_000) * 3_600_000; t <= t1; t += 3_600_000) {
    const h = Number(heureCourte(new Date(t).toISOString()).split('h')[0])
    if (h % 6 === 0) reperes.push(t)
  }

  const choisie = heures[Math.min(rang, heures.length - 1)]!
  const xc = x(ms(choisie.instant))
  const largeurHeure = (x1 - x0) / (heures.length - 1)
  const fenetre = creneau
    ? { a: Math.max(x0, x(ms(creneau.debut))), b: Math.min(x1, x(ms(creneau.fin))) }
    : null
  const xm = Math.min(x1, Math.max(x0, x(maintenant)))

  return (
    <svg
      className={styles.dessin}
      width={largeur}
      height={HAUTEUR}
      viewBox={`0 0 ${largeur} ${HAUTEUR}`}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={idHachure}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" className={styles.hachureNuit} />
        </pattern>
        <pattern
          id={idDanger}
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="4" className={styles.hachureRouge} />
        </pattern>
        <linearGradient id={idDegrade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.degradeHaut} />
          <stop offset="1" className={styles.degradeBas} />
        </linearGradient>
      </defs>

      {/* La nuit, hachurée, d'après le lever et le coucher du soleil. */}
      {intervallesNuit(soleil, t0, t1).map((n) => (
        <rect
          key={n.debut}
          x={x(n.debut)}
          y={HAUT - 16}
          width={x(n.fin) - x(n.debut)}
          height={AXE - HAUT + 16}
          fill={`url(#${idHachure})`}
        />
      ))}

      {/* Le créneau : une fenêtre éclaircie. */}
      {fenetre && fenetre.b > fenetre.a && (
        <g>
          <rect
            x={fenetre.a}
            y={HAUT - 16}
            width={fenetre.b - fenetre.a}
            height={BANDE.haut + BANDE.hauteur - HAUT + 16}
            className={styles.fenetre}
          />
          <text x={fenetre.a + 4} y={HAUT - 5} className={styles.legende}>
            créneau
          </text>
        </g>
      )}

      {/* L'étale : le courant presque nul, nommé en toutes lettres sous la fenêtre. */}
      {etale && (
        <text
          x={Math.min(x1 - 4, Math.max(x0 + 4, x(ms(etale.instant))))}
          y={AXE - 6}
          textAnchor={
            x(ms(etale.instant)) > x1 - 120 ? 'end' : x(ms(etale.instant)) < x0 + 120 ? 'start' : 'middle'
          }
          className={styles.legendeForte}
        >
          étale · courant {arrondi(etale.courantKmh, 1)} km/h
        </text>
      )}

      <path d={aire} fill={`url(#${idDegrade})`} />
      <path d={courbe} className={styles.courbe} />

      {/* Le danger, heure par heure : trait fin (vert), hachures (rouge), plein (noir). */}
      {heures.map((h, i) => {
        const xa = x(ms(h.instant)) - largeurHeure / 2
        const l = Math.max(
          0,
          Math.min(x1 + largeurHeure / 2, xa + largeurHeure) - Math.max(x0 - largeurHeure / 2, xa),
        )
        const gauche = Math.max(x0 - largeurHeure / 2, xa)
        return h.danger === 'vert' ? (
          <rect
            key={h.instant}
            x={gauche}
            y={BANDE.haut + BANDE.hauteur - 3}
            width={l}
            height={3}
            className={styles.vert}
          />
        ) : (
          <g key={h.instant} data-rang={i}>
            <rect
              x={gauche}
              y={BANDE.haut}
              width={l}
              height={BANDE.hauteur}
              className={h.danger === 'noir' ? styles.noir : styles.rouge}
            />
            {h.danger === 'rouge' && (
              <rect x={gauche} y={BANDE.haut} width={l} height={BANDE.hauteur} fill={`url(#${idDanger})`} />
            )}
          </g>
        )
      })}

      {/* Les marées extrêmes. */}
      {marees.map((m) => {
        const t = ms(m.instant)
        if (t < t0 || t > t1) return null
        const haute = m.type === 'PM'
        return (
          <g key={m.instant}>
            <circle cx={x(t)} cy={y(m.hauteur_m)} r="3" className={styles.maree} />
            <text
              x={x(t)}
              y={y(m.hauteur_m) + (haute ? -9 : 17)}
              textAnchor="middle"
              className={styles.legende}
            >
              {haute ? 'PM' : 'BM'} {heureCourte(m.instant)} · {nombre(m.hauteur_m)} m
            </text>
          </g>
        )
      })}

      {/* Les heures et les jours. */}
      <line x1={x0} x2={x1} y1={AXE} y2={AXE} className={styles.axe} />
      {reperes.map((t) => {
        const iso = new Date(t).toISOString()
        const minuit = heureCourte(iso) === '0h'
        return (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={AXE} y2={AXE + 5} className={styles.axe} />
            <text x={x(t)} y={AXE + 18} textAnchor="middle" className={styles.graduation}>
              {minuit ? jourCourt(iso) : heureCourte(iso)}
            </text>
          </g>
        )
      })}

      {/* La colonne « maintenant » : franche. */}
      <line x1={xm} x2={xm} y1={HAUT - 16} y2={AXE} className={styles.maintenant} />
      <text x={Math.min(xm + 5, x1 - 56)} y={HAUT - 5} className={styles.legendeForte}>
        maintenant
      </text>

      {/* Le curseur visé : un filet de 1 px et un point sur la courbe. */}
      <line x1={xc} x2={xc} y1={HAUT - 16} y2={AXE} className={styles.vise} />
      {typeof choisie.hauteur_eau_m === 'number' && (
        <circle cx={xc} cy={y(choisie.hauteur_eau_m)} r="4.5" className={styles.pointVise} />
      )}
    </svg>
  )
}

export function Frise({
  heures,
  marees,
  soleil,
  maintenant,
  creneau,
  rang,
  onRang,
  onJour,
  etale,
  texteValeur,
}: PropsFrise) {
  const [cadre, largeur] = useLargeur<HTMLDivElement>()

  const touche = (e: KeyboardEvent<HTMLInputElement>) => {
    const dernier = Math.max(0, heures.length - 1)
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      onRang(0)
    } else if ((e.key === '[' || e.key === ']') && onJour) {
      e.preventDefault()
      onJour(e.key === ']' ? 1 : -1)
    } else if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      // Maj + flèche : six heures d'un coup (la flèche seule avance d'une heure).
      e.preventDefault()
      onRang(Math.min(dernier, Math.max(0, rang + (e.key === 'ArrowRight' ? 6 : -6))))
    }
  }

  const dessin =
    largeur > 0 && heures.length > 1 ? (
      <Dessin
        largeur={largeur}
        heures={heures}
        marees={marees}
        soleil={soleil}
        maintenant={maintenant}
        creneau={creneau}
        rang={rang}
        etale={etale}
      />
    ) : null

  return (
    <div className={styles.frise}>
      <div ref={cadre} className={styles.plan} style={{ height: HAUTEUR }}>
        {dessin}
        {heures.length > 1 && (
          <input
            id="heure-marine"
            className={styles.curseur}
            type="range"
            min={0}
            max={heures.length - 1}
            step={1}
            value={Math.min(rang, heures.length - 1)}
            onChange={(e) => onRang(Number(e.target.value))}
            onKeyDown={touche}
            aria-label="Voyage dans le temps"
            aria-valuetext={texteValeur}
            aria-keyshortcuts="N [ ] Shift+ArrowLeft Shift+ArrowRight"
          />
        )}
      </div>
    </div>
  )
}
