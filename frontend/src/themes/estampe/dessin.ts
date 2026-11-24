import type { IdEspace } from '../../espaces/espaces'
import { agitation, mouDesCables, type ParametresFils, pasDesStrates } from './modele'

export interface Encres {
  vie: string
  street: string
  mer: string
  objectif: string
  trait: string
}

type Point = readonly [number, number]

function ligne(ctx: CanvasRenderingContext2D, points: readonly Point[]) {
  ctx.beginPath()
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.stroke()
}

/** Une passe d'encre : la ligne en pâle sur toute sa longueur, puis l'encre sur la part dite. */
function fibre(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  part: number,
  encre: string,
  trait: string,
  epaisseur: number,
) {
  ctx.lineWidth = 1
  ctx.strokeStyle = trait
  ligne(ctx, points)
  if (part <= 0) return
  const n = Math.max(2, Math.round(points.length * part))
  ctx.lineWidth = epaisseur
  ctx.strokeStyle = encre
  ligne(ctx, points.slice(0, n))
}

export function dessiner(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ParametresFils,
  heure: number,
  t: number,
  encres: Encres,
  survol: IdEspace | null,
) {
  ctx.clearRect(0, 0, w, h)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const epais = (espace: IdEspace) => (survol === espace ? 2.1 : 1.4)

  // Haut : la vie pousse. Les fibres se tournent vers le soleil, et l'encre monte avec la récupération.
  {
    const n = 64
    const longueur = h * 0.3
    const penche = ((heure - 12) / 12) * 0.35
    for (let i = 0; i < n; i++) {
      const x0 = w * 0.28 + (w * 0.44 * i) / (n - 1)
      const points: Point[] = []
      for (let k = 0; k <= 14; k++) {
        const y = (longueur * k) / 14
        const dx = penche * y + Math.sin(t * 0.7 + i * 0.35 + k * 0.2) * (2 + k * 0.35)
        points.push([x0 + dx, y])
      }
      fibre(ctx, points, p.recuperation, encres.vie, encres.trait, epais('vie-courante'))
    }
  }

  // Gauche : des strates qui adhèrent puis glissent. Une bande par séance du bloc.
  {
    const total = Math.max(1, p.bandes.total || 4)
    const pas = pasDesStrates(p.bandes.rpe)
    const zone = h * 0.38
    const haut = h * 0.31
    const lignes = Math.max(2, Math.floor(zone / total / pas) - 1)
    for (let b = 0; b < total; b++) {
      const encree = b < p.bandes.faites ? 1 : 0
      const y0 = haut + (zone * b) / total
      for (let l = 0; l < lignes; l++) {
        const y = y0 + l * pas
        // Adhérence puis glissement : une dent de scie lente, décalée d'une ligne à l'autre.
        const dent = (t * 0.18 + b * 0.31 + l * 0.07) % 1
        const fin = w * 0.27 + dent * 7
        const points: Point[] = [
          [0, y],
          [fin * 0.5, y],
          [fin, y],
        ]
        fibre(ctx, points, encree, encres.street, encres.trait, epais('streetlifting'))
      }
    }
  }

  // Droite : un écoulement laminaire, orienté par le vent, secoué par les rafales.
  {
    const n = 46
    const noir = p.mer.niveau === 'noir'
    const agite = agitation(p.mer)
    const amplitude = 2 + agite * 16
    const periode = 130 - Math.min(40, p.mer.ventKmh)
    const pente = Math.sin(((p.mer.directionDeg + 180) * Math.PI) / 180) * 0.22
    const temps = noir ? 0 : t
    for (let i = 0; i < n; i++) {
      const y0 = h * 0.31 + (h * 0.38 * i) / (n - 1)
      const points: Point[] = []
      for (let k = 0; k <= 22; k++) {
        const x = w - (w * 0.29 * k) / 22
        const dx = w - x
        const houle = Math.sin((dx / periode) * Math.PI * 2 - temps * 1.1 + i * 0.12) * amplitude
        const trouble =
          p.mer.niveau === 'rouge'
            ? Math.sin(dx * 0.09 + temps * 2.3 + i * 1.7) * agite * 7 +
              Math.sin(dx * 0.23 - temps * 3.1 + i) * agite * 3
            : 0
        points.push([x, y0 + houle + trouble + dx * pente])
      }
      fibre(ctx, points, 1, noir ? encres.trait : encres.mer, encres.trait, epais('marine'))
    }
  }

  // Bas : une drisse. Des câbles tendus vers le centre, qui perdent leur mou avec la progression.
  {
    const n = 26
    const mou = mouDesCables(p.objectif)
    const ancre = h * 0.7
    for (let i = 0; i < n; i++) {
      const x0 = w * 0.3 + (w * 0.4 * i) / (n - 1)
      const x1 = w * 0.47 + (w * 0.06 * i) / (n - 1)
      const points: Point[] = []
      for (let k = 0; k <= 16; k++) {
        const u = k / 16
        const sag = Math.sin(u * Math.PI) * (h * 0.07 * mou) * (1 + Math.sin(t * 0.8 + i) * 0.08)
        points.push([x0 + (x1 - x0) * u, h - (h - ancre) * u + sag])
      }
      fibre(ctx, points, 1, encres.objectif, encres.trait, epais('objectifs'))
    }
  }
}
