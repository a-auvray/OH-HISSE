"""Prototype phase 0 : la hauteur d'eau d'Open-Meteo suffit-elle pour les marées ?

Le script interroge Open-Meteo Marine (gratuit, sans clé), en déduit :
  - les pleines mers (PM) et basses mers (BM) au large de Ouistreham,
    ramenées au zéro hydrographique (ZH) par un décalage calibré ;
  - le coefficient de marée, recalculé à partir du marnage à Brest
    (c'est la définition du SHOM : marnage Brest / 6,10 m x 100).

Puis il compare au relevé de référence (annuaire SHOM publié par maree.info)
quand les dates se recouvrent.

Usage :
    python prototypes/marees/comparer_marees.py --debut 2026-11-18 --jours 4

Aucune dépendance : bibliothèque standard uniquement.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta

API_MARINE = "https://marine-api.open-meteo.com/v1/marine"

# Maille marine la plus proche des trois plages (Ouistreham, Colleville, Hermanville).
ZONE = (49.2955, -0.2930)
# Mer d'Iroise, au large de Brest : port de référence des coefficients.
BREST = (48.36, -4.55)

# Open-Meteo donne une hauteur par rapport au niveau moyen. Pour retrouver
# les hauteurs de l'annuaire (au-dessus du zéro des cartes), on ajoute ce
# décalage, calibré sur le relevé de référence ci-dessous (moyenne des écarts).
DECALAGE_ZH_OUISTREHAM_M = 4.9
UNITE_HAUTEUR_BREST_M = 6.10
DECALAGE_BREST = timedelta(hours=6)

# Relevé de référence : annuaire SHOM pour Ouistreham, via https://maree.info/25
# (heure légale, hauteurs au-dessus du zéro des cartes).
REFERENCE_SHOM = [
    ("2026-11-18T04:21", "PM", 6.19, 34),
    ("2026-11-18T10:45", "BM", 3.42, None),
    ("2026-11-18T16:47", "PM", 6.21, 35),
    ("2026-11-18T23:24", "BM", 3.12, None),
    ("2026-11-19T05:40", "PM", 6.32, 37),
    ("2026-11-19T12:10", "BM", 3.27, None),
    ("2026-11-19T18:01", "PM", 6.39, 41),
    ("2026-11-20T00:44", "BM", 2.88, None),
    ("2026-11-20T06:40", "PM", 6.60, 46),
    ("2026-11-20T13:25", "BM", 2.88, None),
    ("2026-11-20T19:00", "PM", 6.70, 51),
    ("2026-11-21T01:51", "BM", 2.49, None),
    ("2026-11-21T07:32", "PM", 6.93, 57),
    ("2026-11-21T14:27", "BM", 2.43, None),
    ("2026-11-21T19:51", "PM", 7.03, 64),
]


@dataclass(frozen=True)
class Extremum:
    type: str  # "PM" ou "BM"
    instant: datetime
    hauteur_m: float


def hauteurs_open_meteo(position: tuple[float, float], debut: date, jours: int) -> list[tuple[datetime, float]]:
    fin = date.fromordinal(debut.toordinal() + jours - 1)
    parametres = {
        "latitude": position[0],
        "longitude": position[1],
        "minutely_15": "sea_level_height_msl",
        "timezone": "Europe/Paris",
        "start_date": debut.isoformat(),
        "end_date": fin.isoformat(),
        "cell_selection": "sea",
    }
    url = f"{API_MARINE}?{urllib.parse.urlencode(parametres)}"
    with urllib.request.urlopen(url, timeout=30) as reponse:
        donnees = json.load(reponse)
    serie = donnees["minutely_15"]
    return [
        (datetime.fromisoformat(t), h)
        for t, h in zip(serie["time"], serie["sea_level_height_msl"], strict=True)
        if h is not None
    ]


def extrema(serie: list[tuple[datetime, float]], demi_fenetre: int = 8) -> list[Extremum]:
    """PM et BM : maximum (ou minimum) local sur +/- 2 h (8 pas de 15 min).

    En baie de Seine, la pleine mer « tient » longtemps (tenue du plein) :
    sur un plateau, on garde le milieu du plateau, puis on impose
    l'alternance PM / BM en ne conservant que le plus marqué de deux
    extrema consécutifs de même type.
    """
    bruts: list[Extremum] = []
    i = demi_fenetre
    while i < len(serie) - demi_fenetre:
        fenetre = [h for _, h in serie[i - demi_fenetre : i + demi_fenetre + 1]]
        h = serie[i][1]
        for type_, cible in (("PM", max(fenetre)), ("BM", min(fenetre))):
            if h == cible:
                j = i
                while j + 1 < len(serie) and serie[j + 1][1] == h:
                    j += 1
                milieu = serie[(i + j) // 2][0]
                bruts.append(Extremum(type_, milieu, h))
                i = j
                break
        i += 1

    alternes: list[Extremum] = []
    for e in bruts:
        if alternes and alternes[-1].type == e.type:
            precedent = alternes[-1]
            plus_marque = e.hauteur_m > precedent.hauteur_m if e.type == "PM" else e.hauteur_m < precedent.hauteur_m
            if plus_marque:
                alternes[-1] = e
            continue
        alternes.append(e)
    return alternes


def coefficients(extrema_zone: list[Extremum], extrema_brest: list[Extremum]) -> dict[datetime, int]:
    """Coefficient de chaque PM locale.

    Coefficient d'une PM de Brest = marnage depuis la BM précédente / U.
    L'annuaire associe à chaque PM de Ouistreham la PM de Brest qui la suit
    d'environ 6 h (constaté sur le relevé de référence).
    """
    coef_brest = [
        (pm.instant, round((pm.hauteur_m - bm.hauteur_m) / UNITE_HAUTEUR_BREST_M * 100))
        for bm, pm in zip(extrema_brest, extrema_brest[1:])
        if bm.type == "BM" and pm.type == "PM"
    ]
    resultat: dict[datetime, int] = {}
    for pm in (e for e in extrema_zone if e.type == "PM"):
        cible = pm.instant + DECALAGE_BREST
        candidats = [(abs((t - cible).total_seconds()), c) for t, c in coef_brest]
        if candidats and min(candidats)[0] < 3 * 3600:
            resultat[pm.instant] = min(candidats)[1]
    return resultat


def main() -> None:
    parseur = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parseur.add_argument("--debut", type=date.fromisoformat, default=date.today())
    parseur.add_argument("--jours", type=int, default=4)
    args = parseur.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]  # console Windows

    zone = extrema(hauteurs_open_meteo(ZONE, args.debut, args.jours))
    coefs = coefficients(zone, extrema(hauteurs_open_meteo(BREST, args.debut, args.jours)))
    reference = [(datetime.fromisoformat(t), ty, h, c) for t, ty, h, c in REFERENCE_SHOM]

    print(f"{'Open-Meteo (ZH)':<28} {'SHOM':<24} {'écart'}")
    ecarts_min, ecarts_h = [], []
    for e in zone:
        h_zh = e.hauteur_m + DECALAGE_ZH_OUISTREHAM_M
        gauche = f"{e.type} {e.instant:%d/%m %H:%M}  {h_zh:5.2f} m"
        proches = [r for r in reference if r[1] == e.type and abs((r[0] - e.instant).total_seconds()) < 3 * 3600]
        if not proches:
            print(gauche)
            continue
        r = min(proches, key=lambda r: abs((r[0] - e.instant).total_seconds()))
        d_min = round((e.instant - r[0]).total_seconds() / 60)
        d_h = h_zh - r[2]
        ecarts_min.append(abs(d_min))
        ecarts_h.append(abs(d_h))
        print(f"{gauche:<28} {r[0]:%d/%m %H:%M}  {r[2]:5.2f} m   {d_min:+4d} min  {d_h:+.2f} m")

    if ecarts_min:
        print(f"\nÉcart moyen : {sum(ecarts_min) / len(ecarts_min):.0f} min, "
              f"{sum(ecarts_h) / len(ecarts_h):.2f} m (max {max(ecarts_min)} min)")

    print("\nCoefficients des PM (calculé via Brest | SHOM)")
    for instant, coef in sorted(coefs.items()):
        r = [x for x in reference if x[1] == "PM" and abs((x[0] - instant).total_seconds()) < 3 * 3600]
        print(f"  PM {instant:%d/%m %H:%M}  {coef:3d}  |  {r[0][3] if r else '-'}")


if __name__ == "__main__":
    main()
