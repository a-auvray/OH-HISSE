import { useCallback } from 'react'

import type { NiveauAnimation } from '../../../themes/types'
import styles from './Champ.module.css'
import { dessinerColonne } from './dessin'
import type { EncresMur, PalierSouffle } from './modele'
import { type Dessin, Toile } from './Toile'

interface Props {
  /** Part récupérée, de 0 à 1. */
  progression: number
  recupere: boolean
  restantH: number
  palier: PalierSouffle
  animation: NiveauAnimation
  encres: EncresMur
  cle: string
}

/**
 * La colonne de récupération, posée sur la même ligne de sol que les empreintes : elle se remplit de
 * lumière par le bas et son bord haut respire selon le palier. Le dessin est décoratif ; le chiffre,
 * le temps restant et le palier sont écrits dessous (et le détail dans le bloc « Récupération »).
 */
export function Colonne({ progression, recupere, restantH, palier, animation, encres, cle }: Props) {
  const pourcent = Math.round(progression * 100)
  const dessin = useCallback<Dessin>(
    (ctx, largeur, hauteur, instant) =>
      dessinerColonne(ctx, largeur, hauteur, instant, { progression, palier }, encres, animation),
    [progression, palier, encres, animation],
  )

  return (
    <div className={styles.champ} role="img" aria-label={`Récupération à ${pourcent} %`}>
      <Toile className={styles.toile} animation={animation} cle={cle} dessiner={dessin} />
      <div className={styles.pied} aria-hidden="true">
        <span className={styles.pourcent}>{pourcent} %</span>
        <span className={styles.duree}>{recupere ? 'prêt' : `encore ${Math.round(restantH)} h`}</span>
        <span className={styles.date}>{palier.nom}</span>
      </div>
    </div>
  )
}
