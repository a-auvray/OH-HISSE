"""Ce que l'API reçoit et renvoie pour Vie courante."""

import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field


class PeseeEcrite(BaseModel):
    date: dt.date
    poids_kg: float = Field(gt=30, lt=250)


class PeseeLue(PeseeEcrite):
    id: int


class PoidsActuel(BaseModel):
    """Poids retenu aujourd'hui pour les calculs (moyenne mobile)."""

    kg: float
    a_jour: bool
    derniere_pesee: dt.date


class NuitEcrite(BaseModel):
    heures: float = Field(ge=0, le=16)
    qualite: int | None = Field(default=None, ge=1, le=5)


class NuitLue(NuitEcrite):
    id: int
    date: dt.date


class CheatMealEcrit(BaseModel):
    date: dt.date
    note: str | None = Field(default=None, max_length=200)


class CheatMealLu(CheatMealEcrit):
    id: int


class Recuperation(BaseModel):
    restant_h: float
    total_h: float
    progression: float  # 0 à 1
    recupere: bool
    fin: dt.datetime | None  # prochain effort intense conseillé
    raisons: list[str]
    recup_active_conseillee: bool


class VerdictCheatMeal(BaseModel):
    verdict: Literal["oui", "petit", "non"]
    points: int
    phrase: str
    details: list[str]


class Sommeil(BaseModel):
    derniere_nuit_h: float | None
    moyenne_h: float | None
    nuits_comptees: int


class EtatDuJour(BaseModel):
    """Les verdicts de Vie courante, à cet instant."""

    instant: dt.datetime
    recuperation: Recuperation
    cheat_meal: VerdictCheatMeal
    sommeil: Sommeil
    poids: PoidsActuel | None


class SectionLue(BaseModel):
    espace: Literal["streetlifting", "marine", "vie-courante", "objectifs"]
    titre: str
    valeur: str | None
    lignes: list[str]


class BriefingLu(BaseModel):
    type: Literal["jour", "semaine", "debut-bloc", "fin-bloc"]
    titre: str
    sous_titre: str
    sections: list[SectionLue]
