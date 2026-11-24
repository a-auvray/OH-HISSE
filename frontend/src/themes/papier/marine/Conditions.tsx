import { animate } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import type { Conditions } from '../../../api/types'
import { nombre } from '../../../commun/format'
import { Fleche, IconeMeteo } from '../../../espaces/marine/Icones'
import { beaufort, jourCourt, lireCodeMeteo, pointCardinal } from '../../../espaces/marine/lecture'
import { heureCourte, titreMarine } from '../../../espaces/marine/titre'
import { useCreneau } from '../../../espaces/marine/useCreneau'
import { Panneau } from '../../Panneau'
import styles from './Conditions.module.css'
import { Coupe } from './Coupe'

const TENDANCE = { montante: 'la mer monte', descendante: 'la mer descend', etale: 'étale' } as const
const NOM_DANGER = { vert: 'VERT', rouge: 'ROUGE', noir: 'NOIR' } as const

const arrondi = (v: number | null | undefined, chiffres = 0) =>
  v === null || v === undefined ? '—' : nombre(Number(v.toFixed(chiffres)))

/**
 * Conditions de la mer, version Papier : la réponse d'abord, puis la plage en
 * coupe où l'on voit l'eau monter et reculer. Le curseur remonte ou avance le
 * temps ; tout ce qui est affiché suit l'heure choisie.
 */
export function ConditionsPapier({ conditions, spotId }: { conditions: Conditions; spotId: number | null }) {
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
  const maintenantMs = new Date(m.instant).getTime()
  const marees = conditions.marees.filter((x) => {
    const t = new Date(x.instant).getTime()
    return t > maintenantMs - 3 * 3_600_000 && t < maintenantMs + 15 * 3_600_000
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
          {conditions.spot.nom} · prévision de {heureCourte(m.instant)}
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
        <Coupe
          hauteur={hauteur}
          houleM={m.vagues_m ?? null}
          periodeS={m.periode_s ?? null}
          marees={marees}
          distanceM={surMaintenant ? (m.distance_eau_m ?? null) : null}
          description={`Coupe de la plage : la mer est à ${arrondi(hauteur, 1)} m, ${
            m.tendance ? TENDANCE[m.tendance] : 'sans tendance connue'
          }.`}
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
          <div className={styles.thermo}>
            <div className={styles.mercure} role="img" aria-label={`Eau à ${arrondi(eau, 1)} °C`}>
              <i style={{ ['--p' as string]: Math.min(1, Math.max(0, (eau ?? 0) / 25)) }} />
              <b aria-hidden="true" title="Sous 15 °C : risque de choc thermique" />
            </div>
            <div>
              <p className={styles.valeur}>
                {arrondi(eau, 1)}
                <span>°C</span>
              </p>
              <p className={styles.note}>air {arrondi(air)}°</p>
            </div>
          </div>
          <p className={styles.note}>
            {eau !== null && eau !== undefined && eau < 15
              ? 'sous 15° : entre lentement'
              : 'au-dessus du seuil de choc'}
          </p>
        </article>

        <article className={styles.instrument}>
          <h3>Vent</h3>
          <div className={styles.vent}>
            <span className={styles.fleche}>
              <Fleche degres={ventDir} taille={44} />
            </span>
            <div>
              <p className={styles.valeur}>
                {arrondi(vent)}
                <span>km/h</span>
              </p>
              <p className={styles.note}>
                {ventDir !== null && ventDir !== undefined ? `de ${pointCardinal(ventDir)} · ` : ''}
                force {vent !== null && vent !== undefined ? beaufort(vent) : '—'}
              </p>
            </div>
          </div>
          <p className={styles.note}>rafales {arrondi(rafales)} km/h</p>
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
          <div className={styles.ciel}>
            <IconeMeteo code={codeMeteo} taille={36} />
            <p className={styles.note}>
              {lireCodeMeteo(codeMeteo).libelle}
              <br />
              {arrondi(nuages)} % de nuages
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
