import { animate } from 'motion/react'
import { type CSSProperties, useEffect, useRef, useState } from 'react'

import type { Conditions } from '../../../api/types'
import { nombre } from '../../../commun/format'
import { useLargeur } from '../../../commun/useLargeur'
import { Fleche, IconeMeteo } from '../../../espaces/marine/Icones'
import { beaufort, duree, jourCourt, lireCodeMeteo, pointCardinal } from '../../../espaces/marine/lecture'
import { heureCourte, titreMarine } from '../../../espaces/marine/titre'
import { Panneau } from '../../../themes/Panneau'
import { useNiveauAnimation } from './animation'
import { CoupeReleve } from './CoupeReleve'
import { CourbeReleve } from './CourbeReleve'
import styles from './ConditionsReleve.module.css'
import {
  coordonnees,
  dateLongueParis,
  fractionDeRegle,
  heureDuJour,
  libelleDuTampon,
  ligneDeVerdict,
  mareeProche,
  NOM_DANGER,
  phraseDeDanger,
  phraseDeDistance,
  phraseDeRegle,
  plagesDeDanger,
  profilDePlage,
  prochainesMarees,
} from './modele'
import { useReleve } from './useReleve'

const TENDANCE = { montante: 'la mer monte', descendante: 'la mer descend', etale: 'étale' } as const
const LARGEUR_PAR_DEFAUT = 960

const arrondi = (v: number | null | undefined, chiffres = 0) =>
  v === null || v === undefined ? '—' : nombre(Number(v.toFixed(chiffres)))

/** Une fiche de relevé arrive après l'eau, à 50 ms de la précédente. */
const ordre = (i: number) => ({ ['--i']: i }) as CSSProperties

/**
 * Les conditions de la mer en feuille de levé : le verdict d'abord, puis les relevés, la courbe de marée
 * qu'on fait glisser et la plage en coupe. Toute la page suit l'heure choisie ; l'eau la suit avec un
 * léger retard (un ressort flottant), comme une vraie marée.
 */
export function ConditionsReleve(props: { conditions: Conditions; spotId: number | null }) {
  /* Un autre spot repart de zéro : l'heure choisie et le niveau animé n'ont de sens que pour une plage. */
  return <PageReleve key={props.conditions.spot.id} {...props} />
}

function PageReleve({ conditions, spotId }: { conditions: Conditions; spotId: number | null }) {
  const { creneau, durees } = useReleve(spotId)
  const animation = useNiveauAnimation()
  const [cadre, largeurMesuree] = useLargeur<HTMLDivElement>()
  const largeur = largeurMesuree || LARGEUR_PAR_DEFAUT

  const m = conditions.maintenant
  const heures = conditions.heures
  const [indice, setIndice] = useState(0)
  const choisie = heures[indice]
  const surMaintenant = indice === 0 || !choisie
  const instant = choisie?.instant ?? m.instant
  const instantMs = Date.parse(instant)
  const maintenantMs = Date.parse(m.instant)

  /* Le niveau de l'eau suit l'heure choisie en glissant : il part de là où il est, jamais de zéro. */
  const cible = choisie?.hauteur_eau_m ?? m.hauteur_eau_m ?? null
  const [hauteur, setHauteur] = useState(cible ?? 0)
  const depart = useRef(cible ?? 0)
  useEffect(() => {
    if (cible === null) return
    const onUpdate = (v: number) => {
      depart.current = v
      setHauteur(v)
    }
    const lecture = animate(
      depart.current,
      cible,
      animation === 'immobile'
        ? { duration: 0, onUpdate }
        : animation === 'sobre'
          ? { duration: 0.25, ease: 'easeOut', onUpdate }
          : { type: 'spring', stiffness: 120, damping: 14, onUpdate },
    )
    return () => lecture.stop()
  }, [cible, animation])

  const dangerChoisi = surMaintenant ? conditions.danger.niveau : choisie.danger
  const noir = conditions.danger.niveau === 'noir'
  const { titre, detail } = titreMarine(conditions, creneau)
  const ligne = ligneDeVerdict(conditions, durees)
  const raisons = conditions.danger.raisons
  const plages = plagesDeDanger(heures)
  const profil = profilDePlage(heures)
  const soleil = conditions.soleil[0]

  /* Les relevés lisent l'heure choisie ; ce que les prévisions horaires ne donnent pas vient de l'instant présent. */
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
  const distance = surMaintenant ? m.distance_eau_m : choisie.distance_eau_m

  const coef = mareeProche(conditions.marees, instantMs)
  const { pm, bm } = prochainesMarees(conditions.marees, instantMs)
  const prochaine = conditions.marees.find((x) => Date.parse(x.instant) > maintenantMs)
  const phraseDistance = phraseDeDistance(distance)

  const descriptionCourbe = `Hauteur d’eau sur ${heures.length} h. ${conditions.marees
    .map(
      (x) =>
        `${x.type === 'PM' ? 'Pleine mer' : 'Basse mer'} à ${heureCourte(x.instant)}, ${arrondi(x.hauteur_m, 1)} m`,
    )
    .join(' ; ')}.`
  const descriptionCoupe = `Coupe de la plage : l’eau est à ${arrondi(hauteur, 1)} m${
    phraseDistance ? `, ${phraseDistance} jusqu’à l’eau` : ''
  }.`

  const lecture = [
    surMaintenant ? 'maintenant' : `${jourCourt(instant)} à ${heureCourte(instant)}`,
    cible === null ? null : `eau à ${arrondi(cible, 1)} m`,
    surMaintenant && m.tendance ? TENDANCE[m.tendance] : null,
    phraseDistance
      ? phraseDistance.startsWith('l’eau')
        ? phraseDistance
        : `${phraseDistance} jusqu’à l’eau`
      : null,
    `danger ${NOM_DANGER[dangerChoisi].toLowerCase()}`,
  ]
    .filter((p): p is string => p !== null)
    .join(' · ')

  return (
    <div className={styles.page} data-niveau={conditions.danger.niveau}>
      <div className={styles.haut}>
        <header className={styles.verdict}>
          <div className={styles.feuille}>
            <p className={styles.mention}>
              Feuille de levé · {dateLongueParis(m.instant)} · {heureCourte(m.instant)}
              {conditions.perimees && ' · données en cache'}
            </p>
            <p className={styles.spot}>{conditions.spot.nom}</p>
            <p className={styles.position}>
              {coordonnees(conditions.spot.latitude, conditions.spot.longitude)}
            </p>
          </div>
          <h2 className={styles.titre}>{titre}</h2>
          <p className={styles.ligne}>{ligne.join(' · ')}</p>
          <p className={styles.tampon} data-niveau={dangerChoisi}>
            {libelleDuTampon(dangerChoisi, heures, instant)}
          </p>
          {raisons.length > 0 ? (
            <ul className={styles.raisons} aria-label="Pourquoi">
              {raisons.map((r) => (
                <li key={r.texte} data-niveau={r.niveau}>
                  <i aria-hidden="true" />
                  {r.texte}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.detail}>{detail}</p>
          )}
          {conditions.perimees && (
            <p className={styles.alerte} role="status">
              Données en cache : Open-Meteo ne répond pas.
            </p>
          )}
        </header>

        <section className={styles.releves} aria-label="Relevés">
          <article className={`${styles.fiche} ${styles.large}`} style={ordre(0)}>
            <h3>Eau</h3>
            <p className={styles.valeur}>
              {arrondi(eau, 1)}
              <span>°C</span>
            </p>
            <div className={styles.regle} role="img" aria-label={phraseDeRegle(eau)}>
              <i style={{ ['--p' as string]: fractionDeRegle(eau) }} />
              <b style={{ ['--p' as string]: fractionDeRegle(15) }} />
              <ol aria-hidden="true">
                {[0, 5, 10, 15, 20, 25].map((g) => (
                  <li key={g} style={{ ['--p' as string]: fractionDeRegle(g) }}>
                    {g}
                  </li>
                ))}
              </ol>
            </div>
            <p className={styles.note}>
              {eau === null || eau === undefined
                ? 'Température de l’eau inconnue : entre lentement.'
                : eau < 15
                  ? 'Sous 15 °C : risque de choc thermique, entre lentement.'
                  : 'Au-dessus du seuil de choc thermique (15 °C).'}
              {surMaintenant && typeof durees?.conseille_min === 'number' && (
                <>
                  {' '}
                  {arrondi(durees.conseille_min)} min conseillées
                  {typeof durees.maximum_min === 'number' && ` · ${arrondi(durees.maximum_min)} max`}.
                </>
              )}
            </p>
          </article>

          <article className={styles.fiche} style={ordre(1)}>
            <h3>Coefficient</h3>
            <p className={styles.valeur}>{coef?.coefficient ? arrondi(coef.coefficient) : '—'}</p>
            <p className={styles.note}>{coef ? `marée de ${heureCourte(coef.instant)}` : 'marée inconnue'}</p>
          </article>

          <article className={styles.fiche} style={ordre(2)}>
            <h3>Pleine mer</h3>
            <p className={styles.valeur}>{pm ? heureCourte(pm.instant) : '—'}</p>
            <p className={styles.note}>{pm ? `${arrondi(pm.hauteur_m, 1)} m` : 'inconnue'}</p>
          </article>

          <article className={styles.fiche} style={ordre(3)}>
            <h3>Basse mer</h3>
            <p className={styles.valeur}>{bm ? heureCourte(bm.instant) : '—'}</p>
            <p className={styles.note}>{bm ? `${arrondi(bm.hauteur_m, 1)} m` : 'inconnue'}</p>
          </article>

          <article className={styles.fiche} style={ordre(4)}>
            <h3>Vent</h3>
            <div className={styles.avecIcone}>
              <span className={styles.fleche}>
                <Fleche degres={ventDir} taille={30} />
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

          <article className={styles.fiche} style={ordre(5)}>
            <h3>Vagues</h3>
            <p className={styles.valeur}>
              {arrondi(vagues, 1)}
              <span>m</span>
            </p>
            <p className={styles.note}>
              période {arrondi(m.periode_s)} s · houle {arrondi(m.houle_m, 1)} m
            </p>
          </article>

          <article className={styles.fiche} style={ordre(6)}>
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

          <article className={styles.fiche} style={ordre(7)}>
            <h3>Air</h3>
            <p className={styles.valeur}>
              {arrondi(air)}
              <span>°C</span>
            </p>
            <p className={styles.note}>
              {surMaintenant ? `ressenti ${arrondi(m.ressenti_c)} °C` : 'prévision'}
            </p>
          </article>

          <article className={styles.fiche} style={ordre(8)}>
            <h3>Ciel</h3>
            <div className={styles.avecIcone}>
              <IconeMeteo code={codeMeteo} taille={30} />
              <p className={styles.note}>{lireCodeMeteo(codeMeteo).libelle}</p>
            </div>
            <p className={styles.note}>{arrondi(nuages)} % de nuages</p>
          </article>

          {soleil && (
            <article className={styles.fiche} style={ordre(9)}>
              <h3>Soleil</h3>
              <p className={styles.valeur}>
                {heureCourte(soleil.lever)}
                <span>→</span>
                {heureCourte(soleil.coucher)}
              </p>
              <p className={styles.note}>{duree(soleil.lever, soleil.coucher)} de jour</p>
            </article>
          )}
        </section>
      </div>

      <figure className={styles.planche}>
        <figcaption className={styles.entete}>
          <span className={styles.hauteur}>{cible === null ? '—' : `${arrondi(hauteur, 1)} m`}</span>
          <p className={styles.lecture} role="status" aria-atomic="true">
            {lecture}
          </p>
        </figcaption>
        <div ref={cadre} className={styles.cadre}>
          {heures.length > 1 && (
            <CourbeReleve
              heures={heures}
              marees={conditions.marees}
              rang={indice}
              onRang={setIndice}
              creneau={noir ? null : creneau}
              maintenantMs={maintenantMs}
              largeur={largeur}
              description={descriptionCourbe}
            />
          )}
        </div>
        <ul className={styles.legendes}>
          {!noir && creneau && (
            <li>
              <span className={styles.echantillonCreneau} aria-hidden="true" />
              Meilleur créneau : {heureCourte(creneau.debut)} à {heureCourte(creneau.fin)}
            </li>
          )}
          <li>
            <span className={styles.echantillonEau} aria-hidden="true" />
            Teintes de l’eau : 0 à 2 m, 2 à 5 m, au-delà
          </li>
          <li>Danger : {phraseDeDanger(plages)}</li>
          {prochaine && (
            <li>
              Prochaine {prochaine.type === 'PM' ? 'pleine mer' : 'basse mer'} à{' '}
              {heureCourte(prochaine.instant)}
              {prochaine.coefficient ? ` · coefficient ${prochaine.coefficient}` : ''}
            </li>
          )}
        </ul>
        <div className={styles.curseur}>
          <label htmlFor="heure-releve">Voyage dans le temps</label>
          <input
            id="heure-releve"
            type="range"
            min={0}
            max={Math.max(0, heures.length - 1)}
            step={1}
            value={indice}
            onChange={(e) => setIndice(Number(e.target.value))}
            aria-valuetext={
              choisie ? `${jourCourt(choisie.instant)} ${heureCourte(choisie.instant)}` : 'maintenant'
            }
          />
          <output>{surMaintenant ? 'maintenant' : heureCourte(instant)}</output>
          {!surMaintenant && (
            <button type="button" onClick={() => setIndice(0)}>
              Revenir à maintenant
            </button>
          )}
        </div>
      </figure>

      <figure className={styles.planche}>
        {profil.length > 0 && cible !== null ? (
          <CoupeReleve
            profil={profil}
            hauteur={hauteur}
            vaguesM={vagues}
            periodeS={m.periode_s}
            distanceM={distance}
            noir={noir}
            largeur={largeur}
            description={descriptionCoupe}
          />
        ) : (
          <p className={styles.vide}>
            Le profil de la plage n’est pas connu : les prévisions ne donnent pas la distance jusqu’à l’eau.
            {cible !== null && ` L’eau est à ${arrondi(hauteur, 1)} m.`}
          </p>
        )}
        <figcaption className={styles.note}>
          Coupe de la plage, de la digue au large, à l’échelle. Le sable est le profil relevé dans les
          prévisions (une heure, un point) ; les lignes verticales marquent la hauteur d’eau tous les
          demi-mètres, et glissent avec la marée.
        </figcaption>
      </figure>

      <Panneau id="marine-48-heures" titre="48 heures" resume="le vent et le danger, heure par heure">
        <section className={styles.frise} aria-label="Prévisions heure par heure">
          <ol>
            {heures.map((h, i) => {
              const nouveauJour = i === 0 || heureDuJour(h.instant) === 0
              return (
                <li key={h.instant} data-choisie={i === indice || undefined}>
                  <button
                    type="button"
                    onClick={() => setIndice(i)}
                    aria-current={i === indice || undefined}
                    title={`${jourCourt(h.instant)} ${heureCourte(h.instant)} · vent ${arrondi(h.vent_kmh)} km/h · ${NOM_DANGER[h.danger]}`}
                    aria-label={`${jourCourt(h.instant)} ${heureCourte(h.instant)}, danger ${NOM_DANGER[h.danger].toLowerCase()}`}
                  >
                    <span className={styles.jour}>{nouveauJour ? jourCourt(h.instant) : ''}</span>
                    <span className={styles.heure}>{heureCourte(h.instant)}</span>
                    <i className={styles.niveau} data-niveau={h.danger} aria-hidden="true" />
                    <IconeMeteo code={h.code_meteo} taille={22} />
                    <span>{arrondi(h.air_c)}°</span>
                    <span className={styles.ventHeure}>
                      <Fleche degres={h.vent_direction_deg} taille={12} />
                      {arrondi(h.vent_kmh)}
                    </span>
                    <span>{arrondi(h.vagues_m, 1)} m</span>
                  </button>
                </li>
              )
            })}
          </ol>
          <p className={styles.note}>
            Pour chaque heure : le danger, le ciel, l’air en °C, le vent en km/h, les vagues. Un clic voyage
            dans le temps.
          </p>
        </section>
      </Panneau>

      <p className={styles.source}>
        {conditions.source}. Horaires de marée arrondis : estimation, pas un document de navigation.
      </p>
    </div>
  )
}
