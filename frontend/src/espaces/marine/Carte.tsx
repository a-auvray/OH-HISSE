import 'maplibre-gl/dist/maplibre-gl.css'

import type { FeatureCollection } from 'geojson'
import {
  type GeoJSONSource,
  Map as CarteMapLibre,
  type MapMouseEvent,
  Marker,
  NavigationControl,
  Popup,
} from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { api } from '../../api/client'
import type { Conditions, Spot } from '../../api/types'
import { nombre } from '../../commun/format'
import styles from './Carte.module.css'
import { distance, formaterDistance, longueur, type Point } from './geo'
import { pointCardinal } from './lecture'

const STYLE = 'https://tiles.openfreemap.org/styles/dark'
const CENTRE: Point = [-0.29, 49.305]
// Bande côtière d'une vingtaine de kilomètres autour de mes plages.
const LIMITES: [Point, Point] = [
  [-0.46, 49.24],
  [-0.12, 49.38],
]
const MER: Point = [-0.29, 49.33]
// Points au large où l'on dessine le courant.
const POINTS_COURANT: Point[] = [
  [-0.36, 49.318],
  [-0.29, 49.322],
  [-0.22, 49.318],
  [-0.33, 49.345],
  [-0.25, 49.345],
]
const PALETTE = {
  terre: '#0d1216',
  eau: '#0a2a46',
  eauTrait: '#1d4b74',
  texteEau: '#7fb2d9',
}

type ConditionsParSpot = Record<number, Conditions>

/** Carte de la côte (note 04) : spots, mer, vent et courant, tracé d'une nage. */
export function Carte({ spots }: { spots: Spot[] }) {
  const conteneur = useRef<HTMLDivElement>(null)
  const voile = useRef<HTMLCanvasElement>(null)
  const carte = useRef<CarteMapLibre | null>(null)
  const [conditions, setConditions] = useState<ConditionsParSpot>({})
  const [enTrace, setEnTrace] = useState(false)
  const [trace, setTrace] = useState<Point[]>([])
  // Le gestionnaire de clic de la carte est créé une fois : il lit le mode via une ref.
  const enTraceRef = useRef(enTrace)
  useEffect(() => {
    enTraceRef.current = enTrace
  }, [enTrace])
  const naviguer = useNavigate()

  // Conditions de chaque spot (le serveur les garde en cache).
  useEffect(() => {
    let actif = true
    Promise.all(
      spots.map((s) =>
        api
          .GET('/api/marine/conditions', { params: { query: { spot_id: s.id } } })
          .then((r) => [s.id, r.data] as const),
      ),
    ).then((paires) => {
      if (!actif) return
      setConditions(Object.fromEntries(paires.filter(([, c]) => c)) as ConditionsParSpot)
    })
    return () => {
      actif = false
    }
  }, [spots])

  // Création de la carte.
  useEffect(() => {
    if (!conteneur.current) return
    const instance = new CarteMapLibre({
      container: conteneur.current,
      style: STYLE,
      center: CENTRE,
      zoom: 12.4,
      minZoom: 10.5,
      maxZoom: 17,
      maxBounds: LIMITES,
      attributionControl: { compact: true },
    })
    instance.addControl(new NavigationControl({ showCompass: true }), 'bottom-right')

    instance.on('load', () => {
      // Les teintes de l'espace Marine sur le fond sombre.
      instance.setPaintProperty('background', 'background-color', PALETTE.terre)
      instance.setPaintProperty('water', 'fill-color', PALETTE.eau)
      instance.setPaintProperty('waterway', 'line-color', PALETTE.eauTrait)
      instance.setPaintProperty('water_name', 'text-color', PALETTE.texteEau)
      instance.setPaintProperty('water_name', 'text-halo-color', PALETTE.eau)

      instance.addSource('trace', { type: 'geojson', data: ligne([]) })
      instance.addLayer({
        id: 'trace-halo',
        type: 'line',
        source: 'trace',
        paint: { 'line-color': '#b0d8ff', 'line-width': 10, 'line-opacity': 0.18, 'line-blur': 4 },
      })
      instance.addLayer({
        id: 'trace',
        type: 'line',
        source: 'trace',
        paint: { 'line-color': '#e9f5ff', 'line-width': 3, 'line-dasharray': [2, 1.5] },
      })
      instance.addLayer({
        id: 'trace-points',
        type: 'circle',
        source: 'trace',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#041320',
          'circle-stroke-color': '#e9f5ff',
          'circle-stroke-width': 2,
        },
      })
    })

    instance.on('click', (e: MapMouseEvent) => {
      if (!enTraceRef.current) return
      setTrace((t) => [...t, [e.lngLat.lng, e.lngLat.lat]])
    })

    carte.current = instance
    return () => {
      instance.remove()
      carte.current = null
    }
  }, [])

  // Le tracé suit l'état.
  useEffect(() => {
    const source = carte.current?.getSource('trace') as GeoJSONSource | undefined
    source?.setData(ligne(trace))
  }, [trace])

  useEffect(() => {
    carte.current?.getCanvas().style.setProperty('cursor', enTrace ? 'crosshair' : '')
  }, [enTrace])

  // Marqueurs : spots, température de l'eau, courant.
  useEffect(() => {
    const instance = carte.current
    if (!instance) return
    const marqueurs: Marker[] = []

    for (const spot of spots) {
      const c = conditions[spot.id]
      const element = document.createElement('button')
      element.type = 'button'
      element.className = styles.spot ?? ''
      element.dataset.niveau = c?.danger.niveau ?? 'inconnu'
      element.setAttribute('aria-label', spot.nom)
      const popup = new Popup({
        offset: 18,
        closeButton: false,
        className: styles.popup,
      }).setDOMContent(ficheSpot(spot, c))
      marqueurs.push(
        new Marker({ element }).setLngLat([spot.longitude, spot.latitude]).setPopup(popup).addTo(instance),
      )
    }

    const reference = Object.values(conditions)[0]
    if (reference) {
      const eau = document.createElement('div')
      eau.className = styles.temperature ?? ''
      eau.textContent =
        reference.maintenant.eau_c != null
          ? `${nombre(Math.round(reference.maintenant.eau_c * 10) / 10)} °C`
          : '—'
      marqueurs.push(new Marker({ element: eau }).setLngLat(MER).addTo(instance))

      const { courant_kmh: vitesse, courant_direction_deg: cap } = reference.maintenant
      if (vitesse != null && cap != null) {
        for (const point of POINTS_COURANT) {
          const fleche = document.createElement('div')
          fleche.className = styles.courant ?? ''
          fleche.style.setProperty('--cap', `${cap}deg`)
          fleche.style.setProperty('--longueur', `${18 + Math.min(40, vitesse * 14)}px`)
          fleche.title = `Courant ${nombre(Math.round(vitesse * 10) / 10)} km/h vers ${pointCardinal(cap)}`
          marqueurs.push(
            new Marker({ element: fleche, rotationAlignment: 'map' }).setLngLat(point).addTo(instance),
          )
        }
      }
    }
    return () => marqueurs.forEach((m) => m.remove())
  }, [spots, conditions])

  // Vent : des traînées qui filent dans le sens où il souffle.
  const reference = Object.values(conditions)[0]
  const vent = reference?.maintenant.vent_kmh ?? null
  const ventDe = reference?.maintenant.vent_direction_deg ?? null
  useEffect(() => {
    const canvas = voile.current
    if (!canvas || vent === null || ventDe === null) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let image = 0
    const vers = ((ventDe + 180) * Math.PI) / 180
    const vitesse = 0.6 + vent / 12
    const dx = Math.sin(vers) * vitesse
    const dy = -Math.cos(vers) * vitesse
    const particules = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vie: Math.random() * 120,
    }))

    const dessiner = () => {
      const { clientWidth: l, clientHeight: h } = canvas
      if (canvas.width !== l || canvas.height !== h) {
        canvas.width = l
        canvas.height = h
      }
      ctx.clearRect(0, 0, l, h)
      ctx.lineCap = 'round'
      for (const p of particules) {
        const x = p.x * l
        const y = p.y * h
        const alpha = Math.min(1, p.vie / 30) * Math.min(1, (120 - p.vie) / 30) * 0.5
        ctx.strokeStyle = `rgba(214, 236, 255, ${alpha})`
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - dx * 9, y - dy * 9)
        ctx.stroke()
        p.x += dx / l
        p.y += dy / h
        p.vie += 1
        if (p.vie > 120 || p.x < -0.05 || p.x > 1.05 || p.y < -0.05 || p.y > 1.05) {
          p.x = Math.random()
          p.y = Math.random()
          p.vie = 0
        }
      }
      image = requestAnimationFrame(dessiner)
    }
    image = requestAnimationFrame(dessiner)
    return () => cancelAnimationFrame(image)
  }, [vent, ventDe])

  const metres = longueur(trace)

  function noterCetteNage() {
    const depart = trace[0]
    const proche = depart
      ? spots.reduce<Spot | undefined>(
          (m, s) =>
            !m || distance(depart, [s.longitude, s.latitude]) < distance(depart, [m.longitude, m.latitude])
              ? s
              : m,
          undefined,
        )
      : undefined
    naviguer('/marine/carnet', {
      state: { nage: { distance_m: Math.round(metres), spot_id: proche?.id ?? null } },
    })
  }

  return (
    <div className={styles.cadre}>
      <div ref={conteneur} className={styles.carte} />
      <canvas ref={voile} className={styles.vent} aria-hidden="true" />

      {reference && (
        <div className={styles.legende}>
          <p>
            <strong>Vent</strong> {vent != null ? `${Math.round(vent)} km/h` : '—'}
            {ventDe != null && ` de ${pointCardinal(ventDe)}`}
          </p>
          <p>
            <strong>Mer</strong>{' '}
            {reference.maintenant.hauteur_eau_m != null
              ? `${nombre(reference.maintenant.hauteur_eau_m)} m`
              : '—'}
            {reference.maintenant.tendance &&
              ` · ${reference.maintenant.tendance === 'montante' ? 'monte' : reference.maintenant.tendance === 'descendante' ? 'descend' : 'étale'}`}
          </p>
          <p className={styles.note}>Le trait de côte selon la marée arrivera avec les relevés Litto3D.</p>
        </div>
      )}

      <div className={styles.outils}>
        {!enTrace ? (
          <button type="button" className={styles.bouton} onClick={() => setEnTrace(true)}>
            Tracer une nage
          </button>
        ) : (
          <>
            <p className={styles.mesure}>
              {trace.length < 2 ? 'Clique sur la carte pour poser les points' : formaterDistance(metres)}
            </p>
            <button
              type="button"
              className={styles.bouton}
              onClick={() => setTrace((t) => t.slice(0, -1))}
              disabled={!trace.length}
            >
              Annuler le point
            </button>
            {trace.length >= 2 && (
              <button type="button" className={styles.principal} onClick={noterCetteNage}>
                Noter cette nage
              </button>
            )}
            <button
              type="button"
              className={styles.bouton}
              onClick={() => {
                setEnTrace(false)
                setTrace([])
              }}
            >
              Terminer
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ligne(points: Point[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      ...(points.length >= 2
        ? [
            {
              type: 'Feature' as const,
              properties: {},
              geometry: { type: 'LineString' as const, coordinates: points },
            },
          ]
        : []),
      ...points.map((p) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Point' as const, coordinates: p },
      })),
    ],
  }
}

/** Fiche d'un spot, construite en DOM (jamais d'HTML injecté : le nom vient de la base). */
function ficheSpot(spot: Spot, c: Conditions | undefined): HTMLElement {
  const fiche = document.createElement('div')
  const titre = document.createElement('strong')
  titre.textContent = spot.nom
  fiche.append(titre)
  const lignes = c
    ? [
        `Niveau ${c.danger.niveau}`,
        ...c.danger.raisons.map((r) => r.texte),
        `Eau ${c.maintenant.eau_c != null ? nombre(Math.round(c.maintenant.eau_c * 10) / 10) : '—'} °C · air ${c.maintenant.air_c != null ? Math.round(c.maintenant.air_c) : '—'} °C`,
        `Vent ${c.maintenant.vent_kmh != null ? Math.round(c.maintenant.vent_kmh) : '—'} km/h · vagues ${c.maintenant.vagues_m != null ? nombre(c.maintenant.vagues_m) : '—'} m`,
      ]
    : ['Conditions en cours de lecture…']
  for (const texte of lignes) {
    const p = document.createElement('p')
    p.textContent = texte
    fiche.append(p)
  }
  return fiche
}
