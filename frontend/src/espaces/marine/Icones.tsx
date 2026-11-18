import { type Ciel, lireCodeMeteo } from './lecture'

/**
 * Icônes de ciel, dessinées au trait (plutôt que des emojis, qui changent
 * d'un système à l'autre). Elles prennent la couleur du texte.
 */
export function IconeMeteo({ code, taille = 28 }: { code: number | null | undefined; taille?: number }) {
  const { ciel, libelle } = lireCodeMeteo(code)
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={libelle}
    >
      <title>{libelle}</title>
      {DESSINS[ciel]}
    </svg>
  )
}

const SOLEIL = (
  <>
    <circle cx="16" cy="16" r="5.5" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <line
        key={a}
        x1={16 + 9 * Math.cos((a * Math.PI) / 180)}
        y1={16 + 9 * Math.sin((a * Math.PI) / 180)}
        x2={16 + 12 * Math.cos((a * Math.PI) / 180)}
        y2={16 + 12 * Math.sin((a * Math.PI) / 180)}
      />
    ))}
  </>
)
const NUAGE = <path d="M9 23h14a5 5 0 0 0 0-10 7 7 0 0 0-13.4 1.6A4.2 4.2 0 0 0 9 23z" />
const NUAGE_HAUT = <path d="M9 19h14a5 5 0 0 0 0-10 7 7 0 0 0-13.4 1.6A4.2 4.2 0 0 0 9 19z" />
const gouttes = (n: number) =>
  Array.from({ length: n }, (_, i) => <line key={i} x1={11 + i * 5} y1="23" x2={9.5 + i * 5} y2="27" />)

const DESSINS: Record<Ciel, React.ReactNode> = {
  clair: SOLEIL,
  voile: (
    <>
      <circle cx="11" cy="11" r="4" />
      <line x1="11" y1="3" x2="11" y2="4.5" />
      <line x1="3" y1="11" x2="4.5" y2="11" />
      <line x1="5.3" y1="5.3" x2="6.4" y2="6.4" />
      <path d="M12 26h12a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4 1.4A3.8 3.8 0 0 0 12 26z" />
    </>
  ),
  nuageux: NUAGE,
  brouillard: (
    <>
      {NUAGE_HAUT}
      <line x1="7" y1="23" x2="25" y2="23" />
      <line x1="9" y1="27" x2="23" y2="27" />
    </>
  ),
  bruine: (
    <>
      {NUAGE_HAUT}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={11 + i * 5} cy={25 + (i % 2) * 2} r="0.6" fill="currentColor" />
      ))}
    </>
  ),
  pluie: (
    <>
      {NUAGE_HAUT}
      {gouttes(3)}
    </>
  ),
  neige: (
    <>
      {NUAGE_HAUT}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${11 + i * 5} 23v4m-1.7-1 3.4-2m-3.4 0 3.4 2`} />
      ))}
    </>
  ),
  averses: (
    <>
      <circle cx="23" cy="8" r="3" />
      {NUAGE_HAUT}
      {gouttes(2)}
    </>
  ),
  orage: (
    <>
      {NUAGE_HAUT}
      <path d="M17 20l-3 5h4l-2 5" />
    </>
  ),
}

/**
 * Flèche de direction. Les vents et les vagues se disent « d'où ils viennent »
 * (convention météo) : la flèche pointe vers où ils vont, d'où le demi-tour.
 */
export function Fleche({
  degres,
  provenance = true,
  taille = 22,
}: {
  degres: number | null | undefined
  provenance?: boolean
  taille?: number
}) {
  if (degres === null || degres === undefined) return null
  const rotation = provenance ? degres + 180 : degres
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ rotate: `${rotation}deg`, transition: 'rotate 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <path d="M12 3l5 9h-3.5v9h-3v-9H7z" fill="currentColor" />
    </svg>
  )
}
