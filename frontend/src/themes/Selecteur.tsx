import { useEffect, useId, useRef, useState } from 'react'

import { SelecteurVariantes } from '../variantes/SelecteurVariantes'
import { useTheme } from './contexte'
import styles from './Selecteur.module.css'
import type { NiveauAnimation } from './types'

const NIVEAUX: readonly { id: NiveauAnimation; libelle: string; aide: string }[] = [
  { id: 'cinema', libelle: 'Cinéma', aide: 'Toutes les animations' },
  { id: 'sobre', libelle: 'Sobre', aide: 'Animations réduites au strict utile' },
  { id: 'immobile', libelle: 'Immobile', aide: 'Aucune animation' },
]

/**
 * Réglages des thèmes, volontairement discrets : un point en bas à droite qui
 * ne se montre qu'au survol, et un petit panneau pour choisir le thème, ses
 * favoris et le niveau d'animation.
 */
export function Selecteur() {
  const {
    themes,
    id,
    choisir,
    prechauffer,
    favoris,
    basculerFavori,
    animation,
    reglerAnimation,
    enChangement,
    erreur,
  } = useTheme()
  const [ouvert, setOuvert] = useState(false)
  const racine = useRef<HTMLDivElement>(null)
  const titre = useId()

  useEffect(() => {
    if (!ouvert) return
    const fermerSiEchap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    const fermerSiDehors = (e: PointerEvent) => {
      if (racine.current && !racine.current.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener('keydown', fermerSiEchap)
    document.addEventListener('pointerdown', fermerSiDehors)
    return () => {
      document.removeEventListener('keydown', fermerSiEchap)
      document.removeEventListener('pointerdown', fermerSiDehors)
    }
  }, [ouvert])

  // Les favoris d'abord, sans changer l'ordre du registre par ailleurs.
  const ordre = [...themes].sort((a, b) => Number(favoris.includes(b.id)) - Number(favoris.includes(a.id)))

  return (
    <div className={styles.racine} ref={racine}>
      {ouvert && (
        <section className={styles.panneau} aria-labelledby={titre}>
          <h2 id={titre} className={styles.titre}>
            Thèmes
          </h2>
          <ul className={styles.liste}>
            {ordre.map((t) => {
              const favori = favoris.includes(t.id)
              return (
                <li key={t.id} className={styles.ligne}>
                  <button
                    type="button"
                    className={styles.theme}
                    aria-pressed={t.id === id}
                    disabled={enChangement}
                    onClick={() => void choisir(t.id)}
                    onPointerEnter={() => prechauffer(t.id)}
                    onFocus={() => prechauffer(t.id)}
                  >
                    <span className={styles.apercu} aria-hidden="true">
                      {t.apercu.map((couleur, i) => (
                        <i key={i} style={{ background: couleur }} />
                      ))}
                    </span>
                    <span className={styles.nom}>{t.nom}</span>
                    <span className={styles.description}>{t.description}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.favori}
                    aria-pressed={favori}
                    aria-label={`${favori ? 'Retirer des' : 'Ajouter aux'} favoris : ${t.nom}`}
                    onClick={() => basculerFavori(t.id)}
                  >
                    {favori ? '★' : '☆'}
                  </button>
                </li>
              )
            })}
          </ul>
          {erreur && (
            <p className={styles.erreur} role="alert">
              {erreur}
            </p>
          )}
          <SelecteurVariantes />
          <div className={styles.animations} role="radiogroup" aria-label="Niveau d’animation">
            {NIVEAUX.map((n) => (
              <button
                key={n.id}
                type="button"
                role="radio"
                aria-checked={animation === n.id}
                title={n.aide}
                onClick={() => reglerAnimation(n.id)}
              >
                {n.libelle}
              </button>
            ))}
          </div>
        </section>
      )}
      <button
        type="button"
        className={styles.bouton}
        aria-label="Réglages du thème"
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  )
}
