"""Ce que l'API reçoit et renvoie pour les objectifs."""

import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field

StatutObjectif = Literal["en_cours", "atteint", "abandonne"]


class ObjectifEcrit(BaseModel):
    titre: str = Field(min_length=1, max_length=120)
    type: Literal["max", "competition"] = "max"
    exercice_id: int
    valeur_cible_kg: float = Field(ge=0, le=300, description="Cible en lest")
    date_cible: dt.date
    principal: bool = False


class ObjectifStatut(BaseModel):
    statut: StatutObjectif


class Progression(BaseModel):
    e1rm_lest_kg: float
    le: dt.date
    pourcentage: float  # 0 à 100 (plafonné), vers la cible
    cible_atteinte: bool


class BlocAssocie(BaseModel):
    id: int
    nom: str


class ObjectifLu(ObjectifEcrit):
    id: int
    statut: StatutObjectif
    exercice: str
    jours_restants: int
    progression: Progression | None
    blocs: list[BlocAssocie]
