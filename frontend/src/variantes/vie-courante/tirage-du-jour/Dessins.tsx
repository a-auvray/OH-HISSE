import type { CSSProperties } from 'react'

import { type BarreNuit, type CaseEcart, type Colonne, type Impression } from './modele'
import { ROSE_DU_SOIR, Trame } from './Trame'
import styles from './Dessins.module.css'

/*
 * Les quatre dessins de la feuille. Aucun ne porte seul une information : chacun est doublé d'un texte
 * (pourcentage, temps restant, points, durée de la nuit), les dessins sont donc cachés aux lecteurs d'écran
 * sauf pour leur résumé en une phrase.
 */

/** Variable CSS typée : TypeScript n'accepte pas les propriétés personnalisées dans `style` sans cela. */
type StyleAvecVariables = CSSProperties & Record<`--${string}`, string | number>

/** La haute colonne de récupération : la densité de la trame dit la valeur, le contour dit ce qui reste. */
export function ColonneRecuperation({ colonne, libelle }: { colonne: Colonne; libelle: string }) {
  const progression = colonne.pourcentage / 100
  const densite = 0.14 + 0.5 * progression
  const style: StyleAvecVariables = { '--periode': `${colonne.periodeS}s` }
  return (
    <div className={styles.colonne} role="img" aria-label={libelle} style={style}>
      <div className={styles.rempli} style={{ height: `${colonne.pourcentage}%` }}>
        <Trame couleur="var(--accent)" densite={densite} className={styles.calque} />
        {/* Le deuxième calque, un peu plus gros, apparaît et disparaît : c'est la respiration. */}
        <Trame
          couleur="var(--accent)"
          densite={densite}
          grossissement={1.18}
          className={`${styles.calque} ${styles.souffle}`}
        />
      </div>
      {colonne.seuil !== null && (
        <div className={styles.seuil} style={{ bottom: `${colonne.seuil * 100}%` }} data-seuil="" />
      )}
    </div>
  )
}

/** Le rectangle d'impression du rose : aplat plein, trame à 35 %, ou simple cadre vide. */
export function Rectangle({ impression }: { impression: Impression }) {
  if (impression === 'vide') return <span className={styles.cadreVide} aria-hidden="true" />
  if (impression === 'trame')
    return (
      <span className={styles.rectangleTrame} aria-hidden="true">
        <Trame couleur={ROSE_DU_SOIR} densite={0.35} />
      </span>
    )
  return <span className={styles.aplat} aria-hidden="true" />
}

/** La réglette « écart mérité ? » : cinq cases, un repère au petit écart et un au feu vert. */
export function Reglette({ cases, impression }: { cases: readonly CaseEcart[]; impression: Impression }) {
  return (
    <ol className={styles.reglette} aria-hidden="true">
      {cases.map((c) => (
        <li key={c.libelle} className={styles.case} data-courante={c.courante || undefined}>
          <span className={styles.boite}>
            {c.remplie &&
              impression !== 'vide' &&
              (impression === 'aplat' ? (
                <span className={styles.plein} style={{ background: ROSE_DU_SOIR }} />
              ) : (
                <Trame couleur={ROSE_DU_SOIR} densite={0.55} />
              ))}
          </span>
          <span className={styles.valeur}>{c.libelle}</span>
          <span className={styles.repere}>{c.repere ?? ''}</span>
        </li>
      ))}
    </ol>
  )
}

/** La nuit en une barre hachurée sur une échelle de 0 à 10 h, avec la moyenne sur 7 jours en pointillé. */
export function BarreDeNuit({ barre }: { barre: BarreNuit | null }) {
  return (
    <div className={styles.nuit} aria-hidden="true" data-courte={barre?.courte || undefined}>
      {barre && (
        <>
          <span className={styles.barre} style={{ width: `${barre.longueur * 100}%` }}>
            <Trame couleur="var(--accent)" densite={0.5} hachures />
          </span>
          {barre.moyenne !== null && (
            <span className={styles.moyenne} style={{ left: `${barre.moyenne * 100}%` }} />
          )}
        </>
      )}
    </div>
  )
}

/**
 * La tranche de la pile : une ligne par jour de l'année écoulée, la dernière (aujourd'hui) à la couleur de son
 * verdict. Les jours passés sont des filets neutres : leur verdict n'est pas connu de cette page.
 */
export function Tranche({ jour, impression }: { jour: number; impression: Impression }) {
  const hauteur = jour * 2
  return (
    <svg
      className={styles.tranche}
      width={14}
      height={hauteur}
      viewBox={`0 0 14 ${hauteur}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: jour }, (_, i) => {
        const aujourdhui = i === jour - 1
        return (
          <rect
            key={i}
            x={0}
            y={i * 2}
            width={14}
            height={1.5}
            fill={aujourdhui && impression !== 'vide' ? ROSE_DU_SOIR : 'var(--accent)'}
            opacity={aujourdhui ? 1 : 0.55}
          />
        )
      })}
    </svg>
  )
}
