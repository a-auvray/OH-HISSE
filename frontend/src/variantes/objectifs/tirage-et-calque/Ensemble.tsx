import { Badge } from './Badge'
import boutons from './Boutons.module.css'
import { Compteur } from './Compteur'
import type { Planche } from './donnees'
import styles from './Ensemble.module.css'
import type { Gestes } from './Fiche'
import { decimal, niveau, phraseEstimation } from './modele'
import { Colonne, Regle } from './Strates'
import type { SessionVisite } from './useVisite'

/** Au-delà de ce nombre d'objectifs, les colonnes deviennent des règles d'échelle. */
export const MAX_COLONNES = 5

interface Props {
  /** Les planches en cours, le principal d'abord. */
  planches: readonly Planche[]
  principalId: number | null
  session: SessionVisite
  gestes: Pick<Gestes, 'mettreEnAvant'>
  ouvrir: (id: number) => void
}

/**
 * L'ensemble : chaque objectif est une colonne stratigraphique, à hauteur normalisée (même sol,
 * même faîtage), pour que la progression relative se compare d'un coup d'œil. À droite, les
 * prochains paliers de la semaine, calculés à partir des e1RM.
 */
export function Ensemble({ planches, principalId, session, gestes, ouvrir }: Props) {
  const enColonnes = planches.length <= MAX_COLONNES
  const paliers = planches.filter((p) => p.analyse.palier)

  return (
    <div className={styles.ensemble}>
      <div className={styles.principal}>
        {enColonnes ? (
          <ul className={styles.colonnes} aria-label="Planches en cours">
            {planches.map((planche, i) => {
              const { objectif, analyse: a } = planche
              const estime = phraseEstimation(a)
              return (
                <li key={objectif.id} className={styles.objet} style={{ ['--rang' as string]: i }}>
                  <h3 className={styles.nom}>
                    <button type="button" className={styles.nomBouton} onClick={() => ouvrir(objectif.id)}>
                      {objectif.titre}
                    </button>
                  </h3>
                  <p className={styles.pourcent}>
                    <Compteur
                      valeur={Math.round(a.pourcentage)}
                      depart={session.precedente?.pourcentages[String(objectif.id)] ?? 0}
                    />{' '}
                    %
                  </p>
                  <Badge statut={a.statut} jours={a.ecart?.jours} />
                  {estime && <p className={styles.estime}>{estime}</p>}
                  <Colonne planche={planche} ouvrir={() => ouvrir(objectif.id)} />
                  {objectif.id === principalId ? (
                    <p className={styles.etiquette}>Objectif principal</p>
                  ) : (
                    <button
                      type="button"
                      className={boutons.bouton}
                      onClick={() => void gestes.mettreEnAvant(objectif)}
                    >
                      Mettre en avant
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <ul className={styles.regles} aria-label="Planches en cours">
            {planches.map((planche) => (
              <li key={planche.objectif.id}>
                <Regle planche={planche} ouvrir={() => ouvrir(planche.objectif.id)} />
                {planche.objectif.id !== principalId && (
                  <button
                    type="button"
                    className={boutons.bouton}
                    onClick={() => void gestes.mettreEnAvant(planche.objectif)}
                  >
                    Mettre en avant
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className={styles.legende}>
          Le calque porte le plan et se cale sur ton e1RM actuel : s’il glisse vers le bas, tu es en retard ;
          vers le haut, en avance. Les deux croix de mire se dédoublent d’autant que l’écart est grand.
        </p>
      </div>

      <aside className={styles.paliers} aria-label="Prochains paliers">
        <h3 className={styles.etiquette}>Prochains paliers</h3>
        {paliers.length ? (
          <ul>
            {paliers.map(({ objectif, analyse: a }) =>
              a.palier ? (
                <li key={objectif.id}>
                  <span>{objectif.titre}</span>
                  <span className={styles.palier}>{niveau(a.palier.niveau)} kg</span>
                  <span className={styles.reste}>à +{decimal(a.palier.reste)} kg</span>
                </li>
              ) : null,
            )}
          </ul>
        ) : (
          <p className={styles.reste}>Aucun palier à venir.</p>
        )}
      </aside>
    </div>
  )
}
