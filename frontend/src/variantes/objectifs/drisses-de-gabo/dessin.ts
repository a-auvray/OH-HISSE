import {
  bornesVerticales,
  eclairage,
  extremites,
  lacetVerrouille,
  largeurOuverte,
  NOMBRE_DE_FILS,
  type Point3,
  projeter,
  surFil,
  TANGAGE,
  torsion,
} from './modele'

/** Les couleurs du thème courant, lues sur l'élément au moment de dessiner (jamais à l'import). */
export interface Encres {
  /** La partie hissée des fils. */
  hisse: string
  /** Un fil encore dans l'ombre, et les barres. */
  ombre: string
  /** Le reflet étroit d'un fil mat, et la ligne unique du verrouillage. */
  corde: string
  /** La pince. */
  pince: string
}

export function lireEncres(element: Element): Encres {
  const style = getComputedStyle(element)
  const lire = (nom: string, defaut: string) => style.getPropertyValue(nom).trim() || defaut
  return {
    hisse: lire('--accent-clair', '#b9a2ff'),
    ombre: lire('--texte-doux', '#8a80a3'),
    corde: lire('--texte', '#f4f0ff'),
    pince: lire('--accent', '#7a4dff'),
  }
}

/** Ce qu'on voit à un instant : tout est dans ces nombres, donc une image fixe se redessine à l'identique. */
export interface EtatSculpture {
  /** Progression, de 0 à 1 : la torsion vaut 90° × (1 − p) et la lumière descend avec elle. */
  p: number
  /** Les fils s'ouvrent, de 0 (une ligne) à 1. */
  ouverture: number
  /** 0 : vue de biais ; 1 : le ruban plan est vu par la tranche, les 96 fils n'en font plus qu'un. */
  verrou: number
  /** Atténue l'ensemble : un objectif détendu est éteint. */
  luminosite: number
  /** Montre la pince (la ligne qui serre tous les fils à la hauteur de p). */
  pince: boolean
}

const BORNES = bornesVerticales()
const MARGE = 8

/**
 * La sculpture à la Naum Gabo : 96 fils mats tendus entre une barre au sol et une barre au plafond.
 * Pas de halo ni de bloom : une lumière rasante qui dépend de la hauteur, un reflet fin sur quelques fils.
 * Seuls les fils sous la pince sont éclairés ; au-dessus, ils restent dans l'ombre.
 */
export function dessinerSculpture(
  ctx: CanvasRenderingContext2D,
  largeur: number,
  hauteur: number,
  etat: EtatSculpture,
  encres: Encres,
) {
  ctx.clearRect(0, 0, largeur, hauteur)
  if (largeur <= 0 || hauteur <= 0) return

  const vue = { lacet: lacetVerrouille(etat.verrou), tangage: TANGAGE }
  const fils = extremites(NOMBRE_DE_FILS, torsion(etat.p))
  const etendue = largeurOuverte(etat.ouverture)
  const echelle = Math.min((hauteur - 2 * MARGE) / (BORNES.max - BORNES.min), (largeur / 2 - MARGE) / 0.55)
  const centre = largeur / 2
  const place = (p: Point3): readonly [number, number, number] => {
    const q = projeter(p, vue)
    return [centre + q.x * echelle * etendue, hauteur - MARGE - (q.y - BORNES.min) * echelle, q.profondeur]
  }

  // La pince serre les fils à la hauteur de la progression : au-dessus, ils restent dans l’ombre.
  const pince = etat.p
  const principal = Math.floor(NOMBRE_DE_FILS / 2)
  const verrouille = etat.verrou >= 0.5
  const hisse = verrouille ? encres.corde : encres.hisse
  ctx.lineCap = 'butt'

  const segment = (de: readonly [number, number, number], a: readonly [number, number, number]) => {
    ctx.beginPath()
    ctx.moveTo(de[0], de[1])
    ctx.lineTo(a[0], a[1])
    ctx.stroke()
  }

  fils.forEach((fil, i) => {
    const bas = place(fil.bas)
    const taille = place(surFil(fil, pince))
    const haut = place(fil.haut)
    // Un fil lointain est un peu plus sombre : c'est ce qui donne du volume sans aucun halo.
    const volume = 0.72 + 0.28 * Math.min(1, Math.max(0, 0.5 - (bas[2] + haut[2]) / 2))
    const important = i === principal

    ctx.lineWidth = important ? 2 : 1
    ctx.strokeStyle = hisse
    ctx.globalAlpha = (important ? 1 : eclairage(0, pince, etat.p) * volume) * etat.luminosite
    segment(bas, taille)

    ctx.strokeStyle = encres.ombre
    ctx.lineWidth = 1
    ctx.globalAlpha = eclairage(1, pince, etat.p) * volume * etat.luminosite
    segment(taille, haut)

    // Le reflet : un trait de 1 px sur un fil sur six, comme une laine sous une lumière rasante.
    if (i % 6 === 0 && !verrouille) {
      ctx.strokeStyle = encres.corde
      ctx.lineWidth = 0.6
      ctx.globalAlpha = 0.22 * etat.luminosite
      segment(bas, taille)
    }
  })

  // Les deux barres : celle du sol et celle du plafond.
  const premier = fils[0]!
  const dernier = fils[NOMBRE_DE_FILS - 1]!
  ctx.strokeStyle = encres.ombre
  ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.8 * etat.luminosite
  segment(place(premier.bas), place(dernier.bas))
  segment(place(premier.haut), place(dernier.haut))

  // La pince serre tous les fils à la hauteur de p : la taille de la selle.
  if (etat.pince && etat.p > 0 && !verrouille) {
    ctx.strokeStyle = encres.pince
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.95 * etat.luminosite
    ctx.beginPath()
    fils.forEach((fil, i) => {
      const [x, y] = place(surFil(fil, pince))
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}
