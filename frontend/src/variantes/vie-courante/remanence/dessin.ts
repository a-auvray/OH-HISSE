import type { Instant } from './Toile'
import {
  allumage,
  avancementColonne,
  avancementFantome,
  avecAlpha,
  BANDE_BASSE,
  type EmpreinteAffichee,
  type EncresMur,
  flouDuBord,
  geometrieChamp,
  MARGE_HAUTE,
  opaciteDeLAge,
  ordonneeDeDuree,
  type PalierSouffle,
  type PhaseAnimation,
  rectangleDeNuit,
  souffle,
} from './modele'

/*
 * Le dessin du mur : des rectangles de lumière sur une ligne de sol. Le mur lui-même (sa matière, sa
 * teinte) est en CSS ; le canvas ne trace que la lumière, avec les couleurs lues sur le thème courant.
 */

export interface ParametresChamp {
  empreintes: readonly EmpreinteAffichee[]
  /** Durée moyenne de la semaine, pour la ligne fantôme ; null s'il n'y a aucune nuit notée. */
  moyenne: number | null
  /** Rang de l'empreinte survolée ou au focus, ou null. */
  survol: number | null
  /** Intensité lissée du survol de chaque empreinte (état du dessin, entre deux images). */
  lissees: number[]
}

const RAYON = 6

function rectangleArrondi(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, h: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, l, h, Math.min(RAYON, l / 2, Math.max(0, h) / 2))
}

function tracerSol(
  ctx: CanvasRenderingContext2D,
  largeur: number,
  y: number,
  encres: EncresMur,
  marge: number,
) {
  ctx.save()
  ctx.lineWidth = 1
  ctx.strokeStyle = avecAlpha(encres.lumiere, 0.4)
  ctx.beginPath()
  ctx.moveTo(marge, Math.round(y) + 0.5)
  ctx.lineTo(largeur - marge, Math.round(y) + 0.5)
  ctx.stroke()
  ctx.restore()
}

/** Les sept empreintes, la ligne des 8 h et la moyenne fantôme, sur la ligne de sol. */
export function dessinerChamp(
  ctx: CanvasRenderingContext2D,
  largeur: number,
  hauteur: number,
  instant: Instant,
  p: ParametresChamp,
  encres: EncresMur,
  niveau: PhaseAnimation,
) {
  const g = geometrieChamp(largeur, hauteur, p.empreintes.length)
  const lisseur = instant.dt === 0 ? 1 : 1 - Math.exp(-instant.dt / 0.07)

  // La ligne des 8 h : un tiret de 1 px, légendé en HTML (« huit heures »).
  ctx.save()
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.strokeStyle = avecAlpha(encres.lumiere, 0.3)
  const huit = Math.round(ordonneeDeDuree(g, 8)) + 0.5
  ctx.beginPath()
  ctx.moveTo(g.marge, huit)
  ctx.lineTo(largeur - g.marge, huit)
  ctx.stroke()
  ctx.restore()

  tracerSol(ctx, largeur, g.sol, encres, g.marge)

  p.empreintes.forEach((e, i) => {
    const cible = p.survol === null || p.survol === i ? 1 : 0.7
    const courante = p.lissees[i] ?? 1
    const lisse = courante + (cible - courante) * lisseur
    p.lissees[i] = lisse
    const x = g.marge + g.creneau * i + (g.creneau - g.largeurEmpreinte) / 2

    if (e.heures === null) {
      // Une nuit non notée : un tiret posé sur le sol, pour que le créneau ne se perde pas.
      ctx.save()
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = avecAlpha(encres.lumiere, 0.3 * lisse)
      ctx.beginPath()
      ctx.moveTo(x, g.sol - 5)
      ctx.lineTo(x + g.largeurEmpreinte, g.sol - 5)
      ctx.stroke()
      ctx.restore()
      return
    }

    const allume = allumage(instant.ecoule, i, niveau)
    if (allume <= 0) return
    const r = rectangleDeNuit(g, i, e.heures)
    const hauteurAllumee = r.hauteur * (0.9 + 0.1 * allume)
    const y = g.sol - hauteurAllumee
    // La plus ancienne reste lisible : l'opacité baisse avec l'âge mais jamais sous 0,4.
    const alpha = opaciteDeLAge(e.age) * allume * lisse
    ctx.save()
    if (e.provisoire) {
      // L'empreinte du jour avant impression : un contour en tirets, à peine rempli.
      ctx.setLineDash([6, 4])
      ctx.fillStyle = avecAlpha(encres.lumiere, 0.12 * allume)
      rectangleArrondi(ctx, r.x, y, r.largeur, hauteurAllumee)
      ctx.fill()
      ctx.strokeStyle = avecAlpha(encres.lumiere, 0.85 * allume)
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else {
      const flou = flouDuBord(e.ressenti)
      const degrade = ctx.createLinearGradient(0, y, 0, g.sol)
      degrade.addColorStop(0, avecAlpha(encres.lumiere, alpha))
      degrade.addColorStop(1, avecAlpha(encres.lumiere, alpha * 0.7))
      ctx.fillStyle = degrade
      if (flou > 0) {
        ctx.shadowColor = avecAlpha(encres.lumiere, alpha * 0.8)
        ctx.shadowBlur = flou
      }
      rectangleArrondi(ctx, r.x, y, r.largeur, hauteurAllumee)
      ctx.fill()
      if (flou === 0) {
        // Un bord net : un trait de 1 px le durcit, comme une nuit qui n'a pas pardonné.
        ctx.shadowBlur = 0
        ctx.strokeStyle = avecAlpha(encres.lumiere, Math.min(1, alpha + 0.1))
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
    ctx.restore()
  })

  // La moyenne de la semaine : un contour fantôme de 1 px, tracé de gauche à droite après l'allumage.
  if (p.moyenne !== null) {
    const trace = avancementFantome(instant.ecoule, niveau)
    if (trace > 0) {
      const y = Math.round(ordonneeDeDuree(g, p.moyenne)) + 0.5
      ctx.save()
      ctx.lineWidth = 1
      ctx.strokeStyle = avecAlpha(encres.lumiere, 0.55)
      ctx.beginPath()
      ctx.moveTo(g.marge, y)
      ctx.lineTo(g.marge + (largeur - 2 * g.marge) * trace, y)
      ctx.stroke()
      ctx.restore()
    }
  }
}

export interface ParametresColonne {
  /** Part récupérée, de 0 à 1. */
  progression: number
  palier: PalierSouffle
}

/** La colonne de récupération : elle se remplit de lumière par le bas, son bord haut respire. */
export function dessinerColonne(
  ctx: CanvasRenderingContext2D,
  largeur: number,
  hauteur: number,
  instant: Instant,
  p: ParametresColonne,
  encres: EncresMur,
  niveau: PhaseAnimation,
) {
  const sol = Math.max(MARGE_HAUTE + 40, hauteur - BANDE_BASSE)
  const marge = 14
  const l = Math.min(88, Math.max(8, largeur - 2 * marge))
  const x = (largeur - l) / 2
  const haut = MARGE_HAUTE
  const h = sol - haut
  const progression = Math.min(1, Math.max(0, p.progression))

  tracerSol(ctx, largeur, sol, encres, marge)

  // Graduations tous les quarts : la colonne se lit comme une règle.
  ctx.save()
  ctx.strokeStyle = avecAlpha(encres.lumiere, 0.3)
  ctx.lineWidth = 1
  for (const quart of [0.25, 0.5, 0.75]) {
    const y = Math.round(sol - h * quart) + 0.5
    ctx.beginPath()
    ctx.moveTo(x - 6, y)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  ctx.restore()

  // Le contenant.
  ctx.save()
  ctx.strokeStyle = avecAlpha(encres.lumiere, 0.4)
  ctx.lineWidth = 1
  rectangleArrondi(ctx, x + 0.5, haut + 0.5, l - 1, h - 1)
  ctx.stroke()
  ctx.restore()

  // La lumière : de la progression réelle, jamais plus ; son bord haut respire autour de cette valeur.
  const remplie = h * progression * avancementColonne(instant.ecoule, niveau)
  if (remplie <= 0.5) return
  const respiration = niveau === 'immobile' ? 0 : souffle(p.palier, instant.temps) * h
  const niveauY = Math.min(sol, Math.max(haut, sol - remplie - respiration))
  ctx.save()
  rectangleArrondi(ctx, x + 0.5, haut + 0.5, l - 1, h - 1)
  ctx.clip()
  const degrade = ctx.createLinearGradient(0, niveauY, 0, sol)
  degrade.addColorStop(0, avecAlpha(encres.lumiere, 0.95))
  degrade.addColorStop(1, avecAlpha(encres.lumiere, 0.6))
  ctx.fillStyle = degrade
  ctx.fillRect(x, niveauY, l, sol - niveauY)
  // Un trait vif sur le bord haut : c'est lui qui respire.
  ctx.fillStyle = avecAlpha(encres.lumiere, 1)
  ctx.fillRect(x, niveauY, l, 2)
  ctx.restore()
}
