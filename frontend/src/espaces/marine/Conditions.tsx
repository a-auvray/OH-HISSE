import { motion } from 'motion/react'

import type { Conditions as DonneesConditions } from '../../api/types'
import { nombre } from '../../commun/format'
import { useLargeur } from '../../commun/useLargeur'
import styles from './Conditions.module.css'
import { BadgeDanger, Pastille } from './BadgeDanger'
import { CourbeMaree } from './CourbeMaree'
import { Fleche, IconeMeteo } from './Icones'
import { beaufort, duree, heure, jourCourt, lireCodeMeteo, pointCardinal } from './lecture'

const TENDANCE = { montante: 'la mer monte', descendante: 'la mer descend', etale: 'étale' } as const

const arrondi = (v: number | null | undefined, chiffres = 0) =>
  v === null || v === undefined ? '—' : nombre(Number(v.toFixed(chiffres)))

const apparaitre = (rang: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: 0.1 + rang * 0.07, ease: [0.16, 1, 0.3, 1] as const },
})

/** Le tableau de bord de la mer (note 04) : ce qu'il faut savoir avant d'aller à l'eau. */
export function Conditions({ conditions }: { conditions: DonneesConditions }) {
  const [cadre, largeur] = useLargeur<HTMLDivElement>()
  const m = conditions.maintenant
  const soleil = conditions.soleil[0]
  const prochaine = conditions.marees.find((x) => new Date(x.instant) > new Date(m.instant))
  const pointsMaree = conditions.heures
    .slice(0, 25)
    .filter((h) => h.hauteur_eau_m !== null && h.hauteur_eau_m !== undefined)
    .map((h) => ({ instant: h.instant, hauteur: h.hauteur_eau_m as number }))

  return (
    <div className={styles.conditions}>
      <motion.div {...apparaitre(0)}>
        <BadgeDanger danger={conditions.danger} grand />
      </motion.div>
      <section className={styles.heros}>
        <motion.div className={styles.eau} {...apparaitre(0)}>
          <p className={styles.etiquette}>Eau</p>
          <p className={styles.geant}>
            {arrondi(m.eau_c, 1)}
            <span>°C</span>
          </p>
          <p className={styles.sous}>
            Air {arrondi(m.air_c)}° · ressenti {arrondi(m.ressenti_c)}°
          </p>
        </motion.div>

        <motion.div className={styles.maree} ref={cadre} {...apparaitre(1)}>
          <div className={styles.enteteMaree}>
            <p className={styles.etiquette}>Marée</p>
            <p className={styles.etatMaree}>
              {m.hauteur_eau_m !== null && m.hauteur_eau_m !== undefined && (
                <strong>{nombre(m.hauteur_eau_m)} m</strong>
              )}
              {m.tendance && <span data-tendance={m.tendance}>{TENDANCE[m.tendance]}</span>}
              {prochaine && (
                <span className={styles.prochaine}>
                  {prochaine.type === 'PM' ? 'Pleine mer' : 'Basse mer'} à {heure(prochaine.instant)}
                  {prochaine.coefficient ? ` · coef. ${prochaine.coefficient}` : ''}
                </span>
              )}
              {m.distance_eau_m !== null && m.distance_eau_m !== undefined && (
                <span className={styles.prochaine}>
                  {m.distance_eau_m === 0
                    ? 'L’eau au pied de la digue'
                    : `≈ ${nombre(m.distance_eau_m)} m de sable jusqu’à l’eau`}
                </span>
              )}
            </p>
          </div>
          <CourbeMaree
            points={pointsMaree}
            reperes={conditions.marees}
            maintenant={m.instant}
            largeur={largeur}
          />
        </motion.div>

        <motion.div className={styles.vent} {...apparaitre(2)}>
          <p className={styles.etiquette}>Vent</p>
          <div className={styles.rose}>
            <span className={styles.nord}>N</span>
            <Fleche degres={m.vent_direction_deg} taille={64} />
          </div>
          <p className={styles.valeurVent}>
            {arrondi(m.vent_kmh)} <span>km/h</span>
          </p>
          <p className={styles.sous}>
            {m.vent_direction_deg !== null && m.vent_direction_deg !== undefined
              ? `de ${pointCardinal(m.vent_direction_deg)}`
              : ''}{' '}
            · rafales {arrondi(m.rafales_kmh)} · force{' '}
            {m.vent_kmh !== null && m.vent_kmh !== undefined ? beaufort(m.vent_kmh) : '—'}
          </p>
        </motion.div>
      </section>

      <section className={styles.cartes}>
        <motion.article className={styles.carte} {...apparaitre(3)}>
          <p className={styles.etiquette}>Vagues</p>
          <p className={styles.moyen}>
            {arrondi(m.vagues_m, 1)} <span>m</span>
          </p>
          <p className={styles.sous}>
            <Fleche degres={m.vagues_direction_deg} taille={14} /> période {arrondi(m.periode_s)} s · houle{' '}
            {arrondi(m.houle_m, 1)} m
          </p>
        </motion.article>
        <motion.article className={styles.carte} {...apparaitre(4)}>
          <p className={styles.etiquette}>Courant</p>
          <p className={styles.moyen}>
            {arrondi(m.courant_kmh, 1)} <span>km/h</span>
          </p>
          <p className={styles.sous}>
            <Fleche degres={m.courant_direction_deg} provenance={false} taille={14} /> vers{' '}
            {m.courant_direction_deg !== null && m.courant_direction_deg !== undefined
              ? pointCardinal(m.courant_direction_deg)
              : '—'}
          </p>
        </motion.article>
        <motion.article className={styles.carte} {...apparaitre(5)}>
          <p className={styles.etiquette}>Ciel</p>
          <div className={styles.ciel}>
            <IconeMeteo code={m.code_meteo} taille={40} />
            <div>
              <p>{lireCodeMeteo(m.code_meteo).libelle}</p>
              <p className={styles.sous}>{arrondi(m.nuages_pct)} % de nuages</p>
            </div>
          </div>
        </motion.article>
        {soleil && (
          <motion.article className={styles.carte} {...apparaitre(6)}>
            <p className={styles.etiquette}>Soleil</p>
            <p className={styles.moyen}>
              {heure(soleil.lever)} <span>→</span> {heure(soleil.coucher)}
            </p>
            <p className={styles.sous}>{duree(soleil.lever, soleil.coucher)} de jour</p>
          </motion.article>
        )}
      </section>

      <motion.section
        className={styles.previsions}
        {...apparaitre(7)}
        aria-label="Prévisions heure par heure"
      >
        <p className={styles.etiquette}>48 heures</p>
        <ol className={styles.heures}>
          {conditions.heures.map((h, i) => {
            const nouveauJour = i === 0 || new Date(h.instant).getHours() === 0
            return (
              <li key={h.instant} data-nouveau-jour={nouveauJour || undefined}>
                <span className={styles.jour}>{nouveauJour ? jourCourt(h.instant) : ''}</span>
                <span className={styles.heure}>{heure(h.instant).slice(0, 2)} h</span>
                <Pastille niveau={h.danger} taille={8} />
                <IconeMeteo code={h.code_meteo} taille={24} />
                <span className={styles.air}>{arrondi(h.air_c)}°</span>
                <span className={styles.ventHeure}>
                  <Fleche degres={h.vent_direction_deg} taille={13} />
                  {arrondi(h.vent_kmh)}
                </span>
                <span className={styles.vagueHeure}>{arrondi(h.vagues_m, 1)} m</span>
                <span
                  className={styles.niveau}
                  style={
                    {
                      '--niveau': `${Math.max(0, Math.min(1, (h.hauteur_eau_m ?? 0) / 8)) * 100}%`,
                    } as React.CSSProperties
                  }
                  title={`Hauteur d’eau ${arrondi(h.hauteur_eau_m, 1)} m`}
                />
              </li>
            )
          })}
        </ol>
      </motion.section>

      <p className={styles.source}>
        {conditions.perimees && <strong>Données en cache : Open-Meteo ne répond pas. </strong>}
        {conditions.source}. Horaires de marée arrondis : estimation, pas un document de navigation.
      </p>
    </div>
  )
}
