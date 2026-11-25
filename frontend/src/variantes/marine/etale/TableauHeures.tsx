import { Fleche, IconeMeteo } from '../../../espaces/marine/Icones'
import { jourCourt } from '../../../espaces/marine/lecture'
import { heureCourte } from '../../../espaces/marine/titre'
import styles from './TableauHeures.module.css'
import { NOM_DANGER, arrondi, libelleHeure } from './lecture'
import type { Heure } from './modele'

interface Props {
  heures: readonly Heure[]
  rang: number
  onRang: (rang: number) => void
}

/**
 * Les prévisions heure par heure, en texte : la même information que la frise, pour qui préfère lire
 * ou n'a pas le dessin. Chaque heure est un bouton qui place le curseur dessus.
 */
export function TableauHeures({ heures, rang, onRang }: Props) {
  return (
    <details className={styles.tableau}>
      <summary>Heure par heure</summary>
      <div className={styles.defilement} tabIndex={0} role="region" aria-label="Prévisions heure par heure">
        <table>
          <thead>
            <tr>
              <th scope="col">Heure</th>
              <th scope="col">Danger</th>
              <th scope="col">Ciel</th>
              <th scope="col">Air</th>
              <th scope="col">Vent</th>
              <th scope="col">Vagues</th>
              <th scope="col">Eau haute</th>
            </tr>
          </thead>
          <tbody>
            {heures.map((h, i) => (
              <tr key={h.instant} data-choisie={i === rang || undefined}>
                <th scope="row">
                  <button
                    type="button"
                    onClick={() => onRang(i)}
                    aria-pressed={i === rang}
                    aria-label={libelleHeure(h, jourCourt(h.instant))}
                  >
                    {heureCourte(h.instant)}
                    <small>{jourCourt(h.instant)}</small>
                  </button>
                </th>
                <td data-niveau={h.danger}>{NOM_DANGER[h.danger]}</td>
                <td>
                  <IconeMeteo code={h.code_meteo} taille={20} />
                </td>
                <td>{arrondi(h.air_c)} °C</td>
                <td>
                  <Fleche degres={h.vent_direction_deg} taille={12} /> {arrondi(h.vent_kmh)} km/h
                </td>
                <td>{arrondi(h.vagues_m, 1)} m</td>
                <td>{arrondi(h.hauteur_eau_m, 1)} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
