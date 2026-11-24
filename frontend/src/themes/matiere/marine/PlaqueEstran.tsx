import { nombre } from '../../../commun/format'
import { heureCourte } from '../../../espaces/marine/titre'
import type { PropsGraphiqueMaree } from '../../ConditionsThemee'
import styles from './PlaqueEstran.module.css'

/**
 * La marée comme une plaque d'estran : le sable à gauche, l'eau qui arrive par la
 * droite et avance avec la marée, le clapot qui dérive. Au rouge un front sombre
 * entre par le bord ; au noir l'eau est sombre et figée.
 */
export function PlaqueEstran({
  hauteur,
  heures,
  marees,
  instant,
  houleM,
  distanceM,
  danger,
}: PropsGraphiqueMaree) {
  const vs = heures.map((h) => h.hauteur_eau_m).filter((v): v is number => typeof v === 'number')
  const [min, max] = vs.length > 0 ? [Math.min(...vs), Math.max(...vs)] : [0, 8]
  const niveau = Math.min(1, Math.max(0.04, (hauteur - min) / (max - min || 1)))
  const proche = marees.reduce<(typeof marees)[number] | undefined>(
    (m, x) =>
      !m ||
      Math.abs(new Date(x.instant).getTime() - instant) < Math.abs(new Date(m.instant).getTime() - instant)
        ? x
        : m,
    undefined,
  )

  return (
    <div
      className={styles.estran}
      data-danger={danger}
      style={{
        ['--niveau' as string]: niveau,
        ['--houle' as string]: `${Math.min(14, 3 + (houleM ?? 0) * 8)}px`,
      }}
      role="img"
      aria-label={`Estran : l’eau est à ${nombre(Number(hauteur.toFixed(1)))} m`}
    >
      <div className={styles.sable} />
      <div className={styles.eau}>
        <i className={styles.clapot} />
        <i className={styles.front} />
      </div>
      <div className={styles.ecume} />
      <div className={styles.mesure}>
        <span>{nombre(Number(hauteur.toFixed(1)))} m</span>
        {distanceM !== null && <span>≈ {Math.round(distanceM)} m de sable jusqu’à l’eau</span>}
        {proche && (
          <span>
            {proche.type === 'PM' ? 'pleine mer' : 'basse mer'} {heureCourte(proche.instant)}
          </span>
        )}
      </div>
    </div>
  )
}
