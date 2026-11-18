import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { useLocation } from 'react-router'

import { api } from '../../api/client'
import { messageErreur, type Sortie, type Spot } from '../../api/types'
import { couleurRessenti, nombre } from '../../commun/format'
import { exiger, useDonnees } from '../../commun/useDonnees'
import {
  depuisSortie,
  type FormulaireSortie,
  formulaireVierge,
  MODES,
  type TypeSortie,
  versEcriture,
} from './formulaireSortie'
import { Pastille } from './BadgeDanger'
import styles from './Carnet.module.css'
import { Tempete } from './Tempete'

const DATE = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

/** Icônes des trois modes : une vague, un nageur, un masque. */
export function IconeMode({ type, taille = 28 }: { type: TypeSortie; taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === 'baignade' && (
        <>
          <path d="M3 18c3 0 3-2.5 6.5-2.5S13 18 16 18s3-2.5 6.5-2.5S26 18 29 18" />
          <path d="M3 24c3 0 3-2.5 6.5-2.5S13 24 16 24s3-2.5 6.5-2.5S26 24 29 24" />
          <circle cx="16" cy="9" r="3" />
        </>
      )}
      {type === 'nage' && (
        <>
          <circle cx="22" cy="10" r="2.6" />
          <path d="M5 16l7-4 4 3 5-2" />
          <path d="M3 23c3 0 3-2.5 6.5-2.5S13 23 16 23s3-2.5 6.5-2.5S26 23 29 23" />
        </>
      )}
      {type === 'plongee' && (
        <>
          <rect x="6" y="10" width="20" height="10" rx="5" />
          <line x1="16" y1="10" x2="16" y2="20" />
          <path d="M26 15h2v-8" />
          <circle cx="11" cy="26" r="1" fill="currentColor" />
          <circle cx="15" cy="28" r="0.8" fill="currentColor" />
        </>
      )}
    </svg>
  )
}

/** Carnet commun aux trois modes (note 04). */
export function Carnet({ spots }: { spots: Spot[] }) {
  const [sorties, recharger] = useDonnees(
    async () => exiger(await api.GET('/api/marine/sorties'), (e) => messageErreur(e)),
    [],
  )
  // Depuis la carte : une nage tracée arrive avec sa distance et sa plage.
  const depuisCarte = (
    useLocation().state as { nage?: { distance_m: number; spot_id: number | null } } | null
  )?.nage
  const [edition, setEdition] = useState<{ id: number | null; formulaire: FormulaireSortie } | null>(() =>
    depuisCarte
      ? {
          id: null,
          formulaire: {
            ...formulaireVierge(new Date(), depuisCarte.spot_id ?? spots[0]?.id ?? null),
            type: 'nage',
            distance_m: String(depuisCarte.distance_m),
          },
        }
      : null,
  )
  const [tempete, setTempete] = useState(false)

  const ouvrir = () =>
    setEdition({ id: null, formulaire: formulaireVierge(new Date(), spots[0]?.id ?? null) })

  return (
    <div className={styles.carnet}>
      <div className={styles.entete}>
        <p className={styles.intro}>
          Chaque sortie garde la trace des conditions à son heure : eau, air, vent, vagues et marée sont
          relevés automatiquement (jusqu’à deux jours en arrière).
        </p>
        {!edition && (
          <button type="button" className={styles.principal} onClick={ouvrir}>
            + Noter une sortie
          </button>
        )}
      </div>

      <AnimatePresence>
        {edition && (
          <Formulaire
            key={edition.id ?? 'nouvelle'}
            spots={spots}
            identifiant={edition.id}
            initial={edition.formulaire}
            fermer={() => setEdition(null)}
            apresEnregistrement={(enregistree) => {
              setEdition(null)
              recharger()
              // L'easter egg n'apparaît qu'au retour d'une sortie notée en tempête.
              if (enregistree?.tempete) setTempete(true)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{tempete && <Tempete fermer={() => setTempete(false)} />}</AnimatePresence>

      {sorties.etat === 'erreur' && <p className={styles.erreur}>{sorties.message}</p>}
      {sorties.etat === 'pret' && sorties.valeur.length === 0 && !edition && (
        <p className={styles.vide}>Aucune sortie notée pour l’instant.</p>
      )}

      {sorties.etat === 'pret' && sorties.valeur.length > 0 && (
        <ol className={styles.frise}>
          {sorties.valeur.map((s, i) => (
            <motion.li
              key={s.id}
              className={styles.sortie}
              data-type={s.type}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
            >
              <span className={styles.icone}>
                <IconeMode type={s.type} />
                {s.tempete && (
                  <span
                    className={styles.orage}
                    title="Essuyer une tempête !"
                    aria-label="Essuyer une tempête !"
                  >
                    ⚡
                  </span>
                )}
              </span>
              <div className={styles.corps}>
                <p className={styles.quand}>{DATE.format(new Date(s.debut))}</p>
                <h3>
                  {MODES.find((m) => m.id === s.type)?.libelle} · {s.duree_min} min
                  {s.spot && <span> à {s.spot}</span>}
                </h3>
                <ul className={styles.mesures}>
                  {s.eau_c !== null && s.eau_c !== undefined && (
                    <li>Eau {nombre(Math.round(s.eau_c * 10) / 10)} °C</li>
                  )}
                  {s.air_c !== null && s.air_c !== undefined && <li>Air {nombre(Math.round(s.air_c))} °C</li>}
                  {s.vent_kmh !== null && s.vent_kmh !== undefined && (
                    <li>Vent {nombre(Math.round(s.vent_kmh))} km/h</li>
                  )}
                  {s.vagues_m !== null && s.vagues_m !== undefined && <li>Vagues {nombre(s.vagues_m)} m</li>}
                  {s.hauteur_eau_m !== null && s.hauteur_eau_m !== undefined && (
                    <li>Marée {nombre(s.hauteur_eau_m)} m</li>
                  )}
                  {s.distance_m && <li>{nombre(s.distance_m)} m nagés</li>}
                  {s.profondeur_max_m && <li>{nombre(s.profondeur_max_m)} m de fond</li>}
                  {s.visibilite_m !== null && s.visibilite_m !== undefined && (
                    <li>Visibilité {nombre(s.visibilite_m)} m</li>
                  )}
                </ul>
                {s.conditions_relevees && <p className={styles.releve}>Conditions relevées par Open-Meteo</p>}
                {s.note && <p className={styles.note}>« {s.note} »</p>}
              </div>
              <div className={styles.cote}>
                {s.danger && <Pastille niveau={s.danger} taille={12} />}
                {s.ressenti && (
                  <span className={styles.ressenti} data-couleur={couleurRessenti(s.ressenti)}>
                    {s.ressenti}/10
                  </span>
                )}
                <button
                  type="button"
                  className={styles.discret}
                  onClick={() => setEdition({ id: s.id, formulaire: depuisSortie(s) })}
                >
                  Modifier
                </button>
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </div>
  )
}

interface PropsFormulaire {
  spots: Spot[]
  identifiant: number | null
  initial: FormulaireSortie
  fermer: () => void
  apresEnregistrement: (sortie?: Sortie) => void
}

function Formulaire({ spots, identifiant, initial, fermer, apresEnregistrement }: PropsFormulaire) {
  const [f, setF] = useState(initial)
  const [conditionsManuelles, setConditionsManuelles] = useState(
    Boolean(initial.eau_c || initial.air_c || initial.vent_kmh),
  )
  const [problemes, setProblemes] = useState<string[]>([])
  const [enCours, setEnCours] = useState(false)
  const [confirmer, setConfirmer] = useState(false)
  const changer = (modif: Partial<FormulaireSortie>) => setF((x) => ({ ...x, ...modif }))

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault()
    const corps = versEcriture(conditionsManuelles ? f : { ...f, eau_c: '', air_c: '', vent_kmh: '' })
    if (Array.isArray(corps)) {
      setProblemes(corps)
      return
    }
    setEnCours(true)
    const { data, error } = identifiant
      ? await api.PUT('/api/marine/sorties/{sortie_id}', {
          params: { path: { sortie_id: identifiant } },
          body: corps,
        })
      : await api.POST('/api/marine/sorties', { body: corps })
    setEnCours(false)
    if (error) setProblemes([messageErreur(error, 'Enregistrement impossible.')])
    else apresEnregistrement(data)
  }

  async function supprimer() {
    if (!identifiant) return
    await api.DELETE('/api/marine/sorties/{sortie_id}', { params: { path: { sortie_id: identifiant } } })
    apresEnregistrement()
  }

  return (
    <motion.form
      className={styles.formulaire}
      onSubmit={enregistrer}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      noValidate
    >
      <div className={styles.modes} role="radiogroup" aria-label="Type de sortie">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={f.type === m.id}
            onClick={() => changer({ type: m.id })}
          >
            <IconeMode type={m.id} taille={34} />
            <span>{m.libelle}</span>
          </button>
        ))}
      </div>

      <div className={styles.grille}>
        <label>
          <span>Plage</span>
          <select
            value={f.spot_id ?? ''}
            onChange={(e) => changer({ spot_id: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Ailleurs</option>
            {spots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={f.date} onChange={(e) => changer({ date: e.target.value })} />
        </label>
        <label>
          <span>Heure d’entrée dans l’eau</span>
          <input type="time" value={f.heure} onChange={(e) => changer({ heure: e.target.value })} />
        </label>
        <label>
          <span>Durée (min)</span>
          <input
            inputMode="numeric"
            value={f.duree_min}
            onChange={(e) => changer({ duree_min: e.target.value })}
          />
        </label>

        {f.type === 'nage' && (
          <label>
            <span>Distance estimée (m)</span>
            <input
              inputMode="numeric"
              value={f.distance_m}
              onChange={(e) => changer({ distance_m: e.target.value })}
            />
          </label>
        )}
        {f.type === 'plongee' && (
          <>
            <label>
              <span>Profondeur max (m)</span>
              <input
                inputMode="decimal"
                value={f.profondeur_max_m}
                onChange={(e) => changer({ profondeur_max_m: e.target.value })}
              />
            </label>
            <label>
              <span>Visibilité (m)</span>
              <input
                inputMode="decimal"
                value={f.visibilite_m}
                onChange={(e) => changer({ visibilite_m: e.target.value })}
              />
            </label>
            <label className={styles.large}>
              <span>Matériel</span>
              <input
                placeholder="Combinaison 7 mm, palmes, masque…"
                value={f.materiel}
                onChange={(e) => changer({ materiel: e.target.value })}
              />
            </label>
          </>
        )}
      </div>

      <fieldset className={styles.ressentis}>
        <legend>Ressenti</legend>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            data-couleur={couleurRessenti(n)}
            aria-pressed={f.ressenti === n}
            onClick={() => changer({ ressenti: f.ressenti === n ? null : n })}
          >
            {n}
          </button>
        ))}
      </fieldset>

      <details
        className={styles.conditions}
        open={conditionsManuelles}
        onToggle={(e) => setConditionsManuelles(e.currentTarget.open)}
      >
        <summary>Saisir moi-même les conditions</summary>
        <div className={styles.grille}>
          <label>
            <span>Eau (°C)</span>
            <input inputMode="decimal" value={f.eau_c} onChange={(e) => changer({ eau_c: e.target.value })} />
          </label>
          <label>
            <span>Air (°C)</span>
            <input inputMode="decimal" value={f.air_c} onChange={(e) => changer({ air_c: e.target.value })} />
          </label>
          <label>
            <span>Vent (km/h)</span>
            <input
              inputMode="decimal"
              value={f.vent_kmh}
              onChange={(e) => changer({ vent_kmh: e.target.value })}
            />
          </label>
        </div>
      </details>

      <label className={styles.large}>
        <span>Note</span>
        <textarea rows={2} value={f.note} onChange={(e) => changer({ note: e.target.value })} />
      </label>

      {problemes.length > 0 && (
        <p className={styles.erreur} role="alert">
          {problemes.join('\n')}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.principal} disabled={enCours}>
          {enCours ? 'Enregistrement…' : 'Enregistrer la sortie'}
        </button>
        <button type="button" className={styles.discret} onClick={fermer}>
          Annuler
        </button>
        {identifiant &&
          (confirmer ? (
            <button type="button" className={styles.danger} onClick={() => void supprimer()}>
              Confirmer la suppression
            </button>
          ) : (
            <button type="button" className={styles.discret} onClick={() => setConfirmer(true)}>
              Supprimer
            </button>
          ))}
      </div>
    </motion.form>
  )
}
