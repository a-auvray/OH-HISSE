import { motion } from 'motion/react'

import { BoutonRetour } from './BoutonRetour'
import styles from './CadreEspace.module.css'
import { espaceParId, type IdEspace } from './espaces'
import { Motif } from './Motifs'

/** Page d'attente d'un espace pas encore construit. */
export function CadreEspace({ id }: { id: IdEspace }) {
  const espace = espaceParId(id)

  return (
    <main className={styles.cadre} data-espace={id}>
      <div className={styles.motif} aria-hidden="true">
        <Motif espace={espace.id} />
      </div>

      <BoutonRetour espace={id} />

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
