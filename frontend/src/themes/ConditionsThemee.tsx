import { animate } from 'motion/react'
import { type ComponentType, useEffect, useRef, useState } from 'react'

import type { Conditions } from '../api/types'
import { nombre } from '../commun/format'
import { Fleche, IconeMeteo } from '../espaces/marine/Icones'
import { beaufort, jourCourt, lireCodeMeteo, pointCardinal } from '../espaces/marine/lecture'
import { heureCourte, titreMarine } from '../espaces/marine/titre'
import { useCreneau } from '../espaces/marine/useCreneau'
import { Panneau } from './Panneau'

/** Les classes que la mise en page attend : chaque thème fournit une feuille de style qui les définit. */
export type StylesConditions = Readonly<Record<string, string | undefined>>

/** Ce que le graphique de marée d'un thème reçoit : tout est déjà calculé pour l'heure choisie. */
export interface PropsGraphiqueMaree {
  /** Hauteur d'eau à l'heure choisie, en mètres (elle glisse d'un niveau à l'autre). */
  hauteur: number
  houleM: number | null
  periodeS: number | null
  /** Les marées extrêmes proches de l'heure choisie. */
  marees: Conditions['marees']
  /** Les prévisions heure par heure. */
  heures: Conditions['heures']
  /** L'heure choisie, en millisecondes. */
  instant: number
  /** Distance du sable à l'eau, quand on regarde l'instant présent. */
  distanceM: number | null
  danger: 'vert' | 'rouge' | 'noir'
}

const TENDANCE = { montante: 'la mer monte', descendante: 'la mer descend', etale: 'étale' } as const
const NOM_DANGER = { vert: 'VERT', rouge: 'ROUGE', noir: 'NOIR' } as const

const arrondi = (v: number | null | undefined, chiffres = 0) =>
  v === null || v === undefined ? '—' : nombre(Number(v.toFixed(chiffres)))

interface Props {
  conditions: Conditions
  spotId: number | null
  styles: StylesConditions
  /** Le graphique de marée, dessiné par le thème. */
  Graphique: ComponentType<PropsGraphiqueMaree>
}

/**
 * Les conditions de la mer pour un thème qui les dessine par sa feuille de style :
 * la réponse d'abord, le graphique de marée du thème, un curseur pour voyager dans
 * le temps, les instruments, puis la frise des 48 heures dans un panneau.
 * Tout ce qui est affiché suit l'heure choisie.
 */
export function ConditionsThemee({ conditions, spotId, styles, Graphique }: Props) {
  const creneau = useCreneau(spotId)
  const m = conditions.maintenant
  const [rang, setRang] = useState(0)
  const heures = conditions.heures
  const choisie = heures[rang]
  const surMaintenant = rang === 0 || !choisie

  const hauteurCible = choisie?.hauteur_eau_m ?? m.hauteur_eau_m ?? 3.5
  const [hauteur, setHauteur] = useState(hauteurCible)
  const depart = useRef(hauteurCible)
  useEffect(() => {
    // L'eau glisse vers son nouveau niveau au lieu d'y sauter.
    const lecture = animate(depart.current, hauteurCible, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        depart.current = v
        setHauteur(v)
      },
    })
    return () => lecture.stop()
  }, [hauteurCible])

  const { titre, detail } = titreMarine(conditions, creneau)
  const instantMs = new Date(choisie?.instant ?? m.instant).getTime()
  const maintenantMs = new Date(m.instant).getTime()
  const marees = conditions.marees.filter((x) => {
    const t = new Date(x.instant).getTime()
    return t > instantMs - 6 * 3_600_000 && t < instantMs + 18 * 3_600_000
  })
  const prochaine = conditions.marees.find((x) => new Date(x.instant).getTime() > maintenantMs)
  const soleil = conditions.soleil[0]

  // Les instruments lisent l'heure choisie ; ce que les heures ne donnent pas vient de l'instant présent.
  const eau = surMaintenant ? m.eau_c : (choisie.eau_c ?? m.eau_c)
  const air = surMaintenant ? m.air_c : choisie.air_c
  const vent = surMaintenant ? m.vent_kmh : choisie.vent_kmh
  const rafales = surMaintenant ? m.rafales_kmh : choisie.rafales_kmh
  const ventDir = surMaintenant ? m.vent_direction_deg : choisie.vent_direction_deg
  const vagues = surMaintenant ? m.vagues_m : choisie.vagues_m
  const courant = surMaintenant ? m.courant_kmh : choisie.courant_kmh
  const courantDir = surMaintenant ? m.courant_direction_deg : choisie.courant_direction_deg
  const codeMeteo = surMaintenant ? m.code_meteo : choisie.code_meteo
  const nuages = surMaintenant ? m.nuages_pct : choisie.nuages_pct
  const dangerChoisi = surMaintenant ? conditions.danger.niveau : choisie.danger

  const venteMax = Math.max(40, ...heures.map((h) => h.vent_kmh ?? 0))

  return (
    <div className={styles.page}>
      <header className={styles.reponse}>
        <p className={styles.lieu}>
          {conditions.spot.nom} · prévision de {heureCourte(choisie?.instant ?? m.instant)}
          {conditions.perimees && ' · données en cache'}
        </p>
        <h2 className={styles.titre}>{titre}</h2>
        <p className={styles.detail}>
          <span className={styles.danger} data-niveau={conditions.danger.niveau} role="status">
            {NOM_DANGER[conditions.danger.niveau]}
          </span>
          {detail}
        </p>
      </header>

      <figure className={styles.planche}>
        <Graphique
          hauteur={hauteur}
          houleM={m.vagues_m ?? null}
          periodeS={m.periode_s ?? null}
          marees={marees}
          heures={heures}
          instant={instantMs}
          distanceM={surMaintenant ? (m.distance_eau_m ?? null) : null}
          danger={dangerChoisi}
        />
        <figcaption className={styles.legende}>
          <strong>{arrondi(hauteur, 1)} m</strong>
          {surMaintenant && m.tendance && <span>{TENDANCE[m.tendance]}</span>}
          {surMaintenant && prochaine && (
            <span>
              {prochaine.type === 'PM' ? 'pleine mer' : 'basse mer'} à {heureCourte(prochaine.instant)}
              {prochaine.coefficient ? ` · coefficient ${prochaine.coefficient}` : ''}
            </span>
          )}
          {!surMaintenant && choisie && (
            <span>
              {jourCourt(choisie.instant)} à {heureCourte(choisie.instant)}
            </span>
          )}
        </figcaption>
        <div className={styles.curseur}>
          <label htmlFor="heure-marine">Voyage dans le temps</label>
          <input
            id="heure-marine"
            type="range"
            min={0}
            max={Math.max(0, heures.length - 1)}
            step={1}
            value={rang}
            onChange={(e) => setRang(Number(e.target.value))}
            aria-valuetext={
              choisie ? `${jourCourt(choisie.instant)} ${heureCourte(choisie.instant)}` : 'maintenant'
            }
          />
          <output>{surMaintenant ? 'maintenant' : choisie ? heureCourte(choisie.instant) : ''}</output>
          {!surMaintenant && (
            <button type="button" onClick={() => setRang(0)}>
              Revenir à maintenant
            </button>
          )}
        </div>
      </figure>

      <section className={styles.instruments} aria-label="Instruments">
        <article className={styles.instrument}>
          <h3>Eau</h3>
          <p className={styles.valeur}>
            {arrondi(eau, 1)}
            <span>°C</span>
          </p>
          <p className={styles.note}>
            air {arrondi(air)}° ·{' '}
            {eau !== null && eau !== undefined && eau < 15
              ? 'sous 15° : entre lentement'
              : 'au-dessus du seuil de choc'}
          </p>
        </article>

        <article className={styles.instrument}>
          <h3>Vent</h3>
          <div className={styles.avecIcone}>
            <span className={styles.fleche}>
              <Fleche degres={ventDir} taille={36} />
            </span>
            <p className={styles.valeur}>
              {arrondi(vent)}
              <span>km/h</span>
            </p>
          </div>
          <p className={styles.note}>
            {ventDir !== null && ventDir !== undefined ? `de ${pointCardinal(ventDir)} · ` : ''}
            force {vent !== null && vent !== undefined ? beaufort(vent) : '—'} · rafales {arrondi(rafales)}{' '}
            km/h
          </p>
        </article>

        <article className={styles.instrument}>
          <h3>Vagues</h3>
          <p className={styles.valeur}>
            {arrondi(vagues, 1)}
            <span>m</span>
          </p>
          <p className={styles.note}>
            période {arrondi(m.periode_s)} s · houle {arrondi(m.houle_m, 1)} m
          </p>
        </article>

        <article className={styles.instrument}>
          <h3>Courant</h3>
          <p className={styles.valeur}>
            {arrondi(courant, 1)}
            <span>km/h</span>
          </p>
          <p className={styles.note}>
            <Fleche degres={courantDir} provenance={false} taille={14} /> vers{' '}
            {courantDir !== null && courantDir !== undefined ? pointCardinal(courantDir) : '—'}
          </p>
        </article>

        <article className={styles.instrument}>
          <h3>Ciel</h3>
          <div className={styles.avecIcone}>
            <IconeMeteo code={codeMeteo} taille={32} />
            <p className={styles.note}>
              {lireCodeMeteo(codeMeteo).libelle} · {arrondi(nuages)} % de nuages
            </p>
          </div>
          {soleil && (
            <p className={styles.note}>
              soleil {heureCourte(soleil.lever)} → {heureCourte(soleil.coucher)}
            </p>
          )}
        </article>
      </section>

      <Panneau id="marine-48-heures" titre="48 heures" resume="le vent et le danger, heure par heure">
        <section className={styles.frise} aria-label="Vent et danger heure par heure">
          <ol>
            {heures.map((h, i) => (
              <li key={h.instant} data-choisie={i === rang || undefined}>
                <button
                  type="button"
                  onClick={() => setRang(i)}
                  title={`${jourCourt(h.instant)} ${heureCourte(h.instant)} · vent ${arrondi(h.vent_kmh)} km/h · ${NOM_DANGER[h.danger]}`}
                  aria-label={`${jourCourt(h.instant)} ${heureCourte(h.instant)}, danger ${NOM_DANGER[h.danger].toLowerCase()}`}
                >
                  <i
                    data-niveau={h.danger}
                    style={{
                      ['--h' as string]: `${Math.max(4, Math.min(1, (h.vent_kmh ?? 0) / venteMax) * 100)}%`,
                    }}
                  />
                  <span aria-hidden="true">
                    {i % 3 === 0 ? `${heureCourte(h.instant).split('h')[0]}h` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <p className={styles.note}>
            Hauteur des barres : le vent. Couleur : le danger heure par heure (
            {NOM_DANGER[dangerChoisi].toLowerCase()} à l’heure choisie).
          </p>
        </section>
      </Panneau>

      <p className={styles.source}>
        {conditions.source}. Horaires de marée arrondis : estimation, pas un document de navigation.
      </p>
    </div>
  )
}
