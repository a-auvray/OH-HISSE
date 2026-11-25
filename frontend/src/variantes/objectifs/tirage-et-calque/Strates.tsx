import { useId } from 'react'

import { Badge } from './Badge'
import { bandesDeColonne, COLONNE, decalageDeMires } from './geometrie'
import { Mire } from './Mires'
import { type ClefMotif, urlMotif } from './clefsMotifs'
import { Motifs } from './Motifs'
import { texteMesure } from './modele'
import type { Planche } from './donnees'
import styles from './Strates.module.css'

/** La jauge d'une planche en lecture : le meter des lecteurs d'écran, qui ouvre la fiche au clavier. */
function proprietesMesure(planche: Planche, ouvrir: () => void) {
  const { objectif, analyse: a } = planche
  return {
    role: 'meter' as const,
    tabIndex: 0,
    'aria-label': objectif.titre,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': Math.round(a.pourcentage),
    'aria-valuetext': texteMesure(a, objectif),
    onClick: ouvrir,
    onKeyDown: (e: { key: string; preventDefault: () => void }) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        ouvrir()
      }
    },
  }
}

/**
 * Une colonne stratigraphique de 120 px : les assises de 2,5 kg d'un objectif, à hauteur normalisée
 * (même ligne de sol, même faîtage pour tous). Les franchies sont hachurées, selon le bloc pendant
 * lequel elles l'ont été ; l'assise en cours est en halo ; les restantes sont en pointillés.
 * À droite, la bande de calque porte la paire de mires : alignée, ou décalée de l'écart au plan.
 */
export function Colonne({ planche, ouvrir }: { planche: Planche; ouvrir: () => void }) {
  const { analyse: a } = planche
  const prefixe = useId().replace(/:/g, '')
  const bandes = bandesDeColonne(a)
  const niveauY = a.e1rm === null ? COLONNE.hauteur : COLONNE.hauteur - (a.e1rm / a.sommet) * COLONNE.hauteur

  return (
    <div className={styles.terrain}>
      <div className={styles.mesure} {...proprietesMesure(planche, ouvrir)}>
        <svg
          className={styles.colonne}
          viewBox={`0 0 ${COLONNE.largeur} ${COLONNE.hauteur}`}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <Motifs prefixe={prefixe} />
          </defs>
          {bandes.map((b) => {
            const assise = a.assises[b.rang]!
            const clef: ClefMotif = assise.bloc?.type ?? 'sans-bloc'
            if (b.part >= 1) {
              return (
                <rect
                  key={b.rang}
                  className={styles.franchie}
                  x={0}
                  y={b.y}
                  width={COLONNE.largeur}
                  height={b.hauteur}
                  style={{ fill: urlMotif(prefixe, clef) }}
                />
              )
            }
            return (
              <g key={b.rang}>
                <rect
                  className={b.part > 0 ? styles.enCours : styles.restante}
                  x={0}
                  y={b.y}
                  width={COLONNE.largeur}
                  height={b.hauteur}
                />
                {b.part > 0 && (
                  <rect
                    className={styles.franchie}
                    x={0}
                    y={b.y + b.hauteur * (1 - b.part)}
                    width={COLONNE.largeur}
                    height={b.hauteur * b.part}
                    style={{ fill: urlMotif(prefixe, clef) }}
                  />
                )}
              </g>
            )
          })}
          <line
            className={styles.sol}
            x1={0}
            x2={COLONNE.largeur}
            y1={COLONNE.hauteur}
            y2={COLONNE.hauteur}
          />
          <line className={styles.faitage} x1={0} x2={COLONNE.largeur} y1={0.5} y2={0.5} />
        </svg>
      </div>

      <svg
        className={styles.calque}
        viewBox={`0 0 36 ${COLONNE.hauteur}`}
        aria-hidden="true"
        focusable="false"
      >
        <rect className={styles.feuille} x={1} y={1} width={34} height={COLONNE.hauteur - 2} />
        <line className={styles.axe} x1={18} x2={18} y1={4} y2={COLONNE.hauteur - 4} />
        <Mire x={18} y={niveauY - decalageDeMires(a) / 2} rayon={7} />
        <Mire x={18} y={niveauY + decalageDeMires(a) / 2} rayon={7} calque />
      </svg>
    </div>
  )
}

/**
 * Au-delà de cinq objectifs, la colonne devient une règle d'échelle : un segment par assise, plein
 * pour les franchies, vide pour les restantes. Même information, plus compacte.
 */
export function Regle({ planche, ouvrir }: { planche: Planche; ouvrir: () => void }) {
  const { objectif, analyse: a } = planche
  return (
    <div className={styles.regle}>
      <div className={styles.regleTitre}>
        <button type="button" className={styles.titreBouton} onClick={ouvrir}>
          {objectif.titre}
        </button>
        <Badge statut={a.statut} jours={a.ecart?.jours} />
      </div>
      <div className={styles.regleMesure} {...proprietesMesure(planche, ouvrir)}>
        {a.assises.map((s, i) => (
          <span
            key={i}
            className={styles.segment}
            data-etat={s.part >= 1 ? 'plein' : s.part > 0 ? 'cours' : 'vide'}
          />
        ))}
      </div>
      <p className={styles.regleChiffre}>{Math.round(a.pourcentage)}&nbsp;%</p>
    </div>
  )
}
