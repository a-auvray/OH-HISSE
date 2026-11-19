"""Relief de l'estran (Litto3D), préparé une fois par `scripts/preparer_estran.py`.

Le fichier `app/donnees/estran.json` contient, pour chaque plage de la zone, des
profils haut de plage → large, et le trait de côte (bord de l'eau) pour une série
de hauteurs de marée. Un spot reçoit le relief de la plage la plus proche.
"""

import json
import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.moteurs import estran

FICHIER = Path(__file__).resolve().parents[1] / "donnees" / "estran.json"
RAYON_PLAGE_M = 1500  # au-delà, le spot est hors des plages relevées
SOURCE = "Litto3D® partie maritime Normandie et Hauts-de-France 2016-2018 — Shom - ROLNHDF, 2022"


@dataclass(frozen=True)
class Plage:
    nom: str
    latitude: float
    longitude: float
    profils: list[estran.Profil]


@dataclass(frozen=True)
class Trait:
    hauteur_m: float
    lignes: list[list[list[float]]]  # [[lon, lat], …] par ligne


@dataclass(frozen=True)
class Releve:
    plages: list[Plage]
    traits: list[Trait]


@lru_cache
def releve() -> Releve:
    if not FICHIER.is_file():
        return Releve([], [])
    brut: dict[str, Any] = json.loads(FICHIER.read_text(encoding="utf-8"))
    plages = [
        Plage(
            nom=p["nom"],
            latitude=p["latitude"],
            longitude=p["longitude"],
            profils=[
                estran.Profil(tuple(f["distances_m"]), tuple(f["altitudes_zh_m"])) for f in p["profils"]
            ],
        )
        for p in brut["plages"]
    ]
    traits = [Trait(t["hauteur_m"], t["lignes"]) for t in brut["traits"]]
    return Releve(plages, sorted(traits, key=lambda t: t.hauteur_m))


def _metres(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dx = (lon2 - lon1) * 111_320 * math.cos(math.radians((lat1 + lat2) / 2))
    dy = (lat2 - lat1) * 110_540
    return math.hypot(dx, dy)


def plage_du_spot(latitude: float, longitude: float) -> Plage | None:
    proches = [(p, _metres(latitude, longitude, p.latitude, p.longitude)) for p in releve().plages]
    proches = [(p, d) for p, d in proches if d <= RAYON_PLAGE_M]
    return min(proches, key=lambda c: c[1])[0] if proches else None


def distance_a_l_eau(latitude: float, longitude: float, hauteur_m: float | None) -> float | None:
    plage = plage_du_spot(latitude, longitude)
    if plage is None or hauteur_m is None:
        return None
    return estran.distance_a_l_eau(plage.profils, hauteur_m)


def trait_de_cote(hauteur_m: float) -> Trait | None:
    """Le trait relevé le plus proche de cette hauteur de marée."""
    traits = releve().traits
    return min(traits, key=lambda t: abs(t.hauteur_m - hauteur_m)) if traits else None
