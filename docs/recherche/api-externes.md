---
tags:
  - recherche
statut: validé
date: 2026-11-18
---

# Recherche — API externes (phase 0)

Zone d'usage : **Ouistreham, Colleville-Montgomery, Hermanville-sur-Mer** (Sword Beach, Calvados), soit une bande côtière d'environ 6 km. Tous les tests ont été faits le 18/11/2026.

## Verdict

| Besoin | Source retenue | Clé | Fiabilité constatée |
|---|---|---|---|
| Air, vent, rafales, nuages, lever/coucher du soleil | **Open-Meteo Forecast** | non | ✅ données complètes, maille ~2 km, la maille couvre les trois plages |
| Vagues, houle, température de l'eau, courants | **Open-Meteo Marine** | non | ✅ une seule maille (49,375 N / −0,208 E, ~10 km au large) pour les trois plages : valeurs « de zone » |
| Marées : hauteurs, PM / BM | **Open-Meteo Marine** `sea_level_height_msl`, ramené au zéro hydrographique | non | ✅ hauteurs à ±0,22 m en moyenne ; ⚠️ heures à ±36 min en moyenne, jusqu'à 1 h 30 en mortes-eaux |
| Coefficient de marée | **Calculé** : marnage à Brest (Open-Meteo) / 6,10 m × 100 | non | ✅ écart de 0 à 3 points avec le SHOM |
| Relief de la plage | **IGN Géoplateforme** (RGE ALTI, API altimétrie) | non | ⚠️ couvre le haut de plage seulement (jusqu'à ≈ −0,4 m IGN69) |
| Fond de carte | **OpenFreeMap** (tuiles vectorielles) avec MapLibre GL | non | — à tester en phase 3 |

**Conclusion :** toute la V1 peut tourner sur des sources gratuites, sans clé et sans compte. Les marées n'ont pas besoin d'un service payant.

## Marées : le détail

### Méthode
Le prototype [`prototypes/marees/comparer_marees.py`](../../prototypes/marees/comparer_marees.py) extrait les PM et BM de la série au pas de 15 min d'Open-Meteo, puis les compare à l'annuaire SHOM de Ouistreham, publié par [maree.info](https://maree.info/25), pour quatre jours de mortes-eaux à mi-marée (coefficients 34 → 64).

```
python prototypes/marees/comparer_marees.py --debut 2026-11-18 --jours 5
```

### Résultats
- **Marnage** : il est juste. Le 18/11, on mesure 3,1 m chez Open-Meteo comme au SHOM ; le 21/11, 4,4 m contre 4,6 m.
- **Zéro** : Open-Meteo mesure les hauteurs à partir du niveau moyen de la mer. Pour retrouver celles de l'annuaire, comptées à partir du zéro des cartes, il faut ajouter **≈ 4,9 m**. Ce décalage est calibré sur l'échantillon et sera stocké en configuration.
- **Heures** : à partir d'un coefficient d'environ 45, l'écart est de 0 à 27 min. En mortes-eaux (18/11), il atteint 80 à 90 min. C'est la **tenue du plein** de la baie de Seine : la pleine mer reste haute plusieurs heures, donc la courbe est plate et l'instant du pic est mal défini. Dans ce cas, l'erreur de hauteur reste faible, puisque la mer bouge peu.
- **Coefficient** : le SHOM le définit sur Brest. On le recalcule avec la même formule, à partir de la maille au large de Brest, et chaque PM de Ouistreham prend le coefficient de la PM de Brest qui la suit d'environ 6 h.

| PM | Calculé | SHOM |
|---|---|---|
| 18/11 matin | 35 | 34 |
| 18/11 soir | 36 | 35 |
| 19/11 matin | 37 | 37 |
| 19/11 soir | 42 | 41 |
| 20/11 matin | 46 | 46 |
| 20/11 soir | 53 | 51 |
| 21/11 matin | 59 | 57 |
| 21/11 soir | 67 | 64 |

### Limites, à afficher dans l'appli
- La documentation d'Open-Meteo prévient : *« Accuracy is limited in coastal areas »* (la précision est limitée sur les côtes). La variable ne convient pas à la navigation.
- L'appli affiche donc les horaires de marée **arrondis au quart d'heure**, avec la mention « estimation ». En mortes-eaux, elle donne une fourchette pour la pleine mer.
- Le service est codé derrière une interface `FournisseurMaree`. Si la précision déçoit à l'usage, on pourra brancher une source payante (Stormglass, WorldTides) sans toucher aux moteurs de règles.

### Sources écartées
- **API du SHOM** (data.shom.fr) : l'accès demande une convention. Le service qu'utilise le site maree.shom.fr n'est pas une API publique, donc on ne l'utilise pas.
- **Stormglass** : l'offre gratuite est limitée à 10 requêtes par jour et demande un compte. C'est l'alternative si besoin.
- **WorldTides** : payant au crédit.

## Relief de la plage (phases 3 et 5)
Un profil IGN perpendiculaire à la plage de Colleville (longitude −0,2930) donne :
- la dune vers +7 m (IGN69) ;
- le haut de plage avec une pente d'environ **1,5 %** (de +1,2 m à −0,4 m sur ≈ 110 m) ;
- **plus aucune donnée en dessous de −0,4 m**. RGE ALTI ne couvre pas l'estran découvert à marée basse.

Pistes, par ordre de simplicité :
1. **Pente par spot**, l'idée du CDC : une pente calibrée une fois pour toutes, qui donne la distance jusqu'à l'eau à partir de la hauteur de marée. C'est suffisant pour l'assistant de sortie.
2. **Litto3D® Normandie** (SHOM / IGN, licence ouverte) : un modèle terre-mer continu qui inclut l'estran. Ce sont des fichiers à télécharger une fois et à découper sur la zone. C'est la bonne source pour dessiner le sable découvert sur la carte.

### Retenu (19/11/2026) : Litto3D
- **Données** : « Partie maritime Litto3D® Normandie et Hauts-de-France 2016-2018 » (Shom, licence ouverte, à citer « Shom - ROLNHDF, 2022 »). Prépaquets `0455_6920` (Hermanville) et `0460_6920` (Colleville, Riva-Bella) du service de téléchargement du Shom : 2,2 Go en tout, dont on ne garde que le MNT 1 m (36 dalles de 1 km², en IGN69). Lidar topo-bathymétrique : l'estran est couvert jusque sous les plus basses mers.
- **Écart IGN69 / zéro hydrographique** : à Ouistreham, **ZH = IGN69 − 4,08 m** (Références Altimétriques Maritimes du Shom, couche WFS publique, repère IGN N.P.K3-2 ; niveau moyen 4,80 m ZH, PHMA 8,32 m ZH).
- **Préparation** (`backend/outils/preparer_estran.py`, lancée une fois) : mosaïque au pas de 2 m ramenée en ZH ; pour chaque plage, 7 profils perpendiculaires au rivage (cap 0° à Riva-Bella, 24° à Colleville, 29° à Hermanville) depuis le dernier point au-dessus de la PHMA ; trait de côte tous les 0,5 m, en ne gardant que l'eau reliée au large. Résultat : `app/donnees/estran.json`, 274 ko.
- **Distances obtenues** (médiane des profils, au 10 m près) :

| Hauteur d'eau (ZH) | Riva-Bella | Colleville | Hermanville |
|---|---|---|---|
| 7,75 m (PM de vives eaux) | 10 m | 10 m | 10 m |
| 4,80 m (niveau moyen) | 110 m | 100 m | 60 m |
| 2,80 m (BM de mortes eaux) | 230 m | 210 m | 210 m |
| 1,15 m (BM de vives eaux) | 380 m | 360 m | 420 m |

- **Limites** : le relevé date de 2016-2018 et les plages bougent ; les vagues et la surcote ne sont pas comptées. L'appli affiche donc une estimation arrondie (« ≈ 110 m »).

## Requêtes types

```
# Météo (air, vent, nuages, soleil)
https://api.open-meteo.com/v1/forecast?latitude=49.2955&longitude=-0.2930
  &hourly=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover
  &daily=sunrise,sunset&timezone=Europe/Paris

# Mer (vagues, houle, eau, courants, hauteur d'eau)
https://marine-api.open-meteo.com/v1/marine?latitude=49.2955&longitude=-0.2930&cell_selection=sea
  &minutely_15=sea_level_height_msl
  &hourly=wave_height,wave_direction,wave_period,swell_wave_height,sea_surface_temperature,
          ocean_current_velocity,ocean_current_direction
  &timezone=Europe/Paris

# Relief (IGN, profil en long)
https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevationLine.json
  ?lon=-0.2930|-0.2930&lat=49.2930|49.3080&resource=ign_rge_alti_wld&sampling=31
```

Cache côté backend : 30 min pour la météo, 3 h pour la marée. La prévision de marée change peu, et on reste très en dessous des limites d'Open-Meteo (10 000 appels par jour en usage non commercial).
