import { motion } from 'motion/react'
import { Link } from 'react-router'

import { OPPOSE } from '../navigation/directions'
import styles from './CadreEspace.module.css'
import { espaceParId, type Direction, type IdEspace } from './espaces'
import { Motif } from './Motifs'

const RETOUR: Record<Direction, string> = {
  haut: '↑ Accueil',
  bas: '↓ Accueil',
  gauche: '← Accueil',
  droite: 'Accueil →',
}

/**
 * Cadre commun d'un espace. Le bouton de retour est posé du côté où se
 * trouve l'accueil : en Vie courante (en haut), on redescend ; en Marine
 * (à droite), on repart vers la gauche.
 */
export function CadreEspace({ id }: { id: IdEspace }) {
  const espace = espaceParId(id)
  const versAccueil = OPPOSE[espace.direction]

  return (
    <main className={styles.cadre} data-espace={id}>
      <div className={styles.motif} aria-hidden="true">
        <Motif espace={espace.id} />
      </div>

      <Link to="/" className={styles.retour} data-cote={versAccueil}>
        {RETOUR[versAccueil]}
      </Link>

      <div className={styles.contenu}>
        <motion.h1
          className={styles.titre}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {espace.nom}
        </motion.h1>
        <p className={styles.devise}>{espace.devise}</p>

        <section className={styles.chantier} aria-labelledby={`chantier-${id}`}>
          <h2 id={`chantier-${id}`}>En construction</h2>
          <ul>
            {espace.fonctionnalites.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
