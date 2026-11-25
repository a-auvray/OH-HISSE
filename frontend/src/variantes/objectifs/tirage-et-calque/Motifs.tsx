import { idMotif } from './clefsMotifs'
import styles from './Motifs.module.css'

/**
 * Les trames, à poser dans un <defs>. L'encre vient de la feuille de style (donc des jetons du
 * thème et de son ton), jamais d'une couleur écrite ici. Les identifiants portent un préfixe
 * propre à chaque dessin : deux dessins sur la page ne se marchent pas dessus.
 */
export function Motifs({ prefixe }: { prefixe: string }) {
  return (
    <>
      {/* Force : la hachure la plus serrée. */}
      <pattern id={idMotif(prefixe, 'force')} width="4" height="4" patternUnits="userSpaceOnUse">
        <path className={styles.trait} d="M-1,5 L5,-1 M-1,1 L1,-1 M3,5 L5,3" />
      </pattern>
      {/* Volume : une diagonale plus large. */}
      <pattern id={idMotif(prefixe, 'volume')} width="7" height="7" patternUnits="userSpaceOnUse">
        <path className={styles.trait} d="M-1,8 L8,-1 M-1,1 L1,-1 M6,8 L8,6" />
      </pattern>
      {/* Décharge : des traits horizontaux espacés. */}
      <pattern id={idMotif(prefixe, 'deload')} width="9" height="9" patternUnits="userSpaceOnUse">
        <path className={styles.trait} d="M0,4.5 L9,4.5" />
      </pattern>
      {/* Spécifique : une hachure croisée. */}
      <pattern id={idMotif(prefixe, 'specifique')} width="6" height="6" patternUnits="userSpaceOnUse">
        <path className={styles.trait} d="M-1,7 L7,-1 M-1,-1 L7,7" />
      </pattern>
      {/* Assise franchie hors de tout bloc rattaché : une hachure large et claire. */}
      <pattern id={idMotif(prefixe, 'sans-bloc')} width="11" height="11" patternUnits="userSpaceOnUse">
        <path className={styles.traitPale} d="M-1,12 L12,-1 M-1,1 L1,-1 M10,12 L12,10" />
      </pattern>
      {/* Blocs à venir, sur le calque : des points. */}
      <pattern id={idMotif(prefixe, 'points')} width="6" height="6" patternUnits="userSpaceOnUse">
        <circle className={styles.point} cx="3" cy="3" r="0.9" />
      </pattern>
    </>
  )
}
