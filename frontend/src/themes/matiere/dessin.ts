import { chaleurDeLaBande, couleurDeRevenu, nombreDeFranges, type ParametresMatiere } from './modele'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Où sont les quatre plaques, en croix sur la dalle, nord en haut. Le centre reste nu. */
export function disposition(w: number, h: number): Record<'haut' | 'gauche' | 'droite' | 'bas', Rect> {
  return {
    haut: { x: w * 0.3, y: h * 0.035, w: w * 0.4, h: h * 0.2 },
    bas: { x: w * 0.3, y: h * 0.765, w: w * 0.4, h: h * 0.2 },
    gauche: { x: w * 0.035, y: h * 0.26, w: w * 0.24, h: h * 0.48 },
    droite: { x: w * 0.725, y: h * 0.26, w: w * 0.24, h: h * 0.48 },
  }
}

/** Un hasard reproductible : la même plaque a toujours le même grain. */
function hasard(graine: number) {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function plaque(ctx: CanvasRenderingContext2D, r: Rect, dessiner: () => void) {
  const rayon = 10
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(r.x, r.y, r.w, r.h, rayon)
  ctx.clip()
  dessiner()
  ctx.restore()
  // Un liseré de lumière en haut et une ombre portée dessous : la plaque est incrustée dans la dalle.
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(r.x, r.y, r.w, r.h, rayon)
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

function acier(ctx: CanvasRenderingContext2D, r: Rect, p: ParametresMatiere['bandes']) {
  const fond = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h)
  fond.addColorStop(0, '#9a9da2')
  fond.addColorStop(0.5, '#74777c')
  fond.addColorStop(1, '#8a8d92')
  ctx.fillStyle = fond
  ctx.fillRect(r.x, r.y, r.w, r.h)

  // Le grain brossé : des milliers de traits fins, tous dans le même sens.
  const hz = hasard(7)
  for (let y = r.y; y < r.y + r.h; y += 1.6) {
    ctx.fillStyle = hz() > 0.5 ? `rgba(255,255,255,${hz() * 0.14})` : `rgba(0,0,0,${hz() * 0.12})`
    ctx.fillRect(r.x, y, r.w, 1)
  }

  // Quatre bandes polies, une par séance du bloc : plus l'effort est haut, plus elles revenent au bleu.
  const total = Math.max(1, p.total || 4)
  const bande = r.h / total
  for (let b = 0; b < total; b++) {
    const y = r.y + b * bande
    if (b < p.faites) {
      const chaleur = chaleurDeLaBande(p.rpe, b, total)
      const poli = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0)
      poli.addColorStop(0, 'rgba(255,255,255,0.05)')
      poli.addColorStop(
        0.4,
        couleurDeRevenu(chaleur * 0.6)
          .replace('rgb(', 'rgba(')
          .replace(')', ' / 0.55)'),
      )
      poli.addColorStop(1, couleurDeRevenu(chaleur).replace('rgb(', 'rgba(').replace(')', ' / 0.8)'))
      ctx.fillStyle = poli
      ctx.fillRect(r.x, y + 2, r.w, bande - 4)
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(r.x, y + 2, r.w, 1)
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(r.x, y + 2, r.w, bande - 4)
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(r.x, y, r.w, 1)
  }
}

function sable(ctx: CanvasRenderingContext2D, r: Rect, m: ParametresMatiere['mer'], t: number) {
  const fond = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h)
  fond.addColorStop(0, '#d6c397')
  fond.addColorStop(1, '#bda673')
  ctx.fillStyle = fond
  ctx.fillRect(r.x, r.y, r.w, r.h)

  // Les rides du sable : des ondulations fines, fixes.
  ctx.lineWidth = 1
  for (let y = r.y + 6; y < r.y + r.h; y += 7) {
    ctx.strokeStyle = 'rgba(90,68,30,0.18)'
    ctx.beginPath()
    for (let x = r.x; x <= r.x + r.w; x += 6) {
      const yy = y + Math.sin(x * 0.045 + y * 0.3) * 1.6
      if (x === r.x) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }

  // L'eau arrive par le bord extérieur et avance vers le centre jusqu'à la pleine mer.
  const niveau = m.maree ?? 0.35
  const bord = r.x + r.w - niveau * r.w
  const noir = m.niveau === 'noir'
  const eau = ctx.createLinearGradient(bord, 0, r.x + r.w, 0)
  eau.addColorStop(0, noir ? '#10151b' : '#6a99a8')
  eau.addColorStop(1, noir ? '#05080b' : '#2f5f78')
  ctx.fillStyle = eau
  ctx.beginPath()
  const temps = noir ? 0 : t
  for (let y = r.y; y <= r.y + r.h; y += 4) {
    const x = bord + Math.sin(y * 0.05 + temps * 0.9) * 3
    if (y === r.y) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.lineTo(r.x + r.w, r.y + r.h)
  ctx.lineTo(r.x + r.w, r.y)
  ctx.closePath()
  ctx.fill()

  // Le clapot : des traits courts, penchés dans le sens du vent, plus nombreux quand il souffle.
  if (!noir) {
    const pente = Math.sin(((m.directionDeg + 180) * Math.PI) / 180) * 0.5
    const n = 40 + Math.min(60, m.ventKmh * 2)
    const hz = hasard(11)
    ctx.strokeStyle = 'rgba(255,255,255,0.32)'
    for (let i = 0; i < n; i++) {
      const x = bord + 6 + hz() * (r.x + r.w - bord - 6)
      const y = r.y + hz() * r.h
      const d = (Math.sin(t * 1.2 + i) * 0.5 + 0.5) * 7 + 3
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - d, y + d * pente)
      ctx.stroke()
    }
  }

  // L'écume le long du bord de l'eau.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let y = r.y; y <= r.y + r.h; y += 4) {
    const x = bord + Math.sin(y * 0.05 + temps * 0.9) * 3
    if (y === r.y) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Au rouge, un front sombre entre par le bord ; au noir, tout est déjà sombre.
  if (m.niveau === 'rouge') {
    const front = ctx.createLinearGradient(r.x + r.w, 0, r.x + r.w * 0.45, 0)
    front.addColorStop(0, 'rgba(10,14,20,0.62)')
    front.addColorStop(1, 'rgba(10,14,20,0)')
    ctx.fillStyle = front
    ctx.fillRect(r.x, r.y, r.w, r.h)
  }
}

function albatre(ctx: CanvasRenderingContext2D, r: Rect, recuperation: number) {
  const base = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h)
  base.addColorStop(0, '#ebe6d7')
  base.addColorStop(1, '#cdc5b0')
  ctx.fillStyle = base
  ctx.fillRect(r.x, r.y, r.w, r.h)

  // Les veines de la pierre.
  const hz = hasard(3)
  ctx.lineWidth = 1
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = `rgba(150,120,80,${0.08 + hz() * 0.12})`
    ctx.beginPath()
    const y0 = r.y + hz() * r.h
    ctx.moveTo(r.x, y0)
    for (let x = r.x; x <= r.x + r.w; x += 10) {
      ctx.lineTo(x, y0 + Math.sin(x * 0.02 + i * 2) * 10 + Math.sin(x * 0.07 + i) * 3)
    }
    ctx.stroke()
  }

  // La lumière du jour traverse la pierre : sa part dit la récupération.
  const jour = ctx.createRadialGradient(
    r.x + r.w / 2,
    r.y + r.h / 2,
    4,
    r.x + r.w / 2,
    r.y + r.h / 2,
    r.w * 0.55,
  )
  jour.addColorStop(0, `rgba(255,246,220,${0.15 + recuperation * 0.85})`)
  jour.addColorStop(1, 'rgba(255,246,220,0)')
  ctx.fillStyle = jour
  ctx.fillRect(r.x, r.y, r.w, r.h)

  // Peu de récupération : la pierre s'éteint.
  ctx.fillStyle = `rgba(24,22,26,${(1 - recuperation) * 0.5})`
  ctx.fillRect(r.x, r.y, r.w, r.h)
}

const FRANGES = ['#e6a5c2', '#8fd0a3', '#8fa8e0'] as const

function polymere(ctx: CanvasRenderingContext2D, r: Rect, objectifs: number[]) {
  ctx.fillStyle = '#1d1a22'
  ctx.fillRect(r.x, r.y, r.w, r.h)
  // La lumière polarisée : un fond froid et uniforme.
  const polar = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h)
  polar.addColorStop(0, 'rgba(120,130,160,0.35)')
  polar.addColorStop(1, 'rgba(60,64,90,0.2)')
  ctx.fillStyle = polar
  ctx.fillRect(r.x, r.y, r.w, r.h)

  const eprouvettes = objectifs.length > 0 ? objectifs : [0]
  const largeur = r.w / 3
  eprouvettes.forEach((progression, i) => {
    const cx = r.x + largeur * i + largeur / 2
    const cy = r.y + r.h / 2
    const n = nombreDeFranges(progression)
    // Les franges de contrainte autour du trou : elles se resserrent avec la progression.
    for (let k = n; k >= 1; k--) {
      const rayon = 8 + k * (r.h * 0.045)
      ctx.strokeStyle = FRANGES[k % FRANGES.length] ?? '#fff'
      ctx.globalAlpha = 0.6
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(cx, cy, rayon * 1.25, rayon, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = '#0c0b0f'
    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.fill()
    // À 100 %, l'éprouvette est verrouillée : un cadre net.
    if (progression >= 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 2
      ctx.strokeRect(cx - largeur / 2 + 6, r.y + 6, largeur - 12, r.h - 12)
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1
      ctx.strokeRect(cx - largeur / 2 + 6, r.y + 6, largeur - 12, r.h - 12)
    }
  })
}

export function dessiner(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ParametresMatiere,
  t: number,
) {
  ctx.clearRect(0, 0, w, h)
  const d = disposition(w, h)
  plaque(ctx, d.gauche, () => acier(ctx, d.gauche, p.bandes))
  plaque(ctx, d.droite, () => sable(ctx, d.droite, p.mer, t))
  plaque(ctx, d.haut, () => albatre(ctx, d.haut, p.recuperation))
  plaque(ctx, d.bas, () => polymere(ctx, d.bas, p.objectifs))
}
