"""Estran : la marche jusqu'à l'eau selon la hauteur de marée (note 04).

Le relief vient de Litto3D (Shom, lidar topo-bathymétrique) : pour chaque plage,
quelques profils partent du haut de plage et filent vers le large, avec l'altitude
du sol tous les quelques mètres, ramenée au zéro hydrographique (ZH). L'eau est
atteinte là où le sol passe sous la hauteur de marée, et y reste : une bâche
(cuvette restée pleine à marée basse) ne compte pas comme la mer.
"""

from dataclasses import dataclass
from statistics import median
from typing import Any

from app.moteurs.marees import regles_marine


@dataclass(frozen=True)
class Profil:
    distances_m: tuple[float, ...]  # depuis le haut de plage, croissantes vers le large
    altitudes_zh_m: tuple[float, ...]  # altitude du sol au-dessus du zéro hydrographique


def regles_estran() -> dict[str, Any]:
    return regles_marine()["estran"]


def distance_sur_profil(profil: Profil, hauteur_m: float, eau_continue_m: float) -> float | None:
    """Distance du haut de plage au bord de l'eau ; None si l'eau est au-delà du relevé."""
    d, z = profil.distances_m, profil.altitudes_zh_m
    for i, altitude in enumerate(z):
        if altitude >= hauteur_m:
            continue
        # Sous l'eau ici : est-ce la mer, ou une bâche ? La mer reste sous l'eau au-delà.
        fin = i
        while fin + 1 < len(z) and z[fin + 1] < hauteur_m:
            fin += 1
        if fin + 1 < len(z) and d[fin] - d[i] < eau_continue_m:
            continue  # cuvette étroite, le sol remonte derrière : on la traverse
        if i == 0:
            return 0.0
        # Bord de l'eau entre le dernier point sec et le premier mouillé.
        t = (z[i - 1] - hauteur_m) / (z[i - 1] - altitude)
        return d[i - 1] + t * (d[i] - d[i - 1])
    return None


def distance_a_l_eau(profils: list[Profil], hauteur_m: float) -> float | None:
    """Distance à pied jusqu'à l'eau, médiane des profils de la plage, arrondie à 10 m.

    None si la plage n'a pas de relevé, ou si l'eau est au-delà du relevé
    sur la majorité des profils (très basse mer, hors du relief connu).
    """
    regles = regles_estran()
    valeurs = [distance_sur_profil(p, hauteur_m, float(regles["eau_continue_m"])) for p in profils]
    connues = [v for v in valeurs if v is not None]
    if not connues or len(connues) * 2 < len(valeurs):
        return None
    return float(round(median(connues) / 10) * 10)


def marche_longue(distance_m: float | None) -> bool:
    return distance_m is not None and distance_m >= float(regles_estran()["marche_longue_m"])


def marche_courte(distance_m: float | None) -> bool:
    return distance_m is not None and distance_m <= float(regles_estran()["marche_courte_m"])
