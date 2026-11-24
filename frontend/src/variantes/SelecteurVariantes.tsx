import { useContext } from 'react'

import { ESPACES } from '../espaces/espaces'
import { ContexteVariantes, type ContexteVariantesValeur } from './contexte'
import styles from './SelecteurVariantes.module.css'

/**
 * Le choix des vues, espace par espace, dans le panneau des réglages. Chaque espace propose
 * les vues de son thème, puis ses variantes. Rien ne s'affiche tant qu'aucune variante n'existe.
 */
export function SelecteurVariantes() {
  const contexte = useContext(ContexteVariantes)
  return contexte ? <Choix contexte={contexte} /> : null
}

function Choix({ contexte }: { contexte: ContexteVariantesValeur }) {
  const { variantes, choisie, enChargement, choisir, prechauffer, erreur } = contexte
  const espaces = ESPACES.filter((e) => variantes[e.id].length > 0)
  if (espaces.length === 0) return null

  return (
    <section className={styles.racine} aria-label="Vues des espaces">
      <h2 className={styles.titre}>Vues des espaces</h2>
      {espaces.map((espace) => {
        const actuelle = choisie(espace.id)
        const charge = enChargement(espace.id)
        return (
          <div key={espace.id} className={styles.espace}>
            <p className={styles.nomEspace}>{espace.nom}</p>
            <div className={styles.choix} role="radiogroup" aria-label={`Vue de ${espace.nom}`}>
              <button
                type="button"
                role="radio"
                aria-checked={actuelle === null}
                title="Les vues dessinées par le thème"
                onClick={() => choisir(espace.id, null)}
              >
                Du thème
              </button>
              {variantes[espace.id].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={actuelle === v.id}
                  aria-busy={(actuelle === v.id && charge) || undefined}
                  title={v.description}
                  onClick={() => choisir(espace.id, v.id)}
                  onPointerEnter={() => prechauffer(espace.id, v.id)}
                  onFocus={() => prechauffer(espace.id, v.id)}
                >
                  {v.nom}
                </button>
              ))}
            </div>
          </div>
        )
      })}
      {erreur && (
        <p className={styles.erreur} role="alert">
          {erreur}
        </p>
      )}
    </section>
  )
}
