import styles from './Badge.module.css'
import { NOM_STATUT_COURT, signeEntier, type Statut } from './modele'

/**
 * Le badge de statut, comme une bande de contrôle d'imprimerie : un rectangle droit à filet double,
 * en mono. Chaque statut a une forme à lui en plus de sa couleur (croix, flèche, fond plein, barré) :
 * on ne les distingue jamais à la seule teinte.
 */
export function Badge({ statut, jours }: { statut: Statut; jours?: number | null }) {
  const ecart = jours !== null && jours !== undefined && jours !== 0 ? ` ${signeEntier(jours)} j` : ''
  return (
    <span className={styles.badge} data-statut={statut}>
      <svg className={styles.icone} viewBox="0 0 14 14" aria-hidden="true" focusable="false">
        <Icone statut={statut} />
      </svg>
      <span className={styles.libelle}>{NOM_STATUT_COURT[statut]}</span>
      {ecart && statut !== 'atteint' && statut !== 'abandonne' && <span>{ecart}</span>}
    </span>
  )
}

function Icone({ statut }: { statut: Statut }) {
  switch (statut) {
    case 'dans-les-temps':
      return <path d="M7 1v12M1 7h12" />
    case 'en-avance':
      return <path d="M7 13V2M2.5 6.5L7 2l4.5 4.5" />
    case 'en-retard':
      return <path d="M7 1v11M2.5 7.5L7 12l4.5-4.5" />
    case 'cible-atteinte':
    case 'atteint':
      return (
        <>
          <path d="M7 1v12M1 7h12" />
          <circle cx="7" cy="7" r="3" className={styles.plein} />
        </>
      )
    case 'abandonne':
      return <path d="M2 12L12 2" />
    case 'sans-estimation':
      return <circle cx="7" cy="7" r="4" strokeDasharray="2 2" />
  }
}
