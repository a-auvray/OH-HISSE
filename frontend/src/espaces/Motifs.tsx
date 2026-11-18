/**
 * Motifs d'identité : un dessin animé par espace, reconnaissable sans lire un
 * mot (note 11 du CDC). Purement décoratifs, donc masqués aux lecteurs d'écran.
 * Ils s'animent davantage au survol de leur tuile (classe globale `motif-hote` sur le parent).
 */
import { useId } from 'react'

import type { IdEspace } from './espaces'
import styles from './Motifs.module.css'

/** Disque de fonte qui tourne lentement, et traces de craie. */
function MotifStreetlifting() {
  // Identifiant unique : pendant une transition, deux motifs coexistent à l'écran.
  // useId peut contenir des signes mal lus dans url(#…) : on ne garde que lettres et chiffres.
  const craie = `craie${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const rayons = [96, 80, 62, 30, 14]
  return (
    <svg className={styles.motif} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <filter id={craie}>
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.6 1.1" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <g className={styles.disque}>
        {rayons.map((r, i) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={i === 0 ? 6 : 1.5}
            opacity={i === 0 ? 0.9 : 0.45}
          />
        ))}
        <text className={styles.gravure} x="100" y="48" textAnchor="middle">
          20 KG
        </text>
        <text className={styles.gravure} x="100" y="162" textAnchor="middle" transform="rotate(180 100 156)">
          OH HISSE
        </text>
      </g>
      <g filter={`url(#${craie})`} opacity="0.5">
        <path d="M18 170 Q60 150 112 176" stroke="white" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M140 30 Q165 40 186 22" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** Trois houles superposées qui défilent à des vitesses différentes. */
function MotifMarine() {
  const vague = 'M0 20 Q 25 0 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20 T 350 20 T 400 20 V 60 H 0 Z'
  return (
    <svg className={styles.motif} viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          className={styles.vague}
          d={vague}
          transform={`translate(0 ${120 + i * 22})`}
          fill="var(--accent)"
          opacity={0.18 + i * 0.22}
          style={{ animationDuration: `${9 - i * 2.5}s`, animationDelay: `${-i * 1.3}s` }}
        />
      ))}
    </svg>
  )
}

/** Croissant de lune entouré d'anneaux qui respirent. */
function MotifVieCourante() {
  return (
    <svg className={styles.motif} viewBox="0 0 200 200" aria-hidden="true">
      {[34, 54, 74, 94].map((r, i) => (
        <circle
          key={r}
          className={styles.anneau}
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.2"
          style={{ animationDelay: `${i * 0.9}s` }}
        />
      ))}
      <path
        d="M112 72 A 30 30 0 1 0 128 118 A 24 24 0 1 1 112 72 Z"
        fill="var(--accent-clair)"
        opacity="0.9"
      />
    </svg>
  )
}

/** Cible et trajectoire de progression qui monte vers elle. */
function MotifObjectifs() {
  return (
    <svg className={styles.motif} viewBox="0 0 200 200" aria-hidden="true">
      {[78, 56, 34, 12].map((r, i) => (
        <circle
          key={r}
          cx="128"
          cy="72"
          r={r}
          fill={i === 3 ? 'var(--accent)' : 'none'}
          stroke="var(--accent)"
          strokeWidth="1.5"
          opacity={0.35 + i * 0.18}
        />
      ))}
      <path
        className={styles.trajectoire}
        d="M8 190 L 46 160 L 66 168 L 98 120 L 112 128 L 128 72"
        fill="none"
        stroke="var(--accent-clair)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
      />
    </svg>
  )
}

/** Le motif d'identité de l'espace demandé. */
export function Motif({ espace }: { espace: IdEspace }) {
  switch (espace) {
    case 'streetlifting':
      return <MotifStreetlifting />
    case 'marine':
      return <MotifMarine />
    case 'vie-courante':
      return <MotifVieCourante />
    case 'objectifs':
      return <MotifObjectifs />
  }
}
