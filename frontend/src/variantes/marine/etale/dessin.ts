import {
  ENCRES,
  type Geometrie,
  opaciteParticule,
  type Particule,
  type Niveau,
  polygoneSable,
  type ProfilEstran,
  rayonParticule,
  trace,
  estClair,
} from './modele'

/** Les couleurs lues sur les jetons du thème, au moment de dessiner (jamais à l'import : le ton peut changer). */
export interface Encres {
  texte: string
  accent: string
  /** Le trait de la surface : l'accent clair sur fond sombre, l'accent sur fond clair. */
  surface: string
  sable: string
  clair: boolean
}

/** Lit les jetons sur un élément du thème courant. `repli` sert quand le fond n'est pas lisible (le ton du thème). */
export function lireEncres(element: Element, repli: { clair: boolean }): Encres {
  const style = getComputedStyle(element)
  const lire = (nom: string, defaut: string) => style.getPropertyValue(nom).trim() || defaut
  const clair = estClair(lire('--fond', '')) ?? repli.clair
  const accent = lire('--accent', clair ? '#1f4e6b' : '#a9c6e8')
  return {
    texte: lire('--texte', clair ? '#141414' : '#eef2f5'),
    accent,
    surface: clair ? accent : lire('--accent-clair', accent),
    sable: clair ? ENCRES.sable.clair : ENCRES.sable.sombre,
    clair,
  }
}

/** Ce que la scène a besoin de savoir à chaque image. */
export interface EtatScene {
  geo: Geometrie
  profil: ProfilEstran | null
  /** Hauteur d'eau, en mètres (déjà lissée). */
  niveau: number
  /** Le sable que la mer vient de laisser, en mètres depuis la digue : il est plus sombre, mouillé. */
  mouille: { de: number; a: number } | null
  houle: { amplitudePx: number; frequenceHz: number }
  /** Vitesse des risées en pixels par seconde : positive vers le large (la droite). */
  risees: number
  /** Vitesse dans la profondeur (z par seconde) des particules du courant. */
  vz: number
  danger: Niveau
  nuit: boolean
}

/** Valeurs qui glissent d'une image à l'autre (400 ms) au lieu de sauter : la turbidité du rouge, la nuit. */
export interface Fondu {
  turbidite: number
  nuit: number
}

export const CIBLE_TURBIDITE: Record<Niveau, number> = { vert: 0, rouge: 0.32, noir: 0.6 }

/** Rapproche `courant` de `cible` : environ 400 ms pour presque tout parcourir. */
export function glisser(courant: number, cible: number, dt: number): number {
  return courant + (cible - courant) * Math.min(1, dt / 0.13)
}

const LONGUEUR_ONDE = 220

/** La surface à l'abscisse `x`, au temps `t` (s) : la houle réelle, plus une harmonique légère. */
export function hauteurSurface(yBase: number, x: number, t: number, houle: EtatScene['houle']): number {
  const k = (2 * Math.PI) / LONGUEUR_ONDE
  const phase = 2 * Math.PI * houle.frequenceHz * t
  return (
    yBase +
    houle.amplitudePx * Math.sin(phase - x * k) +
    houle.amplitudePx * 0.3 * Math.sin(phase * 1.7 - x * k * 2.3 + 1.2)
  )
}

// Les risées : quelques stries fines, à des profondeurs et des phases fixes, qui glissent sur la surface.
const RISEES = Array.from({ length: 9 }, (_, i) => ({
  dy: 5 + ((i * 37) % 23),
  longueur: 22 + ((i * 53) % 34),
  phase: (i * 0.618) % 1,
}))

function tracerPolygone(ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[]) {
  ctx.beginPath()
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.closePath()
}

/**
 * Dessine la coupe : la masse d'eau et sa surface, les particules du courant, puis le sable par-dessus.
 * Le canvas est transparent : l'air au-dessus de la dune reste le fond de la page, là où se lit le verdict.
 * `temps` en secondes ; `particules` est modifié par l'appelant (il les fait avancer).
 */
export function dessiner(
  ctx: CanvasRenderingContext2D,
  e: EtatScene,
  temps: number,
  encres: Encres,
  particules: readonly Particule[],
  fondu: Fondu,
) {
  const { geo } = e
  ctx.clearRect(0, 0, geo.largeur, geo.hauteur)
  const ySurface = geo.y(e.niveau)
  const sable = polygoneSable(geo, e.profil)

  // Sans hauteur d'eau connue (niveau infini), seul le sable est dessiné.
  if (Number.isFinite(ySurface)) {
    // Tout ce qui est de l'eau est découpé hors du sable : la masse d'eau n'existe qu'au-dessus du profil.
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, geo.largeur, geo.hauteur)
    sable.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.closePath()
    ctx.clip('evenodd')

    // La masse d'eau : transparente en surface, de plus en plus dense en profondeur (trois voiles superposés).
    ctx.fillStyle = encres.accent
    ctx.globalAlpha = 0.16
    ctx.beginPath()
    ctx.moveTo(geo.gauche, geo.bas)
    for (let x = geo.gauche; x <= geo.droite; x += 6)
      ctx.lineTo(x, hauteurSurface(ySurface, x, temps, e.houle))
    ctx.lineTo(geo.droite, geo.bas)
    ctx.closePath()
    ctx.fill()
    for (const part of [0.35, 0.7]) {
      const y0 = ySurface + (geo.bas - ySurface) * part
      ctx.globalAlpha = 0.11
      ctx.fillRect(geo.gauche, y0, geo.droite - geo.gauche, geo.bas - y0)
    }

    // La turbidité du danger rouge ou noir (limon), et la teinte de la nuit.
    if (fondu.turbidite > 0.005) {
      ctx.globalAlpha = fondu.turbidite
      ctx.fillStyle = ENCRES.limon
      ctx.fillRect(geo.gauche, ySurface, geo.droite - geo.gauche, geo.bas - ySurface)
    }
    if (fondu.nuit > 0.005) {
      ctx.globalAlpha = fondu.nuit * 0.4
      ctx.fillStyle = ENCRES.nuit
      ctx.fillRect(geo.gauche, ySurface, geo.droite - geo.gauche, geo.bas - ySurface)
    }
    ctx.globalAlpha = 1

    // Les risées : de fines stries qui filent vers le large (la droite) par vent de terre, vers la plage sinon.
    if (Math.abs(e.risees) > 1) {
      const largeurPlan = geo.droite - geo.gauche
      ctx.strokeStyle = encres.surface
      ctx.lineWidth = 1
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.45
      for (const r of RISEES) {
        const decalage =
          (((r.phase * largeurPlan + e.risees * temps) % largeurPlan) + largeurPlan) % largeurPlan
        const x = geo.gauche + decalage
        const y = hauteurSurface(ySurface, x, temps, e.houle) + r.dy
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(Math.min(geo.droite, x + r.longueur), y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // Les particules du courant : plus petites et plus pâles quand elles s'éloignent dans la profondeur.
    ctx.fillStyle = encres.texte
    const profondeur = Math.max(1, geo.bas - ySurface - 26)
    for (const p of particules) {
      const opacite = opaciteParticule(p.z)
      if (opacite <= 0.01) continue
      ctx.globalAlpha = opacite * 0.7
      ctx.beginPath()
      ctx.arc(
        geo.gauche + p.x * (geo.droite - geo.gauche),
        ySurface + 14 + p.y * profondeur,
        rayonParticule(p.z),
        0,
        6.2832,
      )
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // La surface, vue de dessous : un trait fin qui ondule.
    ctx.strokeStyle = encres.surface
    ctx.lineWidth = 1.6
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let x = geo.gauche; x <= geo.droite; x += 4) {
      const y = hauteurSurface(ySurface, x, temps, e.houle)
      if (x === geo.gauche) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  }

  // Le sable : un aplat translucide, plus sombre là où la mer vient de se retirer, et son profil en trait.
  ctx.save()
  tracerPolygone(ctx, sable)
  ctx.globalAlpha = 0.34
  ctx.fillStyle = encres.sable
  ctx.fill()
  ctx.globalAlpha = 1
  if (e.profil) {
    if (e.mouille) {
      ctx.save()
      tracerPolygone(ctx, sable)
      ctx.clip()
      ctx.globalAlpha = encres.clair ? 0.22 : 0.3
      ctx.fillStyle = encres.texte
      ctx.fillRect(
        geo.x(e.mouille.de),
        geo.haut,
        geo.x(e.mouille.a) - geo.x(e.mouille.de),
        geo.bas - geo.haut,
      )
      ctx.restore()
    }
    const { mesure, prolonge } = trace(geo, e.profil)
    ctx.strokeStyle = encres.sable
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    mesure.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
    // Au-delà du dernier relevé, la pente est prolongée : en pointillés, parce que ce n'est plus une mesure.
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    prolonge.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()
}
