interface Props {
  valeurs: readonly number[]
  largeur?: number
  hauteur?: number
}

/** Une miniature : la forme d'une grandeur, pour la comparer d'un coup d'œil. Prend la couleur du texte. */
export function Etincelle({ valeurs, largeur = 120, hauteur = 34 }: Props) {
  if (valeurs.length < 2)
    return <svg viewBox={`0 0 ${largeur} ${hauteur}`} width={largeur} height={hauteur} aria-hidden="true" />
  const [min, max] = [Math.min(...valeurs), Math.max(...valeurs)]
  const ecart = max - min || 1
  const chemin = valeurs
    .map((v, i) => {
      const x = 2 + (i / (valeurs.length - 1)) * (largeur - 4)
      const y = hauteur - 4 - ((v - min) / ecart) * (hauteur - 8)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${largeur} ${hauteur}`} width={largeur} height={hauteur} aria-hidden="true">
      <path d={chemin} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
