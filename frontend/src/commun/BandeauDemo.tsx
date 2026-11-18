import { useSession, type Utilisateur } from '../session/contexte'
import styles from './BandeauDemo.module.css'

function tempsRestant(expireLe: string | null | undefined): string {
  if (!expireLe) return ''
  const heures = Math.max(0, Math.round((new Date(expireLe).getTime() - Date.now()) / 3_600_000))
  return heures >= 1 ? `encore ${heures} h` : 'moins d’une heure'
}

/** Rappelle discrètement au visiteur qu'il est dans un bac à sable. */
export function BandeauDemo({ utilisateur }: { utilisateur: Utilisateur }) {
  const { seDeconnecter } = useSession()

  return (
    <div className={styles.bandeau} role="note">
      <span className={styles.pastille}>Démo</span>
      <span>Données fictives · {tempsRestant(utilisateur.expire_le)} · tout est effacé ensuite</span>
      <button type="button" className={styles.quitter} onClick={() => void seDeconnecter()}>
        Quitter la démo
      </button>
    </div>
  )
}
