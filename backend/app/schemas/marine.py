"""Ce que l'API renvoie pour Marine."""

import datetime as dt
from typing import Literal

from pydantic import BaseModel


class SpotLu(BaseModel):
    id: int
    nom: str
    latitude: float
    longitude: float


class Instantane(BaseModel):
    """Les conditions à cet instant."""

    instant: dt.datetime
    air_c: float | None
    ressenti_c: float | None
    vent_kmh: float | None
    rafales_kmh: float | None
    vent_direction_deg: float | None
    nuages_pct: float | None
    code_meteo: int | None
    eau_c: float | None
    vagues_m: float | None
    houle_m: float | None
    periode_s: float | None
    vagues_direction_deg: float | None
    courant_kmh: float | None
    courant_direction_deg: float | None
    hauteur_eau_m: float | None  # au-dessus du zéro hydrographique
    tendance: Literal["montante", "descendante", "etale"] | None


class Heure(BaseModel):
    instant: dt.datetime
    air_c: float | None
    vent_kmh: float | None
    rafales_kmh: float | None
    vent_direction_deg: float | None
    nuages_pct: float | None
    code_meteo: int | None
    pluie_pct: float | None
    eau_c: float | None
    vagues_m: float | None
    hauteur_eau_m: float | None


class Maree(BaseModel):
    type: Literal["PM", "BM"]
    instant: dt.datetime
    hauteur_m: float
    coefficient: int | None


class Soleil(BaseModel):
    jour: dt.date
    lever: dt.datetime
    coucher: dt.datetime


class Conditions(BaseModel):
    spot: SpotLu
    maintenant: Instantane
    heures: list[Heure]
    marees: list[Maree]
    soleil: list[Soleil]
    # Vrai si Open-Meteo ne répond plus et que ces données viennent du cache.
    perimees: bool
    source: str = "Open-Meteo · marées estimées, recalées sur l'annuaire SHOM de Ouistreham"
