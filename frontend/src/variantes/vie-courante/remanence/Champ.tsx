import { type KeyboardEvent, type PointerEvent, useCallback, useLayoutEffect, useRef, useState } from 'react'

import type { NiveauAnimation } from '../../../themes/types'
import { dessinerChamp, type ParametresChamp } from './dessin'
import styles from './Champ.module.css'
import {
  dureeDeOrdonnee,
  type EmpreinteAffichee,
  type EncresMur,
  formaterDuree,
  geometrieChamp,
  jourCourt,
  legende,
  nomAccessible,
  ordonneeDeDuree,
  pousserDuree,
  rectangleDeNuit,
} from './modele'
import { type Dessin, Toile } from './Toile'

/** Taille de départ avant la première mesure (et dans jsdom, qui ne mesure rien). */
const TAILLE_DEFAUT = { largeur: 640, hauteur: 360 }

interface Props {
  empreintes: readonly EmpreinteAffichee[]
  /** Moyenne des sept jours selon l'API, pour la ligne fantôme. */
  moyenne: number | null
  animation: NiveauAnimation
  encres: EncresMur
  cle: string
  /** Durée de la nuit du jour que montre la poignée de saisie. */
  heuresDuJour: number
  onDuree: (heures: number) => void
  onImprimer: () => void
  /** Ce qu'on lit sous le champ quand aucune empreinte n'est visée. */
  resume: string
}

/**
 * Le champ des empreintes : sept rectangles de lumière sur la ligne de sol. Le canvas dessine ; les
 * boutons par-dessus sont l'accès au clavier, au lecteur d'écran et au survol (un bouton par nuit), et
 * la poignée de la nuit du jour est le geste « imprimer sa nuit » : on tire son bord haut ou on la
 * pousse aux flèches. La géométrie vient du même modèle pour le canvas et pour les boutons.
 */
export function Champ({
  empreintes,
  moyenne,
  animation,
  encres,
  cle,
  heuresDuJour,
  onDuree,
  onImprimer,
  resume,
}: Props) {
  const boite = useRef<HTMLDivElement>(null)
  const [taille, setTaille] = useState(TAILLE_DEFAUT)
  const [viseeParLePointeur, setVisee] = useState<number | null>(null)
  const [viseeParLeFocus, setFocus] = useState<number | null>(null)
  const [epinglee, setEpinglee] = useState<number | null>(null)
  const lissees = useRef<number[]>([])
  const glisse = useRef(false)

  useLayoutEffect(() => {
    const element = boite.current
    if (!element) return
    const mesurer = () => {
      const largeur = element.clientWidth
      const hauteur = element.clientHeight
      if (largeur > 0 && hauteur > 0) setTaille({ largeur, hauteur })
    }
    mesurer()
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(element)
    return () => observateur.disconnect()
  }, [])

  const g = geometrieChamp(taille.largeur, taille.hauteur, empreintes.length)
  const visee = viseeParLePointeur ?? viseeParLeFocus ?? epinglee

  const dessin = useCallback<Dessin>(
    (ctx, largeur, hauteur, instant) => {
      const parametres: ParametresChamp = { empreintes, moyenne, survol: visee, lissees: lissees.current }
      dessinerChamp(ctx, largeur, hauteur, instant, parametres, encres, animation)
    },
    [empreintes, moyenne, visee, encres, animation],
  )

  /** Flèches gauche et droite : passer d'une nuit à l'autre sans repasser par Tab. */
  function surFleches(evenement: KeyboardEvent<HTMLDivElement>) {
    if (evenement.key !== 'ArrowLeft' && evenement.key !== 'ArrowRight') return
    const boutons = [...evenement.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
    const rang = boutons.findIndex((b) => b === document.activeElement)
    if (rang === -1) return
    evenement.preventDefault()
    boutons[
      Math.min(boutons.length - 1, Math.max(0, rang + (evenement.key === 'ArrowRight' ? 1 : -1)))
    ]?.focus()
  }

  const jour = rectangleDeNuit(g, empreintes.length - 1, heuresDuJour)

  function surPoignee(evenement: KeyboardEvent<HTMLDivElement>) {
    const gros = evenement.shiftKey
    if (evenement.key === 'ArrowUp' || evenement.key === 'ArrowRight') {
      evenement.preventDefault()
      onDuree(pousserDuree(heuresDuJour, 1, gros))
    } else if (evenement.key === 'ArrowDown' || evenement.key === 'ArrowLeft') {
      evenement.preventDefault()
      onDuree(pousserDuree(heuresDuJour, -1, gros))
    } else if (evenement.key === 'Enter') {
      evenement.preventDefault()
      onImprimer()
    }
  }

  /** Tirer le bord haut : la durée suit la hauteur du pointeur, par pas de 5 minutes. */
  function glisser(evenement: PointerEvent<HTMLDivElement>) {
    if (!glisse.current || !boite.current) return
    const y = evenement.clientY - boite.current.getBoundingClientRect().top
    onDuree(Math.max(5, Math.round(dureeDeOrdonnee(g, y) * 12)) / 12)
  }

  const attentif = empreintes[visee ?? -1]
  const texteLegende = attentif ? legende(attentif) : resume

  return (
    <div className={styles.zone}>
      <div className={styles.champ} ref={boite}>
        <Toile className={styles.toile} animation={animation} cle={cle} dessiner={dessin} />

        <div role="group" aria-label="Les sept dernières nuits" onKeyDown={surFleches}>
          {empreintes.map((e, i) => (
            <button
              key={e.date}
              type="button"
              className={styles.empreinte}
              style={{ left: g.marge + g.creneau * i, width: g.creneau }}
              aria-label={nomAccessible(e)}
              aria-pressed={epinglee === i}
              data-jour={i === empreintes.length - 1 || undefined}
              onPointerEnter={() => setVisee(i)}
              onPointerLeave={() => setVisee(null)}
              onFocus={() => setFocus(i)}
              onBlur={() => setFocus(null)}
              onClick={() => setEpinglee(epinglee === i ? null : i)}
            >
              <span className={styles.date} aria-hidden="true">
                {jourCourt(e.date)}
              </span>
              <span className={styles.duree} aria-hidden="true">
                {e.heures === null ? '—' : formaterDuree(e.heures)}
              </span>
            </button>
          ))}
        </div>

        <span className={styles.repere} style={{ top: ordonneeDeDuree(g, 8) - 18, left: g.marge }}>
          huit heures
        </span>
        {moyenne !== null && (
          <span
            className={styles.repere}
            data-moyenne
            style={{ top: ordonneeDeDuree(g, moyenne) - 18, right: g.marge }}
          >
            moy. 7 j · {formaterDuree(moyenne)}
          </span>
        )}

        <div
          role="slider"
          tabIndex={0}
          className={styles.poignee}
          style={{ left: jour.x + jour.largeur / 2 - 24, top: jour.y - 16 }}
          aria-label="Durée de la nuit du jour"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={12}
          aria-valuenow={Math.round(heuresDuJour * 100) / 100}
          aria-valuetext={formaterDuree(heuresDuJour)}
          onKeyDown={surPoignee}
          onPointerDown={(evenement) => {
            glisse.current = true
            evenement.currentTarget.setPointerCapture(evenement.pointerId)
          }}
          onPointerMove={glisser}
          onPointerUp={(evenement) => {
            glisse.current = false
            evenement.currentTarget.releasePointerCapture(evenement.pointerId)
          }}
          onPointerCancel={() => {
            glisse.current = false
          }}
        />
      </div>
      <p className={styles.legende}>{texteLegende}</p>
    </div>
  )
}
