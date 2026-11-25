import { useEffect, useState } from 'react'

import { useRessort } from './animation'
import { cheminPoutre } from './modele'
import styles from './Poutre.module.css'

/** Hauteur du dessin : le repos, la flèche maximale, et la place de l'étiquette sous le point bas. */
export const Y_REPOS = 18
export const HAUTEUR_POUTRE = 108

/** La durée pendant laquelle la valeur précédente reste en filigrane après un changement. */
const DUREE_FANTOME_MS = 1200

export interface EtatPoutre {
  /** Flèche en pixels (0 : à plat). */
  amplitude: number
  /** Point de charge, en part de la largeur (0 à 1). */
  position: number
  /** Texte au point bas, par exemple « 106,7 kg · 98 % du record ». */
  etiquette: string | null
}

interface Props extends EtatPoutre {
  largeur: number
  /** Couleur du filet (un jeton, éventuellement mêlé). */
  teinte: string
  /** Une flèche en filigrane, par exemple celle de la plaque survolée. */
  survol?: EtatPoutre | null
}

/**
 * La ligne de charge : un filet tendu de bord à bord, qui ploie comme une poutre simplement appuyée et
 * chargée en un point. La flèche suit sa cible comme un ressort lourd ; la valeur précédente reste en
 * filigrane un instant, pour qu'on voie d'où vient le mouvement. Décor : l'information est aussi en texte
 * dans la page, ce dessin est donc caché aux lecteurs d'écran.
 */
export function Poutre({ largeur, amplitude, position, etiquette, teinte, survol }: Props) {
  const a = useRessort(amplitude)
  const p = useRessort(position)

  // La valeur précédente en filigrane : comparée au rendu (pas dans un effet) pour apparaître au même instant.
  const [vue, setVue] = useState({ amplitude, position })
  const [fantome, setFantome] = useState<{ amplitude: number; position: number } | null>(null)
  if (vue.amplitude !== amplitude || vue.position !== position) {
    setVue({ amplitude, position })
    if (vue.amplitude > 0) setFantome({ amplitude: vue.amplitude, position: vue.position })
  }
  useEffect(() => {
    if (!fantome) return
    const minuteur = setTimeout(() => setFantome(null), DUREE_FANTOME_MS)
    return () => clearTimeout(minuteur)
  }, [fantome])

  if (largeur <= 0) return <div style={{ height: HAUTEUR_POUTRE }} aria-hidden="true" />

  const x = Math.min(Math.max(p * largeur, 90), Math.max(90, largeur - 90))
  const yBas = Y_REPOS + a
  const xSurvol = survol ? Math.min(Math.max(survol.position * largeur, 90), Math.max(90, largeur - 90)) : 0

  return (
    <svg
      className={styles.poutre}
      width={largeur}
      height={HAUTEUR_POUTRE}
      viewBox={`0 0 ${largeur} ${HAUTEUR_POUTRE}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Les deux appuis : la poutre repose sur le bord extérieur et sur le côté du centre. */}
      <path className={styles.appui} d={`M10,${Y_REPOS + 2} l9,12 h-18 z`} />
      <path className={styles.appui} d={`M${largeur - 10},${Y_REPOS + 2} l9,12 h-18 z`} />

      <path className={styles.ombre} d={cheminPoutre(largeur, Y_REPOS + 6, a, p)} />
      {fantome && (
        <path
          className={styles.fantome}
          d={cheminPoutre(largeur, Y_REPOS, fantome.amplitude, fantome.position)}
        />
      )}
      {survol && survol.amplitude > 0 && (
        <g className={styles.survol}>
          <path d={cheminPoutre(largeur, Y_REPOS, survol.amplitude, survol.position)} />
          {survol.etiquette && (
            <text x={xSurvol} y={Y_REPOS + survol.amplitude + 20} textAnchor="middle">
              {survol.etiquette}
            </text>
          )}
        </g>
      )}
      <path className={styles.ligne} d={cheminPoutre(largeur, Y_REPOS, a, p)} style={{ stroke: teinte }} />
      {etiquette && a > 0 && (
        <text className={styles.etiquette} x={x} y={yBas + 22} textAnchor="middle">
          {etiquette}
        </text>
      )}
    </svg>
  )
}
