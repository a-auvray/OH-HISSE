"""Niveau de danger d'une sortie : vert, rouge ou noir (note 04 du CDC).

Le niveau est le plus grave des critères. Chaque critère franchi donne une
raison lisible, affichée à côté du badge. Les seuils viennent de
`regles/marine.toml` (validés le 18/11/2026).

L'appli aide à décider ; elle ne remplace pas le bon sens sur place.
"""

from dataclasses import dataclass, field
from typing import Any, Literal

from app.moteurs.marees import regles_marine

Niveau = Literal["vert", "rouge", "noir"]
GRAVITE: dict[Niveau, int] = {"vert": 0, "rouge": 1, "noir": 2}


@dataclass(frozen=True)
class Situation:
    """Ce qu'on sait de la mer et du ciel à un instant. Tout est facultatif."""

    vent_kmh: float | None = None
    rafales_kmh: float | None = None
    vent_direction_deg: float | None = None  # d'où vient le vent
    vagues_m: float | None = None
    courant_kmh: float | None = None
    eau_c: float | None = None
    code_meteo: int | None = None
    de_nuit: bool = False


@dataclass(frozen=True)
class Raison:
    niveau: Niveau
    critere: str  # vent, rafales, vent_terre, vagues, courant, eau, ciel, nuit
    texte: str


@dataclass(frozen=True)
class Evaluation:
    niveau: Niveau
    raisons: tuple[Raison, ...] = field(default=())


def _nombre(v: float) -> str:
    return f"{v:.1f}".rstrip("0").rstrip(".").replace(".", ",")


def vent_de_terre(direction_deg: float, regles: dict[str, Any]) -> bool:
    """Le vent vient-il de la terre, et pousse-t-il donc vers le large ?"""
    provenance_terre = (float(regles["cap_vers_le_large_deg"]) + 180) % 360
    ecart = abs((direction_deg - provenance_terre + 180) % 360 - 180)
    return ecart <= float(regles["demi_secteur_terre_deg"])


def evaluer(situation: Situation, regles: dict[str, Any] | None = None) -> Evaluation:
    r = regles or regles_marine()["danger"]
    raisons: list[Raison] = []

    def seuil(critere: str, valeur: float | None, unite: str, texte: str, inverse: bool = False) -> None:
        if valeur is None:
            return
        niveaux: tuple[Niveau, ...] = ("noir", "rouge")
        for niveau in niveaux:
            limite = float(r[f"{critere}_{niveau}_{unite}"])
            if (valeur < limite) if inverse else (valeur >= limite):
                raisons.append(Raison(niveau, critere, texte.format(_nombre(valeur))))
                return

    seuil("vent", situation.vent_kmh, "kmh", "Vent moyen de {} km/h")
    seuil("rafales", situation.rafales_kmh, "kmh", "Rafales à {} km/h")
    if situation.vent_direction_deg is not None and vent_de_terre(situation.vent_direction_deg, r):
        seuil("vent_terre", situation.vent_kmh, "kmh", "Vent de terre de {} km/h : il pousse vers le large")
    seuil("vagues", situation.vagues_m, "m", "Vagues de {} m")
    seuil("courant", situation.courant_kmh, "kmh", "Courant de {} km/h")
    seuil("eau", situation.eau_c, "c", "Eau à {} °C", inverse=True)

    code = situation.code_meteo
    if code is not None and code >= 95:
        raisons.append(Raison("noir", "ciel", "Orage"))
    elif code in (45, 48):
        raisons.append(Raison("rouge", "ciel", "Brouillard : on ne te voit pas depuis la plage"))
    if situation.de_nuit:
        raisons.append(Raison("rouge", "nuit", "Nuit tombée"))

    raisons.sort(key=lambda x: -GRAVITE[x.niveau])
    niveau: Niveau = raisons[0].niveau if raisons else "vert"
    return Evaluation(niveau, tuple(raisons))


def tempete(vent_kmh: float | None) -> bool:
    """Easter egg « Essuyer une tempête ! » : vent moyen de force 10 ou plus."""
    return vent_kmh is not None and vent_kmh >= float(regles_marine()["tempete"]["vent_moyen_kmh"])
