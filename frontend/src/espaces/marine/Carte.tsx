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
import type { Conditions, Spot, TraitDeCote } from '../../api/types'
import { nombre } from '../../commun/format'
import { useTon } from '../../themes/ton'
import styles from './Carte.module.css'
import { distance, formaterDistance, longueur, type Point } from './geo'
import { pointCardinal } from './lecture'

const STYLE_SOMBRE = 'https://tiles.openfreemap.org/styles/dark'
const STYLE_CLAIR = 'https://tiles.openfreemap.org/styles/positron'
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
/** Les teintes de Marine sur le fond de carte : sombre (nuit, Classique) ou clair (thèmes de jour). */
const PALETTES = {
  sombre: {
    terre: '#0d1216',
    eau: '#0a2a46',
    eauTrait: '#1d4b74',
    texteEau: '#7fb2d9',
    estran: '#d8efff',
    estranHalo: '#9fd4ff',
    trace: '#e9f5ff',
    traceHalo: '#b0d8ff',
    point: '#041320',
    vent: '214, 236, 255',
  },
  clair: {
    terre: '#ebe8de',
    eau: '#b7d3e2',
    eauTrait: '#8db3c9',
    texteEau: '#2b5f7e',
    estran: '#14506f',
    estranHalo: '#1f6f98',
    trace: '#102c3a',
    traceHalo: '#1f6f98',
    point: '#f4f1ea',
    vent: '20, 80, 115',
  },
} as const

type ConditionsParSpot = Record<number, Conditions>

/** Carte de la côte (note 04) : spots, mer, vent et courant, tracé d'une nage. */
export function Carte({ spots }: { spots: Spot[] }) {
  const conteneur = useRef<HTMLDivElement>(null)
  const voile = useRef<HTMLCanvasElement>(null)
  const carte = useRef<CarteMapLibre | null>(null)
  const [conditions, setConditions] = useState<ConditionsParSpot>({})
  const [chargee, setChargee] = useState(false)
  // Le thème de jour montre une carte claire. Dans un thème sans ton (Classique), elle reste sombre.
  const [ton] = useTon()
  const [clair, setClair] = useState<boolean | null>(null)
  useEffect(() => {
    setClair(ton === 'jour' && !!conteneur.current?.closest('[data-ton]'))
  }, [ton])
  const palette = clair ? PALETTES.clair : PALETTES.sombre
  const [trait, setTrait] = useState<TraitDeCote | null>(null)
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
    if (!conteneur.current || clair === null) return
    const instance = new CarteMapLibre({
      container: conteneur.current,
      style: clair ? STYLE_CLAIR : STYLE_SOMBRE,
      center: CENTRE,
      zoom: 12.4,
      minZoom: 10.5,
      maxZoom: 17,
      maxBounds: LIMITES,
      attributionControl: { compact: true },
    })
    instance.addControl(new NavigationControl({ showCompass: true }), 'bottom-right')

    instance.on('load', () => {
      // Les teintes de l'espace Marine sur le fond de carte (une couche absente d'un style est ignorée).
      const teinte = (
        couche: string,
        propriete: Parameters<typeof instance.setPaintProperty>[1],
        valeur: string,
      ) => {
        if (instance.getLayer(couche)) instance.setPaintProperty(couche, propriete, valeur)
      }
      teinte('background', 'background-color', palette.terre)
      teinte('water', 'fill-color', palette.eau)
      teinte('waterway', 'line-color', palette.eauTrait)
      teinte('water_name', 'text-color', palette.texteEau)
      teinte('water_name', 'text-halo-color', palette.eau)

      // Bord de l'eau à la hauteur de marée du moment (relief Litto3D).
      instance.addSource('estran', { type: 'geojson', data: lignes([]) })
      instance.addLayer({
        id: 'estran-halo',
        type: 'line',
        source: 'estran',
        paint: { 'line-color': palette.estranHalo, 'line-width': 9, 'line-opacity': 0.16, 'line-blur': 5 },
      })
      instance.addLayer({
        id: 'estran',
        type: 'line',
        source: 'estran',
        paint: { 'line-color': palette.estran, 'line-width': 1.6, 'line-opacity': 0.85 },
      })

      instance.addSource('trace', { type: 'geojson', data: ligne([]) })
      instance.addLayer({
        id: 'trace-halo',
        type: 'line',
        source: 'trace',
        paint: { 'line-color': palette.traceHalo, 'line-width': 10, 'line-opacity': 0.18, 'line-blur': 4 },
      })
      instance.addLayer({
        id: 'trace',
        type: 'line',
        source: 'trace',
        paint: { 'line-color': palette.trace, 'line-width': 3, 'line-dasharray': [2, 1.5] },
      })
      instance.addLayer({
        id: 'trace-points',
        type: 'circle',
        source: 'trace',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': palette.point,
          'circle-stroke-color': palette.trace,
          'circle-stroke-width': 2,
        },
      })
      setChargee(true)
    })

    instance.on('click', (e: MapMouseEvent) => {
      if (!enTraceRef.current) return
      setTrace((t) => [...t, [e.lngLat.lng, e.lngLat.lat]])
    })

    carte.current = instance
    return () => {
      instance.remove()
      carte.current = null
      setChargee(false)
    }
    // La palette se déduit de `clair` : changer de ton recrée la carte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clair])

  // Trait de côte : celui de la hauteur d'eau actuelle.
  const hauteur = Object.values(conditions)[0]?.maintenant.hauteur_eau_m ?? null
  useEffect(() => {
    if (hauteur === null) return
    let actif = true
    api.GET('/api/marine/trait-de-cote', { params: { query: { hauteur_m: hauteur } } }).then((r) => {
      if (actif && r.data) setTrait(r.data)
    })
    return () => {
      actif = false
    }
  }, [hauteur])

  useEffect(() => {
    if (!chargee) return
    const source = carte.current?.getSource('estran') as GeoJSONSource | undefined
    source?.setData(lignes(trait?.lignes ?? []))
  }, [trait, chargee])

  // Le tracé suit l'état.
  useEffect(() => {
    const source = carte.current?.getSource('trace') as GeoJSONSource | undefined
    source?.setData(ligne(trace))
  }, [trace, chargee])

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
  }, [spots, conditions, clair])

  // Vent : des traînées qui filent dans le sens où il souffle.
  const reference = Object.values(conditions)[0]
  const vent = reference?.maintenant.vent_kmh ?? null
  const ventDe = reference?.maintenant.vent_direction_deg ?? null
  const couleurVent = palette.vent
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
        ctx.strokeStyle = `rgba(${couleurVent}, ${alpha})`
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
  }, [vent, ventDe, couleurVent])

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
          {trait && (
            <p className={styles.note}>
              Trait clair : le bord de l’eau à {nombre(trait.hauteur_m)} m · relief Litto3D® (Shom)
            </p>
          )}
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

function lignes(traits: number[][][]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: traits.map((coordonnees) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: coordonnees },
    })),
  }
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
        ...(c.maintenant.distance_eau_m != null
          ? [`≈ ${nombre(c.maintenant.distance_eau_m)} m de sable jusqu’à l’eau`]
          : []),
      ]
    : ['Conditions en cours de lecture…']
  for (const texte of lignes) {
    const p = document.createElement('p')
    p.textContent = texte
    fiche.append(p)
  }
  return fiche
}
