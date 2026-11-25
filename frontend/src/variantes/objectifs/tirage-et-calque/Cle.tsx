import styles from './Cle.module.css'
import { type ClefMotif, urlMotif } from './clefsMotifs'
import { LIBELLE_TYPE } from './modele'

const LIBELLES: Readonly<Record<ClefMotif, string>> = {
  ...LIBELLE_TYPE,
  'sans-bloc': 'Hors bloc rattaché',
  points: 'Bloc à venir, sur le calque',
}

/**
 * La légende des trames, comme une légende lithologique : chaque densité de hachure dit un type de
 * bloc. Les échantillons réutilisent les motifs déjà définis dans le dessin (même préfixe).
 */
export function Cle({ prefixe, clefs }: { prefixe: string; clefs: readonly ClefMotif[] }) {
  if (clefs.length === 0) return null
  return (
    <ul className={styles.cle} aria-label="Légende des trames">
      {clefs.map((clef) => (
        <li key={clef}>
          <svg className={styles.echantillon} viewBox="0 0 28 14" aria-hidden="true" focusable="false">
            <rect x={0.5} y={0.5} width={27} height={13} style={{ fill: urlMotif(prefixe, clef) }} />
          </svg>
          {LIBELLES[clef]}
        </li>
      ))}
    </ul>
  )
}
