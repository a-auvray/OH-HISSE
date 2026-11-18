"""Ce que l'API reçoit et renvoie pour Vie courante."""

import datetime as dt

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
