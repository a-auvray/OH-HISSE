"""Ce que l'API reçoit et renvoie pour le Streetlifting."""

import datetime as dt
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field


def _demi_point(rpe: float | None) -> float | None:
    if rpe is not None and (rpe * 2) % 1:
        raise ValueError("Le RPE se note par demi-points (7, 7,5, 8…).")
    return rpe


Rpe = Annotated[float, Field(ge=6, le=10), AfterValidator(_demi_point)]


class ExerciceLu(BaseModel):
    id: int
    slug: str
    nom: str


class SerieEcrite(BaseModel):
    exercice_id: int
    reps: int = Field(ge=0, le=100)
    lest_kg: float = Field(default=0, ge=0, le=300)
    rpe: Rpe | None = None
    echec: bool = False
    reps_prevues: int | None = Field(default=None, ge=0, le=100)
    lest_prevu_kg: float | None = Field(default=None, ge=0, le=300)
    rpe_cible: Rpe | None = None


class SeanceEcrite(BaseModel):
    date: dt.date
    nom: str | None = Field(default=None, max_length=120)
    ressenti: int | None = Field(default=None, ge=1, le=10)
    note: str | None = Field(default=None, max_length=2000)
    bloc_id: int | None = None
    rang_modele: int | None = Field(default=None, ge=0)
    series: list[SerieEcrite] = Field(min_length=1, max_length=80)


class SerieLue(SerieEcrite):
    id: int
    ordre: int


class Record(BaseModel):
    """1RM estimé d'un exercice sur une séance."""

    exercice_id: int
    e1rm_lest_kg: float
    e1rm_total_kg: float


class SeanceLue(BaseModel):
    id: int
    date: dt.date
    nom: str | None
    ressenti: int | None
    note: str | None
    bloc_id: int | None
    rang_modele: int | None
    series: list[SerieLue]
    poids_du_corps_kg: float | None
    poids_a_jour: bool
    records: list[Record]


class PointEvolution(BaseModel):
    """Une séance vue par un exercice, pour les graphiques d'évolution."""

    seance_id: int
    date: dt.date
    e1rm_lest_kg: float | None
    e1rm_total_kg: float | None
    tonnage_kg: float
    series: int
    reps: int
    rpe_moyen: float | None
    poids_du_corps_kg: float | None
