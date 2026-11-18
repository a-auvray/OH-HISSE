import { motion } from 'motion/react'

import { api } from '../../api/client'
import { messageErreur, type Nuit } from '../../api/types'
import { depuisIso, isoLocal, nombre } from '../../commun/format'
import { exiger, useDonnees } from '../../commun/useDonnees'
import styles from './Sommeil.module.css'

const JOURS = 30
const MAX_H = 10
const JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow', day: 'numeric' })

/** Les 30 dernières nuits, avec le repère des 7 h et des 6 h (note 05). */
export function Sommeil() {
  const [nuits] = useDonnees(
    async () =>
      exiger(await api.GET('/api/vie-courante/nuits', { params: { query: { jours: JOURS } } }), (e) =>
        messageErreur(e),
      ),
    [],
  )
  if (nuits.etat !== 'pret') return null

  const parJour = new Map<string, Nuit>(nuits.valeur.map((n) => [n.date, n]))
  const jours = Array.from({ length: JOURS }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (JOURS - 1 - i))
    return isoLocal(d)
  })
  const notees = nuits.valeur
  const moyenne = notees.length ? notees.reduce((s, n) => s + n.heures, 0) / notees.length : null
  const courtes = notees.filter((n) => n.heures < 6).length

  return (
    <section className={styles.sommeil}>
      <div className={styles.resume}>
        <div>
          <p className={styles.etiquette}>Moyenne sur 30 jours</p>
          <p className={styles.geant}>
            {moyenne !== null ? `${nombre(Math.round(moyenne * 10) / 10)} h` : '—'}
          </p>
        </div>
        <div>
          <p className={styles.etiquette}>Nuits notées</p>
          <p className={styles.moyen}>{notees.length}</p>
        </div>
        <div>
          <p className={styles.etiquette}>Nuits de moins de 6 h</p>
          <p className={styles.moyen}>{courtes}</p>
        </div>
      </div>

      <div className={styles.graphique} role="img" aria-label="Heures de sommeil des 30 dernières nuits">
        <span className={styles.repere} style={{ bottom: `${(7 / MAX_H) * 100}%` }} data-libelle="7 h" />
        <span
          className={`${styles.repere} ${styles.alerte}`}
          style={{ bottom: `${(6 / MAX_H) * 100}%` }}
          data-libelle="6 h"
        />
        {jours.map((jour, i) => {
          const nuit = parJour.get(jour)
          return (
            <div
              key={jour}
              className={styles.colonne}
              title={nuit ? `${nombre(nuit.heures)} h` : 'Pas notée'}
            >
              <motion.span
                className={styles.barre}
                data-courte={nuit && nuit.heures < 6 ? true : undefined}
                data-vide={!nuit || undefined}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.02, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: `${nuit ? Math.min(100, (nuit.heures / MAX_H) * 100) : 4}%` }}
              />
              <span className={styles.jour}>{i % 3 === 2 ? JOUR.format(depuisIso(jour)) : ''}</span>
            </div>
          )
        })}
      </div>
      <p className={styles.note}>
        Une nuit de moins de 6 h allège la séance du lendemain ; moins de 4 h, pas de tentative de max.
      </p>
    </section>
  )
}
