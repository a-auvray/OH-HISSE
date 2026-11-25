import { type FormEvent, useMemo, useState } from 'react'

import type { EtatDuJour } from '../../../api/types'
import { aujourdhui, dateCourte, kg, nombre } from '../../../commun/format'
import { peser } from '../../../espaces/vie-courante/etat'
import styles from './Aujourdhui.module.css'
import { sansException, usePesees } from './donnees'
import { pointsDeBalance, tracerBalance, variationDePesee } from './modele'

const LARGEUR = 160
const HAUTEUR = 36

interface Props {
  poids: EtatDuJour['poids']
  /** À appeler après une pesée : l'état du jour (donc la moyenne) change. */
  apresPesee: () => void
}

/**
 * La balance : la moyenne mobile en grand (celle que le 1RM utilise), une ligne de douze semaines
 * (moyenne en trait plein, pesées en points), l'état à jour ou non, et la saisie de la pesée.
 */
export function Balance({ poids, apresPesee }: Props) {
  const [pesees, rechargerPesees] = usePesees()
  const [saisie, setSaisie] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const jour = aujourdhui()

  const points = useMemo(
    () => (pesees.etat === 'pret' ? pointsDeBalance(pesees.valeur, jour) : []),
    [pesees, jour],
  )
  const trace = useMemo(() => tracerBalance(points, jour, LARGEUR, HAUTEUR), [points, jour])
  const variation = variationDePesee(points)

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault()
    const message = await sansException(() => peser(saisie), 'La pesée n’a pas pu être notée.')
    setErreur(message)
    if (!message) {
      setSaisie('')
      apresPesee()
      rechargerPesees()
    }
  }

  const aJour = poids?.a_jour ?? false
  const dernier = trace.ligne.length - 1
  const pointsDeLigne = trace.ligne.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
  // Pesée non mise à jour : le dernier segment passe en tirets, comme une valeur qui n'a pas bougé.
  const plein = aJour ? pointsDeLigne : pointsDeLigne.slice(0, -1)
  const dernierSegment = !aJour && dernier >= 1 ? trace.ligne.slice(-2) : null

  return (
    <section
      className={`${styles.bloc} ${styles.apparait}`}
      style={{ ['--rang' as string]: 3 }}
      aria-labelledby="rem-poids"
    >
      <h3 id="rem-poids" className={styles.rubrique}>
        Poids du corps
      </h3>
      <p className={styles.poids}>{poids ? kg(poids.kg, 1) : '—'}</p>
      <p className={styles.texte}>
        {poids
          ? poids.a_jour
            ? 'Moyenne des pesées des trois dernières semaines.'
            : 'Dernière pesée de plus de trois semaines : non mise à jour.'
          : 'Le 1RM et les charges en ont besoin : une pesée par semaine, le lundi matin à jeun.'}
      </p>
      {poids && (
        <p className={styles.texte}>
          Dernière pesée : {dateCourte(poids.derniere_pesee)}
          {variation !== null && (
            <>
              {' '}
              · <span className={styles.chiffre}>{variation} kg</span> depuis la pesée précédente
            </>
          )}
        </p>
      )}
      {points.length >= 2 && (
        <svg
          className={styles.ligne}
          viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
          role="img"
          aria-label={`Poids sur douze semaines : ${points.length} pesées, de ${nombre(points[0]?.kg ?? 0)} à ${nombre(points.at(-1)?.kg ?? 0)} kg`}
        >
          {plein.length >= 2 && <polyline points={plein.join(' ')} className={styles.moyenneMobile} />}
          {dernierSegment && (
            <polyline
              points={dernierSegment.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              className={styles.moyenneMobile}
              strokeDasharray="3 3"
            />
          )}
          {trace.points.map((p, i) => (
            <circle key={points[i]?.date ?? i} cx={p.x} cy={p.y} r={1.5} className={styles.pointDePesee} />
          ))}
        </svg>
      )}
      <form className={styles.champSaisie} onSubmit={enregistrer}>
        <label>
          <span className="sr-only">Poids du jour en kg</span>
          <input
            inputMode="decimal"
            placeholder="75,0"
            value={saisie}
            onChange={(ev) => setSaisie(ev.target.value)}
            required
          />
          <span>kg</span>
        </label>
        <button type="submit" className={styles.bouton}>
          Peser
        </button>
      </form>
      {erreur && (
        <p className={styles.erreur} role="alert">
          {erreur}
        </p>
      )}
    </section>
  )
}
