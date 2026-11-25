import { type CSSProperties, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'

import type { ObjectifLu } from '../../../api/types'
import { dateCourte, nombre } from '../../../commun/format'
import { echeance } from '../../../espaces/objectifs/useObjectifs'
import type { NiveauAnimation } from '../../../themes/types'
import { Badge } from './Badge'
import commun from './commun.module.css'
import styles from './Drisse.module.css'
import {
  amplitudePincement,
  avancement,
  DUREE_PINCEMENT,
  hautDePince,
  hautDeProjection,
  phraseBulle,
  type Rythme,
  semaines,
  signe,
  statut,
  texteDrisse,
  trajetHisse,
} from './modele'

/**
 * Le pincement : on pince la drisse (pointeur enfoncé, ou Espace), seule la partie hissée vibre, de 2 px
 * au plus, et l'onde s'éteint en moins de 400 ms. Jamais au survol, jamais en mode Sobre ou Immobile.
 */
function usePincement(animation: NiveauAnimation, enRetard: boolean) {
  const [amplitude, setAmplitude] = useState(0)
  const image = useRef(0)

  const pincer = useCallback(() => {
    if (animation !== 'cinema' || document.hidden) return
    cancelAnimationFrame(image.current)
    const debut = performance.now()
    const boucle = (maintenant: number) => {
      const t = (maintenant - debut) / 1000
      setAmplitude(amplitudePincement(t, enRetard))
      image.current = t < DUREE_PINCEMENT ? requestAnimationFrame(boucle) : 0
    }
    image.current = requestAnimationFrame(boucle)
  }, [animation, enRetard])

  useEffect(() => {
    // Un onglet masqué ne travaille pas : le tintement s'arrête là où il est.
    const surVisibilite = () => {
      if (!document.hidden) return
      cancelAnimationFrame(image.current)
      image.current = 0
      setAmplitude(0)
    }
    document.addEventListener('visibilitychange', surVisibilite)
    return () => {
      document.removeEventListener('visibilitychange', surVisibilite)
      cancelAnimationFrame(image.current)
    }
  }, [])

  return [amplitude, pincer] as const
}

/** La tête de mât d'une drisse : la cible en grand, puis l'échéance. Aussi posée au-dessus de la sculpture. */
export function EnteteDrisse({ objectif: o }: { objectif: ObjectifLu }) {
  return (
    <header className={styles.entete}>
      <p className={styles.cible}>+{nombre(o.valeur_cible_kg)} kg</p>
      <p className={styles.echeance}>
        {dateCourte(o.date_cible)}
        {o.statut === 'en_cours' && (
          <>
            {' '}
            · {echeance(o.jours_restants)}
            {o.jours_restants > 0 && <> · {semaines(o.jours_restants)}</>}
          </>
        )}
      </p>
    </header>
  )
}

interface Props {
  objectif: ObjectifLu
  rythme: Rythme | null
  chargement: boolean
  animation: NiveauAnimation
  /** Rang dans la rangée : les drisses s'accrochent l'une après l'autre. */
  rang: number
  onChoisir: () => void
}

/**
 * Un objectif est une drisse verticale : la base est 0 kg de lest, la tête de mât la cible. La pince serre le fil à
 * l'e1RM actuel ; dessous le fil est hissé, au-dessus il ne reste que le tracé du mât en pointillé. Ce qui se lit
 * sur la forme est aussi écrit : la valeur de la pince, l'échéance, le statut et le pourcentage.
 */
export function Drisse({ objectif: o, rythme, chargement, animation, rang, onChoisir }: Props) {
  const etat = statut(o, rythme)
  const [amplitude, pincer] = usePincement(animation, etat === 'retard')

  const haut = hautDePince(o)
  const projection = hautDeProjection(o, rythme)
  // Un objectif détendu garde sa trace hissée, en pointillé, mais la pince est redescendue à la base.
  const hautTrace = o.statut === 'abandonne' ? 100 - avancement(o) * 100 : haut
  const trajet = trajetHisse(hautTrace, amplitude)
  const e1rm = o.progression?.e1rm_lest_kg ?? null

  function surTouche(e: KeyboardEvent) {
    if (e.key === 'Enter') onChoisir()
    // Maintenir Espace pince la drisse ; on n'excite pas à chaque répétition de touche.
    if (e.key === ' ') {
      e.preventDefault()
      if (!e.repeat) pincer()
    }
  }

  return (
    <article
      className={styles.drisse}
      data-statut={o.statut}
      data-etat={etat ?? undefined}
      style={{ '--rang': rang } as CSSProperties}
    >
      <EnteteDrisse objectif={o} />

      <div
        className={`${styles.zone} ${commun.filets}`}
        role="meter"
        tabIndex={0}
        aria-label={o.titre}
        aria-valuemin={0}
        aria-valuemax={o.valeur_cible_kg}
        aria-valuenow={e1rm ?? 0}
        aria-valuetext={texteDrisse(o, rythme, chargement)}
        aria-keyshortcuts="Enter Space"
        onPointerDown={pincer}
        onKeyDown={surTouche}
      >
        <svg className={styles.fil} viewBox="0 0 48 100" preserveAspectRatio="none" aria-hidden="true">
          {hautTrace > 0 && <line className={styles.mat} x1="24" x2="24" y1="0" y2={hautTrace} />}
          {trajet && <path className={styles.hisse} d={trajet} />}
        </svg>
        <span className={styles.pince} style={{ top: `${haut}%` }} aria-hidden="true" />
        <span className={styles.valeur} style={{ top: `${haut}%` }} aria-hidden="true">
          {e1rm === null ? '—' : signe(e1rm, 1)}
        </span>
        {projection !== null && rythme?.projection != null && (
          <span
            className={styles.projection}
            data-au-dessus={(rythme.ecart ?? 0) >= 0 || undefined}
            style={{ top: `${projection}%` }}
            aria-hidden="true"
          >
            {signe(rythme.projection, 1)}
            <i />
          </span>
        )}
        <span className={styles.bulle} aria-hidden="true">
          {phraseBulle(o, rythme)}
        </span>
      </div>

      <footer className={styles.pied}>
        <button type="button" className={styles.nom} onClick={onChoisir} title="Ouvrir la fiche">
          {o.titre}
        </button>
        <p className={styles.chiffres}>
          {o.progression ? `${Math.round(avancement(o) * 100)} %` : '—'}
          {' · '}
          {o.progression ? signe(o.progression.e1rm_lest_kg, 1) : '—'} / {nombre(o.valeur_cible_kg)} kg
        </p>
        {etat && <Badge statut={etat} />}
      </footer>
    </article>
  )
}
