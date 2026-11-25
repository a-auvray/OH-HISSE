import styles from './Mires.module.css'

/**
 * Une croix de mire : le repère qui doit tomber sur son vis-à-vis. Celle du tirage est à l'encre,
 * celle du calque en trait de construction ; quand le calage tient, elles n'en font qu'une.
 */
export function Mire({
  x,
  y,
  rayon = 10,
  calque = false,
  pleine = false,
}: {
  x: number
  y: number
  rayon?: number
  calque?: boolean
  /** La croix pleine : le plan est devenu du réalisé. */
  pleine?: boolean
}) {
  return (
    <g className={calque ? styles.construction : styles.encre} data-pleine={pleine || undefined}>
      <line x1={x - rayon} x2={x + rayon} y1={y} y2={y} />
      <line x1={x} x2={x} y1={y - rayon} y2={y + rayon} />
      <circle cx={x} cy={y} r={rayon * 0.45} />
    </g>
  )
}

/**
 * Une paire de mires à petite taille (vue d'ensemble, légendes) : alignées quand le calage tient,
 * décalées sinon, vers le bas si le calque a glissé (retard), vers le haut s'il est parti en avance.
 */
export function PaireMires({ decalage, pleine = false }: { decalage: number; pleine?: boolean }) {
  return (
    <svg className={styles.paire} viewBox="0 0 30 40" aria-hidden="true" focusable="false">
      <Mire x={15} y={20 - decalage / 2} rayon={8} pleine={pleine} />
      <Mire x={15} y={20 + decalage / 2} rayon={8} calque />
    </svg>
  )
}
