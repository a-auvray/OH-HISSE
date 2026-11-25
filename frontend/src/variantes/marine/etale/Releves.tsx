import type { Conditions } from '../../../api/types'
import { nombre } from '../../../commun/format'
import { Fleche, IconeMeteo } from '../../../espaces/marine/Icones'
import { beaufort, lireCodeMeteo, pointCardinal } from '../../../espaces/marine/lecture'
import { heureCourte } from '../../../espaces/marine/titre'
import { arrondi, jourDe, type Lecture, phraseVent } from './lecture'
import { ECHELLE_EAU_MAX, estEtale, type Heure, mareeProche, SEUILS_EAU, tendanceA } from './modele'
import styles from './Releves.module.css'

const HAUTEUR_REGLE = 100
const PX_PAR_DEGRE = HAUTEUR_REGLE / ECHELLE_EAU_MAX

/** Une échelle de marée : une règle verticale graduée tous les 2 °C (8 px), pas une icône. L'eau la remplit jusqu'à sa température. */
function RegleEau({ eauC }: { eauC: number | null }) {
  const y = (t: number) => 2 + HAUTEUR_REGLE - t * PX_PAR_DEGRE
  const reperes = [
    { t: SEUILS_EAU.choc, texte: `${SEUILS_EAU.choc} °C choc thermique`, classe: styles.reperChoc },
    { t: SEUILS_EAU.rouge, texte: `${SEUILS_EAU.rouge} °C danger rouge`, classe: styles.reperRouge },
    { t: SEUILS_EAU.noir, texte: `${SEUILS_EAU.noir} °C danger noir`, classe: styles.reperNoir },
  ]
  return (
    <svg className={styles.regle} width="176" height={HAUTEUR_REGLE + 4} aria-hidden="true">
      <rect x="4" y={y(ECHELLE_EAU_MAX)} width="12" height={HAUTEUR_REGLE} className={styles.regleFond} />
      {eauC !== null && (
        <rect
          x="4"
          y={y(Math.min(ECHELLE_EAU_MAX, Math.max(0, eauC)))}
          width="12"
          height={Math.min(ECHELLE_EAU_MAX, Math.max(0, eauC)) * PX_PAR_DEGRE}
          className={styles.regleEau}
        />
      )}
      {Array.from({ length: ECHELLE_EAU_MAX / 2 + 1 }, (_, i) => i * 2).map((t) => (
        <line key={t} x1="4" x2={t % 10 === 0 ? 20 : 15} y1={y(t)} y2={y(t)} className={styles.graduation} />
      ))}
      {reperes.map((r) => (
        <g key={r.t} className={r.classe}>
          <line x1="4" x2="24" y1={y(r.t)} y2={y(r.t)} />
          <text x="28" y={y(r.t) + 3.5}>
            {r.texte}
          </text>
        </g>
      ))}
    </svg>
  )
}

interface Props {
  conditions: Conditions
  lecture: Lecture
  rang: number
}

/** Un nom et une description pour le flot (la mer monte) et le jusant (elle descend). */
const SENS_MAREE = { montante: 'flot', descendante: 'jusant', etale: 'étale' } as const

/**
 * Les relevés : sept mesures sans cadre, qui suivent l'heure choisie. Chacun dit ce qu'il mesure et ce que ça change,
 * en texte (la couleur ne dit rien seule).
 */
export function Releves({ conditions, lecture, rang }: Props) {
  const m = conditions.maintenant
  const instant = new Date(lecture.instant).getTime()
  const sens = tendanceA(conditions.heures as readonly Heure[], rang) ?? m.tendance
  const etale = estEtale(lecture.courantKmh)
  const maree = mareeProche(conditions.marees, instant)
  const prochaine = conditions.marees.find((x) => new Date(x.instant).getTime() > instant)
  const jour = jourDe(lecture.instant)
  const soleil = conditions.soleil.find((s) => s.jour === jour) ?? conditions.soleil[0]
  const vent = lecture.ventKmh
  const phraseDuVent = phraseVent(vent, lecture.ventDeg)

  return (
    <section className={styles.releves} aria-label="Relevés">
      <article className={styles.releve}>
        <h3>Eau</h3>
        <div className={styles.avecIcone}>
          <p className={styles.valeur}>
            {arrondi(lecture.eauC, 1)}
            <span>°C</span>
          </p>
          <RegleEau eauC={lecture.eauC} />
        </div>
        <p className={styles.note}>
          {lecture.eauC !== null && lecture.eauC < SEUILS_EAU.choc
            ? `sous ${SEUILS_EAU.choc} °C : entre lentement`
            : `au-dessus de ${SEUILS_EAU.choc} °C : pas de choc thermique`}
        </p>
      </article>

      <article className={styles.releve}>
        <h3>Air</h3>
        <p className={styles.valeur}>
          {arrondi(lecture.airC)}
          <span>°C</span>
        </p>
        <p className={styles.note}>
          {lecture.ressentiC !== null
            ? `ressenti ${arrondi(lecture.ressentiC)} °C`
            : 'ressenti connu à l’instant présent'}
        </p>
      </article>

      <article className={styles.releve}>
        <h3>Vent</h3>
        <div className={styles.avecIcone}>
          <span className={styles.fleche}>
            <Fleche degres={lecture.ventDeg} taille={30} />
          </span>
          <p className={styles.valeur}>
            {arrondi(vent)}
            <span>km/h</span>
          </p>
        </div>
        <p className={styles.note}>
          {lecture.ventDeg !== null ? `de ${pointCardinal(lecture.ventDeg)} · ` : ''}
          force {vent !== null ? beaufort(vent) : '—'} · rafales {arrondi(lecture.rafalesKmh)} km/h
        </p>
        {phraseDuVent && <p className={styles.etat}>{phraseDuVent}</p>}
      </article>

      <article className={styles.releve}>
        <h3>Vagues</h3>
        <p className={styles.valeur}>
          {arrondi(lecture.vaguesM, 1)}
          <span>m</span>
        </p>
        <p className={styles.note}>
          période {arrondi(lecture.periodeS)} s · houle {arrondi(lecture.houleM, 1)} m
        </p>
      </article>

      <article className={styles.releve}>
        <h3>Courant</h3>
        <p className={styles.valeur}>
          {arrondi(lecture.courantKmh, 1)}
          <span>km/h</span>
        </p>
        <p className={styles.note}>
          <Fleche degres={lecture.courantDeg} provenance={false} taille={14} /> vers{' '}
          {lecture.courantDeg !== null ? pointCardinal(lecture.courantDeg) : '—'}
          {sens && ` · ${SENS_MAREE[sens]}`}
        </p>
        {etale && <p className={styles.etat}>étale · courant {arrondi(lecture.courantKmh, 1)} km/h</p>}
      </article>

      <article className={styles.releve}>
        <h3>Ciel</h3>
        <div className={styles.avecIcone}>
          <IconeMeteo code={lecture.codeMeteo} taille={30} />
          <p className={styles.noteForte}>{lireCodeMeteo(lecture.codeMeteo).libelle}</p>
        </div>
        <p className={styles.note}>
          {arrondi(lecture.nuagesPct)} % de nuages
          {soleil && ` · soleil ${heureCourte(soleil.lever)} → ${heureCourte(soleil.coucher)}`}
        </p>
      </article>

      <article className={styles.releve}>
        <h3>Marée</h3>
        <p className={styles.valeur}>
          {maree?.coefficient ? (
            <>
              <span className={styles.prefixe}>coef.</span> {nombre(maree.coefficient)}
            </>
          ) : (
            '—'
          )}
        </p>
        <p className={styles.note}>
          {prochaine
            ? `${prochaine.type === 'PM' ? 'pleine mer' : 'basse mer'} à ${heureCourte(prochaine.instant)} · ${nombre(prochaine.hauteur_m)} m`
            : 'aucune marée extrême annoncée'}
        </p>
      </article>
    </section>
  )
}
